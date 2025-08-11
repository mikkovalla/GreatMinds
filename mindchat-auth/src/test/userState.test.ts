import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { getUserState, requireAuthState, UserState } from "../lib/userState";
import { createMockUser, createMockSession } from "./testUtils/factories";
import { createErrorResponse } from "../lib/security";
import { logger } from "../lib/logging";
import { SupabaseError } from "../lib/loggingConstants";

// Mock dependencies
vi.mock("../lib/security", () => ({
  createErrorResponse: vi.fn(),
}));
vi.mock("../lib/logging", () => ({
  logger: {
    logRequest: vi.fn(),
    logRequestError: vi.fn(),
  },
}));

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
  },
  from: mockFrom,
};

const createMockApiContext = (supabaseClient: any): APIContext =>
  ({
    request: new Request("http://localhost/test"),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      getAll: vi.fn(),
      serialize: vi.fn(),
    },
    locals: {
      supabase: supabaseClient,
    },
  } as unknown as APIContext);

describe("User State Management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getUserState", () => {
    it("should return ANONYMOUS if no session exists", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      const context = createMockApiContext(mockSupabase);

      const result = await getUserState(context);

      expect(result.state).toBe(UserState.ANONYMOUS);
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });

    it("should return ANONYMOUS if session exists but user profile is not found", async () => {
      const user = createMockUser();
      const session = createMockSession({ user });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });
      const context = createMockApiContext(mockSupabase);

      const result = await getUserState(context);

      expect(result.state).toBe(UserState.ANONYMOUS);
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(logger.logRequestError).toHaveBeenCalledWith(
        SupabaseError.USER_NOT_FOUND,
        "User profile not found during state check.",
        expect.any(Error),
        context.request,
        { userId: user.id }
      );
    });

    it("should return ANONYMOUS if there is a database error fetching profile", async () => {
      const user = createMockUser();
      const session = createMockSession({ user });
      const dbError = new Error("Database connection failed");
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });
      const context = createMockApiContext(mockSupabase);

      const result = await getUserState(context);

      expect(result.state).toBe(UserState.ANONYMOUS);
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(logger.logRequestError).toHaveBeenCalledWith(
        SupabaseError.DATABASE_ERROR,
        "Failed to fetch user profile for state check.",
        dbError,
        context.request,
        { userId: user.id }
      );
    });

    it("should return FREE_USER for a user with the 'free' role", async () => {
      const user = createMockUser({ role: "free" });
      const session = createMockSession({ user });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { ...user },
        error: null,
      });
      const context = createMockApiContext(mockSupabase);

      const result = await getUserState(context);

      expect(result.state).toBe(UserState.FREE_USER);
      expect(result.user).toEqual(user);
      expect(result.session).toEqual(session);
    });

    it("should return PREMIUM_USER for a user with the 'premium' role", async () => {
      const user = createMockUser({ role: "premium" });
      const session = createMockSession({ user });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { ...user },
        error: null,
      });
      const context = createMockApiContext(mockSupabase);

      const result = await getUserState(context);

      expect(result.state).toBe(UserState.PREMIUM_USER);
      expect(result.user).toEqual(user);
      expect(result.session).toEqual(session);
    });

    it("should return LICENSE_USER for a user with the 'license' role", async () => {
      const user = createMockUser({ role: "license" });
      const session = createMockSession({ user });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { ...user },
        error: null,
      });
      const context = createMockApiContext(mockSupabase);

      const result = await getUserState(context);

      expect(result.state).toBe(UserState.LICENSE_USER);
      expect(result.user).toEqual(user);
      expect(result.session).toEqual(session);
    });
  });

  describe("requireAuthState", () => {
    it("should grant access and call the handler if user state is allowed", async () => {
      const user = createMockUser({ role: "premium" });
      const session = createMockSession({ user });
      const context = createMockApiContext(mockSupabase);
      const handler = vi.fn().mockResolvedValue(new Response("Success"));

      // Mock getUserState to return a premium user
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { ...user },
        error: null,
      });

      const protectedHandler = requireAuthState(
        [UserState.PREMIUM_USER],
        handler
      );
      const response = await protectedHandler(context);

      expect(handler).toHaveBeenCalledWith({ user, session, context });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Success");
      expect(createErrorResponse).not.toHaveBeenCalled();
    });

    it("should deny access and return 403 if user state is not allowed", async () => {
      const user = createMockUser({ role: "free" });
      const session = createMockSession({ user });
      const context = createMockApiContext(mockSupabase);
      const handler = vi.fn();
      const mockErrorResponse = new Response("Forbidden", { status: 403 });
      vi.mocked(createErrorResponse).mockReturnValue(mockErrorResponse);

      // Mock getUserState to return a free user
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { ...user },
        error: null,
      });

      const protectedHandler = requireAuthState(
        [UserState.PREMIUM_USER],
        handler
      );
      const response = await protectedHandler(context);

      expect(handler).not.toHaveBeenCalled();
      expect(createErrorResponse).toHaveBeenCalledWith(
        403,
        "Forbidden: Access denied.",
        "INSUFFICIENT_PERMISSIONS"
      );
      expect(response).toBe(mockErrorResponse);
    });

    it("should deny access if user is anonymous and only authenticated users are allowed", async () => {
      const context = createMockApiContext(mockSupabase);
      const handler = vi.fn();
      const mockErrorResponse = new Response("Forbidden", { status: 403 });
      vi.mocked(createErrorResponse).mockReturnValue(mockErrorResponse);

      // Mock getUserState to return an anonymous user
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const protectedHandler = requireAuthState(
        [UserState.FREE_USER, UserState.PREMIUM_USER],
        handler
      );
      const response = await protectedHandler(context);

      expect(handler).not.toHaveBeenCalled();
      expect(createErrorResponse).toHaveBeenCalledWith(
        403,
        "Forbidden: Access denied.",
        "INSUFFICIENT_PERMISSIONS"
      );
      expect(response).toBe(mockErrorResponse);
    });
  });
});
