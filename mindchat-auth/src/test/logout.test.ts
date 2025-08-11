/**
 * Comprehensive test suite for logout functionality
 *
 * This test suite follows TDD principles:
 * - Tests FAIL first until real implementation exists
 * - No logic in mocks - only behavior verification
 * - Tests import and call the actual logout endpoint
 * - External dependencies are mocked appropriately
 *
 * Coverage includes:
 * - Successful logout scenarios
 * - Supabase error handling
 * - Rate limiting
 * - Cookie management
 * - Security validation
 * - Edge cases and error scenarios
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../pages/api/auth/logout";
import { supabase } from "@/lib/supabaseClient";
import * as security from "@/lib/security";
import * as logging from "@/lib/logging";
import { createMockLogoutAPIContext } from "./testUtils/factories";
import type { APIContext } from "astro";

// Mock external dependencies - these provide controlled behavior for testing
vi.mock("@/lib/supabaseClient");
vi.mock("@/lib/security");
vi.mock("@/lib/logging");

/**
 * Helper function to create mock AuthError objects
 */
const createMockAuthError = (overrides: Record<string, any> = {}): any => ({
  message: "Authentication error",
  name: "AuthApiError",
  status: 400,
  code: "auth_error",
  __isAuthError: true,
  ...overrides,
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("successful logout", () => {
    it("should logout user and clear session cookies", async () => {
      // Arrange - Set up test data and mocks for dependencies
      const context = createMockLogoutAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "9",
          "X-RateLimit-Reset": new Date().toISOString(),
        },
        remainingAttempts: 9,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      // Act - Call the actual logout endpoint (will fail until implemented)
      await POST(context as unknown as APIContext);

      // Assert - Verify the expected behavior
      expect(security.validateAndSecureRequest).toHaveBeenCalledWith(
        context.request,
        "LOGOUT"
      );

      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);

      // Verify both session cookies are deleted
      expect(context.cookies.delete).toHaveBeenCalledTimes(2);
      expect(context.cookies.delete).toHaveBeenCalledWith("sb-access-token");
      expect(context.cookies.delete).toHaveBeenCalledWith("sb-refresh-token");

      expect(context.redirect).toHaveBeenCalledWith("/");

      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1003,
        "User logout successful",
        context.request
      );
    });

    it("should clear cookies and redirect even if Supabase logout fails (graceful degradation)", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();
      const supabaseError = createMockAuthError({
        message: "Network error",
        name: "AuthApiError",
        status: 500,
        code: "network_error",
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: supabaseError,
      });

      // Act - Call the actual logout endpoint
      await POST(context as unknown as APIContext);

      // Assert - Should still clear cookies and redirect for user experience
      expect(context.cookies.delete).toHaveBeenCalledTimes(2);
      expect(context.cookies.delete).toHaveBeenCalledWith("sb-access-token");
      expect(context.cookies.delete).toHaveBeenCalledWith("sb-refresh-token");
      expect(context.redirect).toHaveBeenCalledWith("/");

      // Should log both the error and the successful local logout
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        4008,
        "Supabase logout failed, but cookies cleared locally",
        supabaseError,
        context.request
      );
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1003,
        "User logout successful (local session cleared)",
        context.request
      );
    });
  });

  describe("rate limiting", () => {
    it("should block requests when rate limited", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();
      const rateLimitResponse = new Response("Rate limit exceeded", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "3600",
        },
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: false,
        response: rateLimitResponse,
        rateLimitHeaders: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date().toISOString(),
        },
        remainingAttempts: 0,
      });

      // Act - Call the actual logout endpoint
      const response = await POST(context as unknown as APIContext);

      // Assert
      expect(response).toBe(rateLimitResponse);
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        3001,
        "Logout attempt blocked by rate limiter",
        context.request
      );

      // Should not call Supabase or clear cookies when rate limited
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
      expect(context.cookies.delete).not.toHaveBeenCalled();
      expect(context.redirect).not.toHaveBeenCalled();
    });
  });

  describe("security validation", () => {
    it("should reject requests with invalid user agent", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();
      const securityErrorResponse = new Response("Bad Request", {
        status: 400,
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: false,
        response: securityErrorResponse,
      });

      // Act - Call the actual logout endpoint
      const response = await POST(context as unknown as APIContext);

      // Assert
      expect(response).toBe(securityErrorResponse);
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
      expect(context.cookies.delete).not.toHaveBeenCalled();
    });
  });

  describe("Supabase error scenarios", () => {
    it("should handle Supabase connection timeout gracefully", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();
      const timeoutError = createMockAuthError({
        message: "Request timeout",
        name: "TimeoutError",
        status: 408,
        code: "timeout",
      });

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: timeoutError,
      });

      // Act - Call the actual logout endpoint
      await POST(context as unknown as APIContext);

      // Assert
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        4008,
        "Supabase logout failed, but cookies cleared locally",
        timeoutError,
        context.request
      );

      // Should still clear cookies for user experience
      expect(context.cookies.delete).toHaveBeenCalledTimes(2);
      expect(context.redirect).toHaveBeenCalledWith("/");
    });
  });

  describe("unexpected errors", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();
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

      // Act - Call the actual logout endpoint
      const result = await POST(context as unknown as APIContext);

      // Assert
      expect(result).toBe(mockErrorResponse);
      expect(security.createErrorResponse).toHaveBeenCalledWith(
        500,
        "Internal Server Error",
        "An unexpected error occurred during logout. Please try again."
      );
      expect(logging.logger.logRequestError).toHaveBeenCalledWith(
        5002,
        "Unexpected error during logout",
        unexpectedError,
        context.request
      );
    });
  });

  describe("logging", () => {
    it("should log successful logout with appropriate code", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      // Act - Call the actual logout endpoint
      await POST(context as unknown as APIContext);

      // Assert
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1003, // AuthEvent.LOGOUT_SUCCESS
        "User logout successful",
        context.request
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined Supabase response", async () => {
      // Arrange
      const context = createMockLogoutAPIContext();

      vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
        valid: true,
        rateLimitHeaders: {},
        remainingAttempts: 9,
      });

      // Simulate unexpected null response from Supabase
      vi.mocked(supabase.auth.signOut).mockResolvedValue(null as any);

      // Act - Call the actual logout endpoint
      await POST(context as unknown as APIContext);

      // Assert - Should still clear cookies and complete logout
      expect(context.cookies.delete).toHaveBeenCalledTimes(2);
      expect(context.redirect).toHaveBeenCalledWith("/");
      expect(logging.logger.logRequest).toHaveBeenCalledWith(
        1003,
        "User logout successful",
        context.request
      );
    });
  });
});
