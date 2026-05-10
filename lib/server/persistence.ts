import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const SAVE_DEBOUNCE_MS = 500;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadJSON<T>(filename: string, fallback: T): T {
  try {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) return fallback;
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const pending = new Map<string, NodeJS.Timeout>();

export function scheduleSave(filename: string, getData: () => unknown): void {
  const existing = pending.get(filename);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    pending.delete(filename);
    try {
      ensureDir();
      const filepath = path.join(DATA_DIR, filename);
      const tmpPath = `${filepath}.tmp`;
      const data = JSON.stringify(getData(), null, 2);
      await fs.promises.writeFile(tmpPath, data, "utf-8");
      await fs.promises.rename(tmpPath, filepath);
    } catch (e) {
      console.error(`[persistence] failed to save ${filename}:`, e);
    }
  }, SAVE_DEBOUNCE_MS);
  pending.set(filename, timer);
}
