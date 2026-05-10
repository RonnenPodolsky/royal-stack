import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "royal-stack-test-"));
const ORIGINAL_CWD = process.cwd();

beforeEach(() => {
  process.chdir(TMP_ROOT);
  // Re-import the module under each test's cwd so DATA_DIR resolves fresh.
  vi.resetModules();
});

afterAll(() => {
  process.chdir(ORIGINAL_CWD);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("persistence", () => {
  it("loadJSON returns fallback when file missing", async () => {
    const { loadJSON } = await import("./persistence");
    expect(await loadJSON("missing.json", { hello: "world" })).toEqual({ hello: "world" });
  });

  it("loadJSON returns fallback on corrupt file", async () => {
    const dataDir = path.join(TMP_ROOT, ".data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "corrupt.json"), "{not json", "utf-8");
    const { loadJSON } = await import("./persistence");
    expect(await loadJSON("corrupt.json", { ok: true })).toEqual({ ok: true });
  });

  it("scheduleSave debounces and writes atomically", async () => {
    const { scheduleSave, loadJSON } = await import("./persistence");
    let snapshot = { count: 1 };
    scheduleSave("counter.json", () => snapshot);
    snapshot = { count: 2 };
    scheduleSave("counter.json", () => snapshot);
    snapshot = { count: 3 };
    scheduleSave("counter.json", () => snapshot);

    // Wait for debounce + write
    await new Promise((r) => setTimeout(r, 700));

    const result = await loadJSON<{ count: number }>("counter.json", { count: -1 });
    expect(result).toEqual({ count: 3 });

    // No leftover .tmp files
    const dataDir = path.join(TMP_ROOT, ".data");
    const files = fs.readdirSync(dataDir);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("round-trip preserves complex nested data", async () => {
    const { scheduleSave, loadJSON } = await import("./persistence");
    type UserShape = { bankroll: number; activeBuyIns: Record<string, number> };
    const data: { users: Record<string, UserShape> } = {
      users: {
        abc123: { bankroll: 5000, activeBuyIns: { "tbl-1": 200 } },
        xyz789: { bankroll: 0, activeBuyIns: {} },
      },
    };
    scheduleSave("complex.json", () => data);
    await new Promise((r) => setTimeout(r, 700));
    const loaded = await loadJSON<typeof data>("complex.json", { users: {} });
    expect(loaded).toEqual(data);
  });
});
