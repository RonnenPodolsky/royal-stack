import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "royal-stack-test-"));
const ORIGINAL_CWD = process.cwd();

beforeEach(() => {
  process.chdir(TMP_ROOT);
  fs.rmSync(path.join(TMP_ROOT, ".data"), { recursive: true, force: true });
  vi.resetModules();
});

afterAll(() => {
  process.chdir(ORIGINAL_CWD);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("persistence", () => {
  it("loadJSON returns fallback when key missing", async () => {
    const { loadJSON } = await import("./persistence");
    expect(await loadJSON("missing", { hello: "world" })).toEqual({ hello: "world" });
  });

  it("loadJSON returns fallback on corrupt file", async () => {
    const dataDir = path.join(TMP_ROOT, ".data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "corrupt.json"), "{not json", "utf-8");
    const { loadJSON } = await import("./persistence");
    expect(await loadJSON("corrupt", { ok: true })).toEqual({ ok: true });
  });

  it("saveJSON writes atomically and round-trips", async () => {
    const { saveJSON, loadJSON } = await import("./persistence");
    const data = { count: 42, nested: { a: 1, b: [1, 2, 3] } };
    await saveJSON("counter", data);
    const dataDir = path.join(TMP_ROOT, ".data");
    const files = fs.readdirSync(dataDir);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
    expect(await loadJSON<typeof data>("counter", { count: -1, nested: { a: 0, b: [] } })).toEqual(data);
  });

  it("deleteJSON removes a saved key", async () => {
    const { saveJSON, loadJSON, deleteJSON } = await import("./persistence");
    await saveJSON("temp", { v: 1 });
    expect(await loadJSON<{ v: number } | null>("temp", null)).toEqual({ v: 1 });
    await deleteJSON("temp");
    expect(await loadJSON<{ v: number } | null>("temp", null)).toBeNull();
  });

  it("listKeys returns saved keys matching a glob", async () => {
    const { saveJSON, listKeys } = await import("./persistence");
    await saveJSON("user:abc", { id: "abc" });
    await saveJSON("user:xyz", { id: "xyz" });
    await saveJSON("runtime:tbl-1", { x: 1 });
    const userKeys = await listKeys("user:*");
    expect(userKeys.sort()).toEqual(["user:abc", "user:xyz"]);
  });

  it("a stale-write to one key does not clobber another", async () => {
    // The core property the per-key refactor guarantees: writing user A
    // never touches user B.
    const { saveJSON, loadJSON } = await import("./persistence");
    await saveJSON("user:A", { bankroll: 10000 });
    await saveJSON("user:B", { bankroll: 10000 });
    await saveJSON("user:A", { bankroll: 15000 });
    expect(await loadJSON("user:A", null)).toEqual({ bankroll: 15000 });
    expect(await loadJSON("user:B", null)).toEqual({ bankroll: 10000 });
  });
});
