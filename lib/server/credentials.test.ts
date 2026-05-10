import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "royal-stack-creds-"));
const ORIGINAL_CWD = process.cwd();

type Mod = typeof import("./credentials");
let creds: Mod;

beforeEach(async () => {
  process.chdir(TMP_ROOT);
  fs.rmSync(path.join(TMP_ROOT, ".data"), { recursive: true, force: true });
  vi.resetModules();
  creds = await import("./credentials");
});

afterAll(() => {
  process.chdir(ORIGINAL_CWD);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("credentials store", () => {
  it("registers with valid email and password", async () => {
    const r = await creds.registerCredentials("alice@example.com", "hunter2hunter");
    expect(r.ok).toBe(true);
    if (r.ok) expect(typeof r.userId).toBe("string");
  });

  it("rejects invalid email", async () => {
    const r = await creds.registerCredentials("not-an-email", "hunter2hunter");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain("email");
  });

  it("rejects passwords shorter than 8 chars", async () => {
    const r = await creds.registerCredentials("alice@example.com", "short");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain("password");
  });

  it("rejects duplicate email registration", async () => {
    const a = await creds.registerCredentials("dup@example.com", "hunter2hunter");
    expect(a.ok).toBe(true);
    const b = await creds.registerCredentials("dup@example.com", "different1");
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.error.toLowerCase()).toContain("registered");
  });

  it("normalizes email (trim + lowercase) on register and verify", async () => {
    const r = await creds.registerCredentials("  Mixed@Case.COM  ", "hunter2hunter");
    expect(r.ok).toBe(true);
    const v = await creds.verifyCredentials("mixed@case.com", "hunter2hunter");
    expect(v).not.toBeNull();
  });

  it("verifyCredentials returns the user on correct password", async () => {
    const r = await creds.registerCredentials("verify@example.com", "hunter2hunter", "Vera");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = await creds.verifyCredentials("verify@example.com", "hunter2hunter");
    expect(v).not.toBeNull();
    if (!v) return;
    expect(v.userId).toBe(r.userId);
    expect(v.email).toBe("verify@example.com");
    expect(v.displayName).toBe("Vera");
  });

  it("verifyCredentials returns null on wrong password", async () => {
    await creds.registerCredentials("wrong@example.com", "correctpassword");
    const v = await creds.verifyCredentials("wrong@example.com", "wrongpassword");
    expect(v).toBeNull();
  });

  it("verifyCredentials returns null on missing email", async () => {
    const v = await creds.verifyCredentials("nobody@example.com", "anything12345");
    expect(v).toBeNull();
  });

  it("never persists plaintext password to disk", async () => {
    await creds.registerCredentials("secret@example.com", "supersecret-password-XYZ");
    // Per-credential file written under .data; find the cred file.
    const dataDir = path.join(TMP_ROOT, ".data");
    const files = fs.readdirSync(dataDir).filter((f) => f.startsWith("cred:"));
    expect(files.length).toBe(1);
    const raw = fs.readFileSync(path.join(dataDir, files[0]), "utf-8");
    expect(raw).not.toContain("supersecret-password-XYZ");
    expect(raw).toMatch(/\$2[aby]\$/);
  });

  it("round-trips through file persistence (simulated server restart)", async () => {
    const r1 = await creds.registerCredentials("survives@example.com", "verylongpass123");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const userIdBefore = r1.userId;

    // Simulate restart — saves are awaited (no debounce), so no wait needed.
    vi.resetModules();
    const creds2 = await import("./credentials");

    const v = await creds2.verifyCredentials("survives@example.com", "verylongpass123");
    expect(v).not.toBeNull();
    if (!v) return;
    expect(v.userId).toBe(userIdBefore);
  });
});
