import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { config } from "../config";
import { getSupabase } from "../supabase";
import type { JobWorkspace, MediaStore, ServePlan, StorageScope } from "./types";

const objectPath = (scope: StorageScope, name: string) => `${scope}/${name}`;

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
};
const contentTypeFor = (name: string) =>
  CONTENT_TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";

/** Supabase Storage media store — files live in a private bucket. */
export class SupabaseMediaStore implements MediaStore {
  readonly kind = "supabase" as const;
  private bucket = config.supabaseBucket;

  async init(): Promise<void> {
    await mkdir(config.tmpDir, { recursive: true });
    const supabase = getSupabase();
    // Create the bucket if it doesn't exist yet; ignore "already exists".
    const { error } = await supabase.storage.createBucket(this.bucket, {
      public: false,
      fileSizeLimit: config.maxUploadBytes,
    });
    if (error && !/exist/i.test(error.message)) {
      // eslint-disable-next-line no-console
      console.warn(`[clippilot] could not ensure bucket: ${error.message}`);
    }
  }

  async saveUploadFromPath(name: string, tempPath: string): Promise<number> {
    const buffer = await readFile(tempPath);
    const { error } = await getSupabase()
      .storage.from(this.bucket)
      .upload(objectPath("uploads", name), buffer, {
        contentType: contentTypeFor(name),
        upsert: true,
      });
    await unlink(tempPath).catch(() => {});
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return buffer.length;
  }

  async size(scope: StorageScope, name: string): Promise<number> {
    const { data } = await getSupabase()
      .storage.from(this.bucket)
      .list(scope, { search: name, limit: 100 });
    const match = data?.find((o) => o.name === name);
    return match?.metadata?.size ?? 0;
  }

  async prepareJob(inputName: string, outputName: string): Promise<JobWorkspace> {
    const supabase = getSupabase();
    const inputPath = path.join(config.tmpDir, `in-${nanoid(8)}-${inputName}`);
    const outputPath = path.join(config.tmpDir, `out-${outputName}`);

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(objectPath("uploads", inputName));
    if (error || !data) {
      throw new Error(`Could not download input: ${error?.message ?? "missing"}`);
    }
    await writeFile(inputPath, Buffer.from(await data.arrayBuffer()));

    return {
      inputPath,
      outputPath,
      finalize: async () => {
        const buffer = await readFile(outputPath);
        const { error: upErr } = await supabase.storage
          .from(this.bucket)
          .upload(objectPath("outputs", outputName), buffer, {
            contentType: contentTypeFor(outputName),
            upsert: true,
          });
        if (upErr) throw new Error(`Could not upload output: ${upErr.message}`);
        return buffer.length;
      },
      dispose: async () => {
        await unlink(inputPath).catch(() => {});
        await unlink(outputPath).catch(() => {});
      },
    };
  }

  async serve(scope: StorageScope, name: string, download: boolean): Promise<ServePlan> {
    const { data, error } = await getSupabase()
      .storage.from(this.bucket)
      .createSignedUrl(objectPath(scope, name), config.signedUrlTtl, {
        download: download ? name : undefined,
      });
    if (error || !data) {
      throw new Error(`Could not sign URL: ${error?.message ?? "unknown"}`);
    }
    return { redirectUrl: data.signedUrl };
  }

  async remove(scope: StorageScope, name: string): Promise<void> {
    await getSupabase().storage.from(this.bucket).remove([objectPath(scope, name)]);
  }

  async purgeAll(): Promise<number> {
    const supabase = getSupabase();
    let removed = 0;
    for (const scope of ["uploads", "outputs"] as StorageScope[]) {
      const { data } = await supabase.storage.from(this.bucket).list(scope, {
        limit: 1000,
      });
      const paths = (data ?? []).map((o) => objectPath(scope, o.name));
      if (paths.length) {
        await supabase.storage.from(this.bucket).remove(paths);
        removed += paths.length;
      }
    }
    return removed;
  }
}
