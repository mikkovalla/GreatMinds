/**
 * Test suite for the POST /api/auth/register endpoint.
 *
 * This test file validates the user registration functionality including:
 * - Successful user registration and automatic sign-in
 * - Form data validation and error handling
 * - Registration input validation
 * - Supabase authentication service integration
 * - User profile creation in the database
 * - Rate limiting protection
 * - Error logging and response handling
 *
 * The tests mock external dependencies including:
 * - Supabase client for authentication and database operations
 * - Security utilities for request validation and response creation
 * - Validation utilities for form and registration data
 * - Logging utilities for request tracking
 *
 * @fileoverview Registration endpoint test suite
 * @module register.test
 */
import { describe, it, expect, vi } from "vitest";
import { POST } from "../pages/api/auth/register";
import { supabase } from "@/lib/supabaseClient";
import * as security from "@/lib/security";
import * as validation from "@/lib/validation";
import * as logging from "@/lib/logging";
import type { APIContext } from "astro";
import type {
  User,
  AuthError,
  PostgrestError,
  Session,
} from "@supabase/supabase-js";

describe("POST /api/auth/register", () => {
  const mockRequest = (formData: FormData) => {
    return {
      request: {
        formData: () => Promise.resolve(formData),
        headers: new Headers({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        method: "POST",
      },
      cookies: {
        set: vi.fn(),
      },
      redirect: vi.fn(),
    } as unknown as APIContext;
  };

  const mockUser = {
    id: "123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;

  it("should register a new user successfully and sign them in", async () => {
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "Password123!");

    const mockSession = {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: mockUser,
    } as Session;

    vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
      valid: true,
    });
    vi.mocked(validation.validateFormData).mockReturnValue({
      email: "test@example.com",
      password: "Password123!",
    });
    vi.mocked(validation.validateRegistrationInput).mockReturnValue({
      email: "test@example.com",
      password: "Password123!",
    });
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValueOnce({ error: null }),
    } as any);

    const context = mockRequest(formData);
    await POST(context);

    expect(security.validateAndSecureRequest).toHaveBeenCalledWith(
      context.request,
      "REGISTRATION"
    );
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Password123!",
    });
    expect(supabase.from("profiles").insert).toHaveBeenCalledWith([
      { id: "123", email: "test@example.com", role: "Authenticated Free User" },
    ]);
    expect(context.cookies.set).toHaveBeenCalledTimes(2);
    expect(context.cookies.set).toHaveBeenCalledWith(
      "sb-access-token",
      mockSession.access_token,
      expect.any(Object)
    );
    expect(context.cookies.set).toHaveBeenCalledWith(
      "sb-refresh-token",
      mockSession.refresh_token,
      expect.any(Object)
    );
    expect(context.redirect).toHaveBeenCalledWith("/");
    expect(logging.logger.logRequest).toHaveBeenCalledWith(
      1001,
      "User registration successful",
      context.request,
      { userId: "123", email: "test@example.com" }
    );
  });

  it("should return 400 for invalid form data", async () => {
    const formData = new FormData();
    const context = mockRequest(formData);

    vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
      valid: true,
    });
    vi.mocked(validation.validateFormData).mockImplementation(() => {
      throw new Error("Email and password must be provided as strings");
    });

    await POST(context);

    expect(security.createErrorResponse).toHaveBeenCalledWith(
      400,
      "Bad Request",
      "Invalid form data: Email and password must be provided as strings"
    );
  });

  it("should return 400 for invalid registration input", async () => {
    const formData = new FormData();
    formData.append("email", "invalid-email");
    formData.append("password", "short");
    const context = mockRequest(formData);

    vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
      valid: true,
    });
    vi.mocked(validation.validateFormData).mockReturnValue({
      email: "invalid-email",
      password: "short",
    });
    vi.mocked(validation.validateRegistrationInput).mockImplementation(() => {
      throw new Error("Validation failed");
    });

    await POST(context);

    expect(security.createErrorResponse).toHaveBeenCalledWith(
      400,
      "Bad Request",
      "Invalid registration data: Validation failed"
    );
  });

  it("should return 500 if Supabase signUp fails", async () => {
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "Password123!");
    const context = mockRequest(formData);
    const signUpError = {
      name: "AuthApiError",
      message: "Supabase error",
    } as AuthError;

    vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
      valid: true,
    });
    vi.mocked(validation.validateFormData).mockReturnValue({
      email: "test@example.com",
      password: "Password123!",
    });
    vi.mocked(validation.validateRegistrationInput).mockReturnValue({
      email: "test@example.com",
      password: "Password123!",
    });
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: signUpError,
    });

    await POST(context);

    expect(security.createErrorResponse).toHaveBeenCalledWith(
      500,
      "Internal Server Error",
      "Could not sign up user."
    );
    expect(logging.logger.logRequestError).toHaveBeenCalledWith(
      4001,
      "Supabase sign up failed",
      signUpError,
      context.request
    );
  });

  it("should return 500 if creating profile fails", async () => {
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "Password123!");
    const context = mockRequest(formData);
    const profileError = {
      message: "Profile creation failed",
      details: "",
      hint: "",
      code: "500",
    } as PostgrestError;
    const mockSession = {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: mockUser,
    } as Session;

    vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
      valid: true,
    });
    vi.mocked(validation.validateFormData).mockReturnValue({
      email: "test@example.com",
      password: "Password123!",
    });
    vi.mocked(validation.validateRegistrationInput).mockReturnValue({
      email: "test@example.com",
      password: "Password123!",
    });
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    vi.mocked(supabase.from("profiles").insert).mockResolvedValue({
      data: null,
      error: profileError,
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    });

    await POST(context);

    expect(security.createErrorResponse).toHaveBeenCalledWith(
      500,
      "Internal Server Error",
      "Could not create user profile."
    );
    expect(logging.logger.logRequestError).toHaveBeenCalledWith(
      5001,
      "Failed to create user profile",
      profileError,
      context.request,
      { userId: "123" }
    );
  });

  it("should be blocked by rate limiting", async () => {
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "Password123!");
    const context = mockRequest(formData);
    const rateLimitResponse = new Response("Rate limit exceeded", {
      status: 429,
    });

    vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
      valid: false,
      response: rateLimitResponse,
    });

    const response = await POST(context);

    expect(response).toBe(rateLimitResponse);
    expect(logging.logger.logRequest).toHaveBeenCalledWith(
      3001,
      "Registration attempt blocked by rate limiter",
      context.request
    );
  });
});
