import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

const DATA_DIR = path.resolve(process.cwd(), ".data");

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function fileKeyPath(key: string): string {
  // Allow slashes in keys (e.g. "user:abc"). Replace any path separators
  // with a safe filesystem character so we don't break out of DATA_DIR.
  return path.join(DATA_DIR, key.replace(/[/\\]/g, "_") + ".json");
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
    const filepath = fileKeyPath(key);
    if (!fs.existsSync(filepath)) return fallback;
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

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
  ensureDir();
  const filepath = fileKeyPath(key);
  const tmpPath = `${filepath}.tmp`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.promises.rename(tmpPath, filepath);
}

export async function deleteJSON(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  const filepath = fileKeyPath(key);
  if (fs.existsSync(filepath)) await fs.promises.unlink(filepath);
}

/**
 * Return all keys matching a prefix-glob (e.g. "user:*"). Used by code that
 * needs to enumerate (lobby player count, etc.). Atomic mutations should
 * never depend on this — read/write per individual key.
 */
export async function listKeys(pattern: string): Promise<string[]> {
  if (redis) {
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [next, batch] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(next);
      keys.push(...batch);
    } while (cursor !== 0);
    return keys;
  }
  if (!fs.existsSync(DATA_DIR)) return [];
  const re = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
  return fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((k) => re.test(k));
}

/** Test/debug helper: which backend is active? */
export function backend(): "redis" | "file" {
  return redis ? "redis" : "file";
}
