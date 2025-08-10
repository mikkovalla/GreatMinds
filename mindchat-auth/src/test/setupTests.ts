/**
 * Test setup configuration for the mindchat-auth application.
 *
 * This file configures mock implementations for external dependencies used throughout
 * the test suite, ensuring isolated and predictable testing environments.
 *
 * @fileoverview Sets up mocks for Supabase client, security utilities, validation functions,
 * and logging services to enable comprehensive unit testing without external dependencies.
 *
 * Mocked modules:
 * - `@/lib/supabaseClient` - Database and authentication operations
 * - `@/lib/security` - Request validation and response creation utilities
 * - `@/lib/validation` - Form and input validation functions
 * - `@/lib/logging` - Application logging and request tracking
 *
 */
import { beforeEach, vi } from "vitest";
import type * as security from "@/lib/security";

// Reset all mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

// Mock Supabase
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      setSession: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}));

// Mock Security
vi.mock("@/lib/security", async (importOriginal) => {
  const original = await importOriginal<typeof security>();
  return {
    ...original,
    validateAndSecureRequest: vi.fn().mockResolvedValue({ valid: true }),
    createErrorResponse: vi.fn(
      (status, error, message) =>
        new Response(JSON.stringify({ error, message }), { status })
    ),
    createSuccessResponse: vi.fn(
      (data, status) => new Response(JSON.stringify(data), { status })
    ),
    getCookieOptions: vi.fn().mockReturnValue({
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    }),
  };
});

// Mock Validation
vi.mock("@/lib/validation", () => ({
  validateFormData: vi.fn(),
  validateRegistrationInput: vi.fn(),
  validateSignInInput: vi.fn(),
}));

// Mock Logging
vi.mock("@/lib/logging", () => ({
  logger: {
    logRequest: vi.fn(),
    logRequestError: vi.fn(),
  },
  createRequestLogger: vi.fn(() => ({
    log: vi.fn(),
    logError: vi.fn(),
  })),
}));
