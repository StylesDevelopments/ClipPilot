export type StorageScope = "uploads" | "outputs";

/**
 * A job's local working files. The runner always operates on real local paths
 * (FFmpeg needs them); the backend takes care of getting bytes in and out.
 */
export interface JobWorkspace {
  /** Local path to the input file FFmpeg should read. */
  inputPath: string;
  /** Local path FFmpeg should write the output to. */
  outputPath: string;
  /** Persist the finished output to its final home; returns the size in bytes. */
  finalize: () => Promise<number>;
  /** Remove any temporary working files (always called, success or failure). */
  dispose: () => Promise<void>;
}

/** How a file should be served by the /api/files route. */
export interface ServePlan {
  /** Supabase backend: redirect the client to a signed URL. */
  redirectUrl?: string;
  /** Local backend: stream from disk. */
  localPath?: string;
}

/**
 * Backend-agnostic media storage. Implementations: local filesystem and
 * Supabase Storage. Selected at runtime via config.storageBackend.
 */
export interface MediaStore {
  readonly kind: "local" | "supabase";

  /** Create any required directories/buckets. Safe to call repeatedly. */
  init(): Promise<void>;

  /** Persist an upload from a local temp file. Returns the stored size. */
  saveUploadFromPath(name: string, tempPath: string): Promise<number>;

  /** Size in bytes, or 0 if the object does not exist. */
  size(scope: StorageScope, name: string): Promise<number>;

  /** Prepare local working files for a job (downloading the input if remote). */
  prepareJob(inputName: string, outputName: string): Promise<JobWorkspace>;

  /** Resolve how to serve a file (stream locally or redirect to a signed URL). */
  serve(scope: StorageScope, name: string, download: boolean): Promise<ServePlan>;

  /** Delete a single object; never throws if it is already gone. */
  remove(scope: StorageScope, name: string): Promise<void>;

  /** Delete everything in both scopes. Returns the number removed. */
  purgeAll(): Promise<number>;
}
