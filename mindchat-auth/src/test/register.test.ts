/**
 * This demonstrates the preferred approach to writing unit tests with:
 * - Test-specific mocks (not global mocks)
 * - Explicit dependencies
 * - Factory functions for test data
 * - Clear arrange/act/assert structure
 * - Isolated test scenarios
 *
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { POST } from "../pages/api/auth/register";
import { supabase } from "@/lib/supabaseClient";
import * as security from "@/lib/security";
import * as validation from "@/lib/validation";
import * as logging from "@/lib/logging";
import {
  createMockUser,
  createMockSession,
  createMockCookieOptions,
  createMockAPIContext,
  createMockJsonRequest,
} from "./testUtils/factories";
import type { APIContext } from "astro";

// Mock external dependencies at the top of the test file
vi.mock("@/lib/supabaseClient");
vi.mock("@/lib/security");
vi.mock("@/lib/validation");
vi.mock("@/lib/logging");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("successful registration", () => {
    it("should register a new user and set session cookies", async () => {
      // Arrange - Set up test data and mocks
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({
        access_token: "access-token-123",
        refresh_token: "refresh-token-123",
        user: mockUser,
      });
      const mockCookieOptions = createMockCookieOptions(false); // Dev environment
      const context = createMockAPIContext();

      // Mock function implementations for this specific test
      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(security.getCookieOptions).mockReturnValue(mockCookieOptions);
      vi.mocked(validation.validateJsonBody).mockResolvedValue({
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
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      // Act - Execute the function under test
      await POST(context as unknown as APIContext);

      // Assert - Verify the expected behavior
      expect(security.validateAndSecureRequest).toHaveBeenCalledWith(
        context.request,
        "REGISTRATION"
      );
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });
      expect(supabase.from("profiles").insert).toHaveBeenCalledWith([
        {
          id: "user-123",
          email: "test@example.com",
          role: "Authenticated Free User",
        },
      ]);

      // Verify cookies are set with proper options
      expect(context.__mocks.cookiesSet).toHaveBeenCalledTimes(2);
      expect(context.__mocks.cookiesSet).toHaveBeenCalledWith(
        "sb-access-token",
        "access-token-123",
        mockCookieOptions
      );
      expect(context.__mocks.cookiesSet).toHaveBeenCalledWith(
        "sb-refresh-token",
        "refresh-token-123",
        mockCookieOptions
      );
      expect(context.__mocks.redirect).toHaveBeenCalledWith("/");
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1001,
        "User registration successful",
        context.request,
        { userId: "user-123", email: "test@example.com" }
      );
      expect(security.getCookieOptions).toHaveBeenCalledWith(false); // import.meta.env.PROD
    });
  });

  describe("validation errors", () => {
    it("should return 400 for invalid json body", async () => {
      // Arrange
      const request = createMockJsonRequest({ email: "invalid" });
      const context = createMockAPIContext({ request });
      const mockErrorResponse = new Response("Bad Request", { status: 400 });
      vi.spyOn(request, "json").mockRejectedValue(new Error("Malformed JSON"));

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        400,
        "Bad Request",
        expect.stringContaining("Invalid JSON body")
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        2009,
        "Invalid form data received",
        expect.any(Error),
        context.request
      );
    });

    it("should return 400 for invalid credentials", async () => {
      // Arrange
      const request = createMockJsonRequest({
        email: "test@example.com",
        password: "short",
      });
      const context = createMockAPIContext({ request });
      const mockErrorResponse = new Response("Bad Request", { status: 400 });

      // Create a proper ZodError for validation failure
      const zodError = new z.ZodError([
        {
          code: "too_small",
          minimum: 8,
          inclusive: true,
          message: "Password must be at least 8 characters long",
          path: ["password"],
        } as any, // Type assertion to bypass strict typing for test
      ]);

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(validation.validateJsonBody).mockResolvedValue({
        email: "test@example.com",
        password: "short",
      });
      vi.mocked(validation.validateRegistrationInput).mockImplementation(() => {
        throw zodError;
      });
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        400,
        "Bad Request",
        "Invalid credentials"
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        2001,
        "Registration input validation failed",
        zodError,
        context.request
      );
    });
  });

  describe("security validation", () => {
    it("should return 403 if request is not secure", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Forbidden", { status: 403 });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: false,
        response: mockErrorResponse,
      });

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.validateAndSecureRequest).toHaveBeenCalledWith(
        context.request,
        "REGISTRATION"
      );
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        3001,
        "Registration attempt blocked by security check",
        context.request
      );
    });
  });

  describe("Supabase errors", () => {
    it("should return 500 when Supabase signUp fails", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });
      const signUpError = {
        name: "AuthApiError",
        message: "User already registered",
        code: "email_already_exists",
        status: 400,
        __isAuthError: true,
      } as any;

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(validation.validateJsonBody).mockResolvedValue({
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
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
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

    it("should return 500 when Supabase returns no user data", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(validation.validateJsonBody).mockResolvedValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateRegistrationInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        500,
        "Internal Server Error",
        "Could not sign up user."
      );
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        4001,
        "Supabase returned no user data after signup",
        context.request,
        { email: "test@example.com" }
      );
    });

    it("should return 500 when profile creation fails", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const mockSession = createMockSession({
        user: mockUser,
      });
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });
      const profileError = {
        message: "Profile creation failed",
        details: "Constraint violation",
        hint: "",
        code: "23505",
      };

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(validation.validateJsonBody).mockResolvedValue({
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
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: profileError,
          count: null,
          status: 500,
          statusText: "Internal Server Error",
        }),
      } as any);
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
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
        { userId: "user-123" }
      );
    });
  });

  describe("email verification flow", () => {
    it("should handle successful registration without immediate session (email verification required)", async () => {
      // Arrange
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
      });
      const context = createMockAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
      });
      vi.mocked(validation.validateJsonBody).mockResolvedValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateRegistrationInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null }, // No session when email verification is required
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      // Act
      await POST(context as unknown as APIContext);

      // Assert
      expect(supabase.from("profiles").insert).toHaveBeenCalledWith([
        {
          id: "user-123",
          email: "test@example.com",
          role: "Authenticated Free User",
        },
      ]);

      // Should not set cookies when no session
      expect(context.__mocks.cookiesSet).not.toHaveBeenCalled();

      expect(context.__mocks.redirect).toHaveBeenCalledWith("/");
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1004,
        "User registration successful, email verification required",
        context.request,
        { userId: "user-123", email: "test@example.com" }
      );
    });
  });

  describe("unexpected errors", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });
      const unexpectedError = new Error("Unexpected network error");

      vi.mocked(security.validateAndSecureRequest).mockRejectedValue(
        unexpectedError
      );
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        500,
        "Internal Server Error",
        "An unexpected error occurred. Please try again."
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        5002,
        "Unexpected error during registration",
        unexpectedError,
        context.request
      );
    });
  });

  describe("rate limiting", () => {
    it("should block requests when rate limited", async () => {
      // Arrange
      const context = createMockAPIContext();
      const rateLimitResponse = new Response("Rate limit exceeded", {
        status: 429,
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: false,
        response: rateLimitResponse,
      });

      // Act
      const response = await POST(context as unknown as APIContext);

      // Assert
      expect(response).toBe(rateLimitResponse);
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        3001,
        "Registration attempt blocked by rate limiter",
        context.request
      );
    });
  });
});
