/**
 * Test setup configuration for the mindchat-auth application.
 *
 * This file provides minimal global mocking for external infrastructure dependencies
 * that should be mocked in all tests. Business logic mocks should be defined in
 * individual test files for better test isolation and maintainability.
 *
 * @fileoverview Global setup for external dependencies only:
 * - External APIs (Supabase)
 * - Environment-specific utilities
 * - Infrastructure concerns
 *
 * Business logic mocks should be defined per-test for:
 * - Better test readability
 * - Explicit test dependencies
 * - Easier debugging when tests fail
 * - Test isolation
 */
import { beforeEach, vi } from "vitest";

// Reset all mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

// Mock external dependencies only - these are infrastructure concerns
// that should always be mocked in tests

// Mock Supabase - External API
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      setSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

// Mock internal modules are intentionally left to individual tests
// This promotes:
// 1. Explicit test dependencies
// 2. Better test isolation
// 3. Easier debugging
// 4. More maintainable tests

// If you need shared mock utilities, create them in testUtils/ folder
// and import them in individual test files as needed
