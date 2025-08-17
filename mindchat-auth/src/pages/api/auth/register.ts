import { z } from "zod";
import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabaseClient";
import {
  validateAndSecureRequest,
  createErrorResponse,
  getCookieOptions,
} from "@/lib/security";
import { validateJsonBody, validateRegistrationInput } from "@/lib/validation";
import { logger } from "@/lib/logging";

/**
 * POST /api/auth/register
 *
 * Handles user registration with email and password.
 * Creates user account in Supabase Auth and user profile in database.
 * Automatically signs in the user upon successful registration.
 *
 * Security Features:
 * - Rate limiting (5 attempts per hour per IP)
 * - Input validation with Zod schemas
 * - OWASP security headers
 * - Comprehensive error logging
 * - Secure cookie handling
 *
 * @param context - Astro API context containing request and response utilities
 * @returns Response - Redirect to home page on success, JSON error on failure
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const securityCheck = await validateAndSecureRequest(
      request,
      "REGISTRATION"
    );
    if (!securityCheck.valid) {
      const message =
        securityCheck.response?.status === 429
          ? "Registration attempt blocked by rate limiter"
          : "Registration attempt blocked by security check";
      logger.logRequest(3001, message, request);
      return securityCheck.response!;
    }

    let validatedInput;
    try {
      const body = await request.json();
      const formInput = validateJsonBody(body);
      validatedInput = validateRegistrationInput(formInput);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.logRequestError(
          2001,
          "Registration input validation failed",
          error,
          request
        );
        return createErrorResponse(400, "Bad Request", "Invalid credentials");
      }

      if (error instanceof Error) {
        logger.logRequestError(
          2009,
          "Invalid form data received",
          error,
          request
        );
        return createErrorResponse(
          400,
          "Bad Request",
          `Invalid JSON body: ${error.message}`
        );
      }

      // Fallback for non-Error objects
      logger.logRequestError(
        5002,
        "Unexpected validation error",
        error as Error,
        request
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "An unexpected error occurred during validation."
      );
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: validatedInput.email,
        password: validatedInput.password,
      }
    );

    if (signUpError) {
      logger.logRequestError(
        4001,
        "Supabase sign up failed",
        signUpError,
        request
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Could not sign up user."
      );
    }

    if (!signUpData.user) {
      logger.logRequest(
        4001,
        "Supabase returned no user data after signup",
        request,
        { email: validatedInput.email }
      );
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Could not sign up user."
      );
    }

    // Note: User profile will be automatically created by database trigger
    // when the user record is inserted into auth.users table

    if (signUpData.session) {
      const cookieOptions = getCookieOptions(import.meta.env.PROD);
      cookies.set(
        "sb-access-token",
        signUpData.session.access_token,
        cookieOptions as any
      );
      cookies.set(
        "sb-refresh-token",
        signUpData.session.refresh_token,
        cookieOptions as any
      );

      logger.logRequest(1001, "User registration successful", request, {
        userId: signUpData.user.id,
        email: signUpData.user.email,
      });
    } else {
      logger.logRequest(
        1004,
        "User registration successful, email verification required",
        request,
        {
          userId: signUpData.user.id,
          email: signUpData.user.email,
        }
      );
    }

    return redirect("/");
  } catch (error) {
    logger.logRequestError(
      5002,
      "Unexpected error during registration",
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
