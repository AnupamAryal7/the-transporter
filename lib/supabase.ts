import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SITE_URL } from "./constants";

// Ensure environment variables are defined
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }
  return url;
};

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");
  }
  return key;
};

const getSupabaseServiceKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }
  return key;
};

// Client-side Supabase client (authenticated with user session)
export const createSupabaseClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Server-side Supabase client (authenticated with cookies)
export const createSupabaseServerClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(
        name: string,
        value: string,
        options: { path: string; maxAge: number; domain?: string }
      ) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: { path: string; domain?: string }) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
};

// Server-side Supabase client (authenticated with service role for admin operations)
export const createSupabaseAdmin = () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getSupabaseServiceKey();

  // Using createServerClient for admin operations as well
  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get: () => undefined, // No cookies for admin client
      set: () => {}, // No-op
      remove: () => {}, // No-op
    },
    auth: {
      persistSession: false,
    },
  });
};

// Database types
export type SharedFile = {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  link_id: string;
  expires_at: string;
  max_views: number;
  views: number;
  created_at: string;
  notify_on_download?: boolean;
  notify_email?: string;
  organization_id?: string | null; // Add organization_id field
};

export { SITE_URL };
