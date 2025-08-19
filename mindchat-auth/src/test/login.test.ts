/**
 * Comprehensive unit tests for the login API endpoint
 *
 * This test suite follows the established testing patterns:
 * - Test-specific mocks (not global mocks)
 * - Explicit dependencies
 * - Factory functions for test data
 * - Complete coverage of all scenarios
 * - Clear arrange/act/assert structure
 * - Isolated test scenarios
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
// Create a mock supabase client and make createClient return it
const mockSupabase = { auth: { signInWithPassword: vi.fn() } } as any;
vi.mock("@/lib/supabaseClient", () => ({
  createClient: (cookies: any) => mockSupabase,
}));
import { POST } from "../pages/api/auth/login";
import * as security from "@/lib/security";
import * as validation from "@/lib/validation";
import * as logging from "@/lib/logging";
import {
  createMockUser,
  createMockSession,
  createMockCookieOptions,
  createMockAPIContext,
} from "./testUtils/factories";
import type { APIContext } from "astro";

// Mock external dependencies at the top of the test file
vi.mock("@/lib/security");
vi.mock("@/lib/validation");
vi.mock("@/lib/logging");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("successful login", () => {
    it("should authenticate user and set session cookies", async () => {
      // Arrange - Set up test data and mocks
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: new Date().toISOString(),
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
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });
      vi.mocked(security.getCookieOptions).mockReturnValue(mockCookieOptions);
      // Client sends JSON in SPA; mock JSON body validator
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act - Execute the function under test
      await POST(context as unknown as APIContext);

      // Assert - Verify the expected behavior
      expect(security.validateAndSecureRequest).toHaveBeenCalledWith(
        context.request,
        "LOGIN"
      );
      expect(security.getCookieOptions).toHaveBeenCalledWith(false);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });

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
        1002,
        "User login successful",
        context.request,
        {
          userId: "user-123",
          email: "test@example.com",
          remainingLoginAttempts: 9,
        }
      );
    });

    it("should handle login with unverified email but active session", async () => {
      // Arrange - User with unverified email but Supabase still creates session
      const mockUser = createMockUser({
        id: "user-456",
        email: "unverified@example.com",
        email_confirmed_at: undefined, // Unverified email
      });
      const mockSession = createMockSession({
        user: mockUser,
      });
      const context = createMockAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 8,
      });
      vi.mocked(security.getCookieOptions).mockReturnValue(
        createMockCookieOptions()
      );
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "unverified@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "unverified@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      await POST(context as unknown as APIContext);

      // Assert
      expect(context.__mocks.cookiesSet).toHaveBeenCalledTimes(2);
      expect(context.__mocks.redirect).toHaveBeenCalledWith("/");
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1002,
        "User login successful",
        context.request,
        {
          userId: "user-456",
          email: "unverified@example.com",
          remainingLoginAttempts: 8,
        }
      );
    });
  });

  describe("validation errors", () => {
    it("should return 400 for invalid form data", async () => {
      // Arrange - use FormData so the handler parses form data path
      const emptyFormData = new FormData();
      const context = createMockAPIContext(emptyFormData);
      const mockErrorResponse = new Response("Bad Request", { status: 400 });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });
      vi.mocked(validation.validateFormData).mockImplementation(() => {
        throw new Error("Email and password must be provided as strings");
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
        "Invalid form data: Email and password must be provided as strings"
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        2009,
        "Invalid form data received",
        expect.any(Error),
        context.request
      );
    });

    it("should return 400 for invalid sign-in input", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Bad Request", { status: 400 });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "invalid-email",
        password: "",
      });
      vi.mocked(validation.validateSignInInput).mockImplementation(() => {
        throw new Error("Password is required");
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
        "Invalid login data: Password is required"
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        2002,
        "Login input validation failed",
        expect.any(Error),
        context.request,
        { email: "invalid-email" }
      );
    });
  });

  describe("authentication failures", () => {
    it("should return 401 for invalid credentials", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Unauthorized", { status: 401 });
      const authError = {
        name: "AuthApiError",
        message: "Invalid login credentials",
        code: "invalid_credentials",
        status: 400,
        __isAuthError: true,
      } as any;

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 8,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "test@example.com",
        password: "WrongPassword!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "WrongPassword!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        401,
        "Unauthorized",
        "Invalid email or password."
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        4005,
        "Login authentication failed",
        authError,
        context.request,
        { email: "test@example.com" }
      );
    });

    it("should return 401 for unconfirmed email when signIn returns error", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Unauthorized", { status: 401 });
      const emailNotConfirmedError = {
        name: "AuthApiError",
        message: "Email not confirmed",
        code: "email_not_confirmed",
        status: 400,
        __isAuthError: true,
      } as any;

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 7,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "unconfirmed@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "unconfirmed@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: emailNotConfirmedError,
      });
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        401,
        "Unauthorized",
        "Please verify your email address before signing in."
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        4004,
        "Login failed - email not confirmed",
        emailNotConfirmedError,
        context.request,
        { email: "unconfirmed@example.com" }
      );
    });

    it("should return 500 for other Supabase authentication errors", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });
      const internalError = {
        name: "AuthApiError",
        message: "Database connection failed",
        code: "internal_error",
        status: 500,
        __isAuthError: true,
      } as any;

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 6,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: internalError,
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
        "Could not sign in user."
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        4008,
        "Supabase authentication error",
        internalError,
        context.request
      );
    });

    it("should return 500 when Supabase returns no user data without error", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 5,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null, weakPassword: null },
        error: null,
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
        "Could not sign in user."
      );
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        4008,
        "Supabase returned no user data after sign in",
        context.request,
        { email: "test@example.com" }
      );
    });

    it("should return 500 when session is missing despite successful authentication", async () => {
      // Arrange
      const mockUser = createMockUser({
        id: "user-789",
        email: "test@example.com",
      });
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Internal Server Error", {
        status: 500,
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 4,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: null, weakPassword: null },
        error: null,
      } as any); // User exists but no session
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
        "Could not create user session."
      );
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        4006,
        "Login successful but no session created",
        context.request,
        { userId: "user-789", email: "test@example.com" }
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
        rateLimitHeaders: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(Date.now() + 3600000).toISOString(),
        },
        remainingAttempts: 0,
      });

      // Act
      const response = await POST(context as unknown as APIContext);

      // Assert
      expect(response).toBe(rateLimitResponse);
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        3001,
        "Login attempt blocked by rate limiter",
        context.request
      );
    });

    it("should log remaining attempts when close to rate limit", async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });
      const context = createMockAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "1",
          "X-RateLimit-Reset": new Date(Date.now() + 3600000).toISOString(),
        },
        remainingAttempts: 1,
      });
      vi.mocked(security.getCookieOptions).mockReturnValue(
        createMockCookieOptions()
      );
      vi.mocked(validation.validateFormData).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      await POST(context as unknown as APIContext);

      // Assert
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1002,
        "User login successful",
        context.request,
        {
          userId: mockUser.id,
          email: mockUser.email,
          remainingLoginAttempts: 1,
        }
      );
    });
  });

  describe("security controls", () => {
    it("should handle invalid request validation", async () => {
      // Arrange
      const context = createMockAPIContext();
      const securityErrorResponse = new Response("Bad Request", {
        status: 400,
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: false,
        response: securityErrorResponse,
      });

      // Act
      const response = await POST(context as unknown as APIContext);

      // Assert
      expect(response).toBe(securityErrorResponse);
      expect(security.validateAndSecureRequest).toHaveBeenCalledWith(
        context.request,
        "LOGIN"
      );
      // Should not proceed to validation or authentication
      expect(validation.validateFormData).not.toHaveBeenCalled();
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe("cookie handling", () => {
    it("should set secure cookies with proper options", async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });
      const mockCookieOptions = createMockCookieOptions(false); // Default development environment
      const context = createMockAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });
      vi.mocked(security.getCookieOptions).mockReturnValue(mockCookieOptions);
      vi.mocked(validation.validateFormData).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockReturnValue({
        email: "test@example.com",
        password: "Password123!",
      });
      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      await POST(context as unknown as APIContext);

      // Assert
      expect(security.getCookieOptions).toHaveBeenCalledWith(false); // Default development
      expect(context.__mocks.cookiesSet).toHaveBeenCalledWith(
        "sb-access-token",
        mockSession.access_token,
        mockCookieOptions
      );
      expect(context.__mocks.cookiesSet).toHaveBeenCalledWith(
        "sb-refresh-token",
        mockSession.refresh_token,
        mockCookieOptions
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
      const unexpectedError = new Error("Network connection failed");

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
        "Unexpected error during login",
        unexpectedError,
        context.request
      );
    });

    it("should handle form data parsing errors", async () => {
      // Arrange - ensure the handler takes the form-data branch
      const emptyFormData = new FormData();
      const context = createMockAPIContext(emptyFormData);
      const mockErrorResponse = new Response("Bad Request", { status: 400 });
      const formDataError = new Error("Failed to parse form data");

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 8,
      });

      // Make request.formData() throw an error
      context.request.formData = vi.fn().mockRejectedValue(formDataError);

      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert - malformed form data should be considered a bad request
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        400,
        "Bad Request",
        "Invalid form data: Failed to parse form data"
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        2009,
        "Invalid form data received",
        formDataError,
        context.request
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty form submission", async () => {
      // Arrange
      const emptyFormData = new FormData();
      const context = createMockAPIContext(emptyFormData);
      const mockErrorResponse = new Response("Bad Request", { status: 400 });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 7,
      });
      vi.mocked(validation.validateFormData).mockImplementation(() => {
        throw new Error("Email and password must be provided as strings");
      });
      vi.mocked(security.createErrorResponse).mockReturnValue(
        mockErrorResponse
      );

      // Act
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(validation.validateFormData).toHaveBeenCalledWith(emptyFormData);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        400,
        "Bad Request",
        "Invalid form data: Email and password must be provided as strings"
      );
    });

    it("should handle malformed email addresses", async () => {
      // Arrange
      const context = createMockAPIContext();
      const mockErrorResponse = new Response("Bad Request", { status: 400 });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 6,
      });
      vi.mocked(validation.validateJsonBody).mockReturnValue({
        email: "not-an-email",
        password: "Password123!",
      });
      vi.mocked(validation.validateSignInInput).mockImplementation(() => {
        throw new Error("Please provide a valid email address");
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
        "Invalid login data: Please provide a valid email address"
      );
    });
  });
});
