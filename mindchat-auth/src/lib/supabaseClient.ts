import {
  createServerClient,
  createBrowserClient,
  type CookieOptions,
} from "@supabase/ssr";

import type { AstroCookies } from "astro";

const supabaseURL = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (cookies: AstroCookies) => {
  return createServerClient(supabaseURL, supabaseAnonKey, {
    cookies: {
      get(key: string) {
        return cookies.get(key)?.value;
      },
      set(key: string, value: string, options: CookieOptions) {
        return cookies.set(key, value, options);
      },
      remove(key: string, options?: CookieOptions) {
        return cookies.delete(key, options);
      },
    },
  });
};

export const createUsualClient = () => {
  return createBrowserClient(supabaseURL, supabaseAnonKey);
};
