import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env vars not set");
    _client = createClient(url, key, {
      auth: { persistSession: false },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: ws as any },
    });
  }
  return _client;
}
