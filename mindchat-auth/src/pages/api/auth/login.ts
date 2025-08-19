import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabaseClient";
import {
  validateAndSecureRequest,
  createErrorResponse,
  getCookieOptions,
} from "@/lib/security";
import {
  validateFormData,
  validateJsonBody,
  validateSignInInput,
} from "@/lib/validation";
import { logger } from "@/lib/logging";

/**
 * POST /api/auth/login
 *
 * Handles user authentication with email and password.
 * Authenticates existing users and creates secure sessions.
 *
 * Security Features:
 * - Rate limiting (10 attempts per hour per IP)
 * - Input validation with Zod schemas
 * - OWASP security headers
 * - Comprehensive error logging
 * - Secure cookie handling
 * - Protection against brute force attacks
 *
 * @param context - Astro API context containing request and response utilities
 * @returns Response - Redirect to home page on success, JSON error on failure
 */
export const POST: APIRoute = async (context) => {
  const { request, cookies, redirect, locals } = context;
  // Use middleware-injected per-request client when available, otherwise create one
  const supabase =
    (locals && (locals.supabase as any)) || createClient(cookies);
  try {
    const securityCheck = await validateAndSecureRequest(request, "LOGIN");
    if (!securityCheck.valid) {
      logger.logRequest(3001, "Login attempt blocked by rate limiter", request);
      return securityCheck.response!;
    }

    // Support requests sent as JSON (preferred) or as form data
    const contentType = request.headers.get("content-type") || "";
    let formInput: { email: string; password: string };

    try {
      if (contentType.includes("application/json")) {
        // JSON payloads (from SPA client)
        const body = await request.json();
        formInput = validateJsonBody(body);
      } else {
        // Form submissions (multipart/form-data or x-www-form-urlencoded)
        const formData = await request.formData();
        formInput = validateFormData(formData);
      }
    } catch (error) {
      logger.logRequestError(
        2009,
        "Invalid form data received",
        error as Error,
        request
      );
      return createErrorResponse(
        400,
        "Bad Request",
        `Invalid form data: ${(error as Error).message}`
      );
    }

    let validatedInput;
    try {
      validatedInput = validateSignInInput(formInput);
    } catch (error) {
      logger.logRequestError(
        2002,
        "Login input validation failed",
        error as Error,
        request,
        { email: formInput.email }
      );
      return createErrorResponse(
        400,
        "Bad Request",
        `Invalid login data: ${(error as Error).message}`
      );
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: validatedInput.email,
        password: validatedInput.password,
      });

    if (signInError) {
      // Handle specific authentication errors
      if (signInError.message?.includes("Invalid login credentials")) {
        logger.logRequestError(
          4005,
          "Login authentication failed",
          signInError,
          request,
          { email: validatedInput.email }
        );
        return createErrorResponse(
          401,
          "Unauthorized",
          "Invalid email or password."
        );
      }

      if (signInError.message?.includes("Email not confirmed")) {
        logger.logRequestError(
          4004,
          "Login failed - email not confirmed",
          signInError,
          request,
          { email: validatedInput.email }
        );
        return createErrorResponse(
          401,
          "Unauthorized",
          "Please verify your email address before signing in."
        );
      }

      // Handle other authentication errors
      logger.logRequestError(
        4008,
        "Supabase authentication error",
        signInError,
        request
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Could not sign in user."
      );
    }

    if (!signInData.user) {
      logger.logRequest(
        4008,
        "Supabase returned no user data after sign in",
        request,
        { email: validatedInput.email }
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Could not sign in user."
      );
    }

    if (!signInData.session) {
      logger.logRequest(
        4006,
        "Login successful but no session created",
        request,
        {
          userId: signInData.user.id,
          email: signInData.user.email,
        }
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Could not create user session."
      );
    }

    // Set secure session cookies
    const cookieOptions = getCookieOptions(import.meta.env.PROD);
    cookies.set(
      "sb-access-token",
      signInData.session.access_token,
      cookieOptions as any
    );
    cookies.set(
      "sb-refresh-token",
      signInData.session.refresh_token,
      cookieOptions as any
    );

    // Log successful login with rate limit info
    const logContext: any = {
      userId: signInData.user.id,
      email: signInData.user.email,
    };

    if (securityCheck.remainingAttempts !== undefined) {
      logContext.remainingLoginAttempts = securityCheck.remainingAttempts;
    }

    logger.logRequest(1002, "User login successful", request, logContext);

    return redirect("/");
  } catch (error) {
    logger.logRequestError(
      5002,
      "Unexpected error during login",
      error as Error,
      request
    );

    return createErrorResponse(
      500,
      "Internal Server Error",
      "An unexpected error occurred. Please try again."
    );
  }
};
