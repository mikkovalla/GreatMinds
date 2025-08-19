import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabaseClient";

/**
 * Global middleware for Astro that injects a per-request Supabase client
 * into `context.locals.supabase` for every incoming request.
 *
 * Uses defineMiddleware for better type safety as recommended by Astro docs.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals } = context;

  // Create Supabase client with proper cookie handling
  const supabase = createClient(cookies);

  // Get session and user data
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user || null;

  // Inject into locals for use in pages
  locals.supabase = supabase;
  locals.user = user;

  // Continue to the next middleware or page (REQUIRED)
  return next();
});
