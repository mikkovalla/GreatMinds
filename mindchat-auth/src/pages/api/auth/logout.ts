import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabaseClient";
import { validateAndSecureRequest, createErrorResponse } from "@/lib/security";
import { logger } from "@/lib/logging";

/**
 * POST /api/auth/logout
 *
 * Handles user logout by signing out from Supabase and clearing session cookies.
 * Implements graceful degradation - even if Supabase logout fails, local cookies
 * are still cleared to ensure user session is terminated client-side.
 *
 * Security Features:
 * - Rate limiting (10 attempts per hour per IP)
 * - OWASP security headers
 * - Comprehensive error logging
 * - Graceful degradation for better UX
 * - Defensive cookie clearing
 *
 * @param context - Astro API context containing request and response utilities
 * @returns Response - Redirect to home page on success, JSON error on failure
 */
export const POST: APIRoute = async (context) => {
  const { request, cookies, redirect, locals } = context;
  const supabase =
    (locals && (locals.supabase as any)) || createClient(cookies);
  try {
    // Security validation and rate limiting
    const securityCheck = await validateAndSecureRequest(request, "LOGOUT");
    if (!securityCheck.valid) {
      logger.logRequest(
        3001,
        "Logout attempt blocked by rate limiter",
        request
      );
      return securityCheck.response!;
    }

    // Attempt to sign out from Supabase
    const supabaseResponse = await supabase.auth.signOut();
    const supabaseError = supabaseResponse?.error || null;

    // Clear session cookies regardless of Supabase outcome (graceful degradation)
    // Ensure cookies are cleared via Astro cookies API
    cookies.delete("sb-access-token");
    cookies.delete("sb-refresh-token");

    // Log Supabase errors but don't fail the logout process
    if (supabaseError) {
      logger.logRequestError(
        4008,
        "Supabase logout failed, but cookies cleared locally",
        supabaseError,
        request
      );

      // Still log success since we cleared local session
      logger.logRequest(
        1003,
        "User logout successful (local session cleared)",
        request
      );
    } else {
      // Full success - both Supabase and local cookies cleared
      logger.logRequest(1003, "User logout successful", request);
    }

    // Always redirect to home page after logout
    return redirect("/");
  } catch (error) {
    // Log unexpected errors
    logger.logRequestError(
      5002,
      "Unexpected error during logout",
      error as Error,
      request
    );

    // Return error response for unexpected failures
    return createErrorResponse(
      500,
      "Internal Server Error",
      "An unexpected error occurred during logout. Please try again."
    );
  }
};
