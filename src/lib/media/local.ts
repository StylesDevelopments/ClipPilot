import { copyFile, rename } from "node:fs/promises";
import {
  ensureStorage,
  fileSize,
  purgeAllStorage,
  removeIfExists,
  resolveInScope,
} from "../storage";
import type { JobWorkspace, MediaStore, ServePlan, StorageScope } from "./types";

/** Local filesystem media store — the zero-config default. */
export class LocalMediaStore implements MediaStore {
  readonly kind = "local" as const;

  async init(): Promise<void> {
    await ensureStorage();
  }

  async saveUploadFromPath(name: string, tempPath: string): Promise<number> {
    const dest = resolveInScope("uploads", name);
    try {
      await rename(tempPath, dest);
    } catch {
      // rename fails across devices; fall back to copy.
      await copyFile(tempPath, dest);
      await removeIfExists(tempPath);
    }
    return fileSize(dest);
  }

  async size(scope: StorageScope, name: string): Promise<number> {
    return fileSize(resolveInScope(scope, name));
  }

  async prepareJob(inputName: string, outputName: string): Promise<JobWorkspace> {
    const inputPath = resolveInScope("uploads", inputName);
    const outputPath = resolveInScope("outputs", outputName);
    return {
      inputPath,
      outputPath,
      finalize: () => fileSize(outputPath),
      dispose: async () => {},
    };
  }

  async serve(scope: StorageScope, name: string): Promise<ServePlan> {
    return { localPath: resolveInScope(scope, name) };
  }

  async remove(scope: StorageScope, name: string): Promise<void> {
    await removeIfExists(resolveInScope(scope, name));
  }

  async purgeAll(): Promise<number> {
    return purgeAllStorage();
  }
}
