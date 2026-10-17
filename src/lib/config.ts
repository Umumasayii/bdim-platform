// Runtime configuration derived from environment variables.
// NEXT_PUBLIC_* values are inlined into the browser bundle at build time.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when Supabase (database, auth, storage) is configured. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Payments are off until BDIM formally sets prices and configures a provider. */
export const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
