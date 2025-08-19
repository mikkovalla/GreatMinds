import type { APIContext } from "astro";
import { createClient } from "@/lib/supabaseClient";

/**
 * Global middleware for Astro that injects a per-request Supabase client
 * into `context.locals.supabase` for every incoming request.
 *
 * This file should be automatically picked up by Astro when placed under
 * `src/middleware` and exported functions are run per-request.
 */
export async function onRequest(context: APIContext) {
  const { cookies, locals } = context;
  const supabase = createClient(cookies);
  if (locals) locals.supabase = supabase as any;
}
