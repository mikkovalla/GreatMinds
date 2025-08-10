/**
 * Test factory functions for creating mock data objects.
 *
 * These factories provide consistent, reusable mock data for tests
 * while allowing customization through the overrides parameter.
 *
 * @fileoverview Mock data factories for testing
 */
import { vi } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Creates a mock Supabase User object
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "test-user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: undefined,
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  role: "authenticated",
  updated_at: new Date().toISOString(),
  identities: [],
  factors: [],
  ...overrides,
});

/**
 * Creates a mock Supabase Session object
 */
export const createMockSession = (
  overrides: Partial<Session> = {}
): Session => ({
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: createMockUser(),
  ...overrides,
});

/**
 * Creates mock cookie options for testing
 */
export const createMockCookieOptions = (
  isProduction: boolean = false,
  overrides: Record<string, any> = {}
) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  ...overrides,
});

/**
 * Creates a mock FormData object with registration data
 */
export const createMockRegistrationForm = (
  email: string = "test@example.com",
  password: string = "Password123!"
): FormData => {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);
  return formData;
};

/**
 * Creates a mock Request object
 */
export const createMockRequest = (
  formData: FormData,
  headers: Record<string, string> = {}
): Request => {
  return {
    formData: () => Promise.resolve(formData),
    headers: new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    }),
    method: "POST",
  } as Request;
};

/**
 * Creates a mock APIContext for Astro tests
 */
export const createMockAPIContext = (
  formData: FormData = createMockRegistrationForm()
) => {
  const mockCookiesSet = vi.fn();
  const mockRedirect = vi.fn();

  return {
    request: createMockRequest(formData),
    cookies: {
      set: mockCookiesSet,
      get: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
    },
    redirect: mockRedirect,
    // Access to mock functions for assertions
    __mocks: {
      cookiesSet: mockCookiesSet,
      redirect: mockRedirect,
    },
  };
};
