import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

export type StorageScope = "uploads" | "outputs";

const SCOPE_DIRS: Record<StorageScope, string> = {
  uploads: config.uploadsDir,
  outputs: config.outputsDir,
};

/** Ensure all storage directories exist. Safe to call repeatedly. */
export async function ensureStorage(): Promise<void> {
  await Promise.all(
    [config.uploadsDir, config.outputsDir, config.tmpDir].map((dir) =>
      fs.mkdir(dir, { recursive: true }),
    ),
  );
}

/**
 * Make an arbitrary user-supplied filename safe for the filesystem.
 * Strips directory components and anything that is not alphanumeric, dot,
 * dash or underscore. Always returns a non-empty string.
 */
export function sanitizeFilename(name: string): string {
  const base = path.basename(name);
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 120);
  return cleaned || "file";
}

/** Lowercased extension including the dot, e.g. ".mp4". */
export function getExtension(name: string): string {
  return path.extname(name).toLowerCase();
}

/**
 * Resolve a file inside a known storage scope, guarding against path
 * traversal. Returns an absolute path or throws if the name escapes the scope.
 */
export function resolveInScope(scope: StorageScope, filename: string): string {
  const dir = SCOPE_DIRS[scope];
  if (!dir) throw new Error(`Unknown storage scope: ${scope}`);
  const safe = sanitizeFilename(filename);
  const resolved = path.resolve(dir, safe);
  const normalisedDir = path.resolve(dir) + path.sep;
  if (!resolved.startsWith(normalisedDir)) {
    throw new Error("Resolved path escapes its storage scope");
  }
  return resolved;
}

/** Delete a file if it exists; never throws on a missing file. */
export async function removeIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Size of a file in bytes, or 0 if it does not exist. */
export async function fileSize(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

/** Remove every file in both managed scopes. Returns the count removed. */
export async function purgeAllStorage(): Promise<number> {
  let removed = 0;
  for (const dir of [config.uploadsDir, config.outputsDir, config.tmpDir]) {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      await removeIfExists(path.join(dir, entry));
      removed += 1;
    }
  }
  return removed;
}
