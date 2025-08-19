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

// Mock external dependencies are intentionally left to individual tests.
// This ensures each test file explicitly declares its dependencies and
// provides its own Supabase mocks via `vi.mock("@/lib/supabaseClient", ...)`
// when needed. Keeping mocks local to tests improves isolation and avoids
// brittle global test state.

// If you need shared mock utilities, create them in `src/test/testUtils`
// and import them in individual test files as needed.
