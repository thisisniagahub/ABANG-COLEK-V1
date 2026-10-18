/**
 * Supabase Client & Operations Service for ABANGCOLEK-OS
 * Project ID: yeszjvcnjxumujxinahz
 * Host: db.yeszjvcnjxumujxinahz.supabase.co
 */

import { initializeSupabase, CLOUD_UNAVAILABLE_MESSAGE } from './supabaseConfiguration';

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://yeszjvcnjxumujxinahz.supabase.co',
  publishableKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  projectRef: 'yeszjvcnjxumujxinahz',
  dbHost: 'db.yeszjvcnjxumujxinahz.supabase.co:5432',
};

const initialized = initializeSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
export const supabase = initialized.client;
export const supabaseStatus = initialized.status;
export function requireSupabaseClient(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error(CLOUD_UNAVAILABLE_MESSAGE);
  return supabase;
}

export interface SupabaseHealthCheckResult {
  isConnected: boolean;
  projectUrl: string;
  projectRef: string;
  latencyMs: number;
  message: string;
  tables?: string[];
  error?: string;
}

/**
 * Checks connectivity to the live Supabase project
 */
export async function checkSupabaseConnection(): Promise<SupabaseHealthCheckResult> {
  const startTime = Date.now();
  try {
    // Attempt a light ping by querying auth settings or public schema
    const { data: _data, error } = await requireSupabaseClient().from('orders').select('count', { count: 'exact', head: true });
    const latencyMs = Date.now() - startTime;

    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.orders" does not exist')) {
      // If table doesn't exist yet, it still means Supabase responded with a valid PostgREST error!
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return {
          isConnected: true,
          projectUrl: SUPABASE_CONFIG.url,
          projectRef: SUPABASE_CONFIG.projectRef,
          latencyMs,
          message: 'Tersambung ke Supabase (Pangkalan data aktif, sedia untuk migrasi jadual).',
          tables: [],
        };
      }
      return {
        isConnected: false,
        projectUrl: SUPABASE_CONFIG.url,
        projectRef: SUPABASE_CONFIG.projectRef,
        latencyMs,
        message: 'Ralat respon Supabase',
        error: error.message,
      };
    }

    return {
      isConnected: true,
      projectUrl: SUPABASE_CONFIG.url,
      projectRef: SUPABASE_CONFIG.projectRef,
      latencyMs,
      message: 'Tersambung ke Supabase Cloud (Live & Responsif)',
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      isConnected: false,
      projectUrl: SUPABASE_CONFIG.url,
      projectRef: SUPABASE_CONFIG.projectRef,
      latencyMs,
      message: 'Gagal menyambung ke pelayan Supabase',
      error: err?.message || String(err),
    };
  }
}
