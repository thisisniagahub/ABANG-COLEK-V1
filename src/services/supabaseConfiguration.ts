import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export const CLOUD_UNAVAILABLE_MESSAGE = 'Sambungan cloud belum dikonfigurasi atau konfigurasi tidak sah. Gunakan workspace platform atau hubungi pentadbir.';
export type SupabaseConfigurationStatus = { available: true; message: string } | { available: false; message: string };
export function initializeSupabase(url: string | undefined, key: string | undefined): { client: SupabaseClient | null; status: SupabaseConfigurationStatus } {
  const unavailable = { client: null, status: { available: false as const, message: CLOUD_UNAVAILABLE_MESSAGE } };
  if (!url?.trim() || !key?.trim()) return unavailable;
  try {
    const client = createClient(url.trim(), key.trim(), { auth: { persistSession: true, autoRefreshToken: true } });
    return { client, status: { available: true, message: 'Konfigurasi cloud tersedia; sambungan belum disahkan.' } };
  } catch {
    // SDK validation errors can contain configuration values; expose only a safe message.
    return unavailable;
  }
}
