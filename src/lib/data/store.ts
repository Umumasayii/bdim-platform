import "server-only";
import { isSupabaseConfigured } from "@/lib/config";
import { localStore } from "./local-store";
import { supabaseStore } from "./supabase-store";
import type { Store } from "./store-types";

/** Supabase when configured, otherwise the local JSON file store. */
export function getStore(): Store {
  return isSupabaseConfigured ? supabaseStore : localStore;
}
