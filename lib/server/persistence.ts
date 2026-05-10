import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const SAVE_DEBOUNCE_MS = 500;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  if (redis) {
    try {
      const data = await redis.get<T>(key);
      return (data ?? fallback) as T;
    } catch (e) {
      console.error(`[persistence] redis load failed for ${key}:`, e);
      return fallback;
    }
  }
  try {
    const filepath = path.join(DATA_DIR, key);
    if (!fs.existsSync(filepath)) return fallback;
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Immediate (not debounced) save. Use for state that MUST be durable before
 * the current request returns — e.g. live game state on a serverless platform
 * where the next request may hit a different function instance.
 */
export async function saveJSON(
  key: string,
  data: unknown,
  opts?: { ttlSeconds?: number },
): Promise<void> {
  if (redis) {
    if (opts?.ttlSeconds) {
      await redis.set(key, data, { ex: opts.ttlSeconds });
    } else {
      await redis.set(key, data);
    }
    return;
  }
  // File backend ignores TTL (used for local dev only).
  ensureDir();
  const filepath = path.join(DATA_DIR, key);
  const tmpPath = `${filepath}.tmp`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.promises.rename(tmpPath, filepath);
}

export async function deleteJSON(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  const filepath = path.join(DATA_DIR, key);
  if (fs.existsSync(filepath)) await fs.promises.unlink(filepath);
}

const pending = new Map<string, NodeJS.Timeout>();

export function scheduleSave(key: string, getData: () => unknown): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    pending.delete(key);
    try {
      const data = getData();
      if (redis) {
        await redis.set(key, data);
      } else {
        ensureDir();
        const filepath = path.join(DATA_DIR, key);
        const tmpPath = `${filepath}.tmp`;
        await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
        await fs.promises.rename(tmpPath, filepath);
      }
    } catch (e) {
      console.error(`[persistence] failed to save ${key}:`, e);
    }
  }, SAVE_DEBOUNCE_MS);
  pending.set(key, timer);
}

/** Test/debug helper: which backend is active? */
export function backend(): "redis" | "file" {
  return redis ? "redis" : "file";
}
