import { config } from "./config";
import { getExtension } from "./storage";

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate an uploaded file by extension, declared MIME type and size.
 * Extension is the primary gate; MIME is advisory because browsers are
 * inconsistent (notably for .mov files).
 */
export function validateUpload(file: {
  name: string;
  type: string;
  size: number;
}): UploadValidationResult {
  const ext = getExtension(file.name);

  if (!config.acceptedExtensions.includes(ext as (typeof config.acceptedExtensions)[number])) {
    return {
      ok: false,
      error: `Unsupported file type "${ext || "unknown"}". Allowed: ${config.acceptedExtensions.join(", ")}.`,
    };
  }

  if (file.type && !config.acceptedMimeTypes.includes(file.type as (typeof config.acceptedMimeTypes)[number])) {
    // Soft-fail only if the extension also looks wrong; otherwise trust the ext.
    // Here the extension already passed, so we just allow it through.
  }

  if (file.size <= 0) {
    return { ok: false, error: "The file appears to be empty." };
  }

  if (file.size > config.maxUploadBytes) {
    return {
      ok: false,
      error: `File is too large. Maximum allowed is ${config.maxUploadMb} MB.`,
    };
  }

  return { ok: true };
}
