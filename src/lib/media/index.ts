import { config } from "../config";
import { LocalMediaStore } from "./local";
import { SupabaseMediaStore } from "./supabaseStore";
import type { MediaStore } from "./types";

/** The active media store, chosen once from config. */
export const mediaStore: MediaStore =
  config.storageBackend === "supabase"
    ? new SupabaseMediaStore()
    : new LocalMediaStore();

export type { MediaStore, JobWorkspace, ServePlan, StorageScope } from "./types";
