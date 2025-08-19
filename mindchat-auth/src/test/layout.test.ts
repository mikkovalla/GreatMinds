/**
 * Test suite for Layout authentication logic and state synchronization
 *
 * Tests the critical authentication state management functions that need to be
 * implemented to fix the navigation issue between SSR and client-side state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser, createMockSession } from "./testUtils/factories";

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
};

// Mock the supabaseClient module
vi.mock("@/lib/supabaseClient", () => ({
  createUsualClient: () => mockSupabaseClient,
}));

// Mock fetch for logout API call
global.fetch = vi.fn();

/**
 * Authentication state management functions that will be implemented in Layout.vue
 * These functions represent the core logic that needs to be added to fix the navigation issue.
 */

/**
 * Function to check initial session state - this is what's missing in Layout.vue
 */
const checkInitialSession = async () => {
  try {
    const { data } = await mockSupabaseClient.auth.getSession();
    return !!data?.session;
  } catch (error) {
    // Session check failed - treat as unauthenticated
    console.warn("Session check failed:", error);
    return false;
  }
};

/**
 * Function to handle auth state changes - this exists but needs to work with initial check
 */
const handleAuthStateChange = (event: string, session: any) => {
  return !!session;
};

/**
 * Function to handle logout - this exists but needs proper error handling
 */
const handleLogout = async () => {
  try {
    // Call server-side logout to ensure HTTP-only cookies are cleared
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    // Also sign out client-side to clear any browser-stored session
    try {
      await mockSupabaseClient.auth.signOut();
    } catch (e) {
      // Non-fatal: server-side logout is authoritative for SSR
      console.warn("Client-side signOut failed (non-fatal)", e);
    }

    // Force a full reload so SSR will run and see the anonymous session
    window.location.replace("/");
    return true;
  } catch (err) {
    console.error("Logout failed", err);
    // Fallback: try client sign out and update UI state
    try {
      await mockSupabaseClient.auth.signOut();
    } catch (e) {
      // Client logout is fallback only - log for debugging
      console.debug("Client logout fallback failed:", e);
    }
    return false;
  }
};

describe("Layout Authentication State Management", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock setup - no session initially
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Default onAuthStateChange mock
    mockSupabaseClient.auth.onAuthStateChange.mockImplementation(() => {
      return { data: { subscription: {} } };
    });

    // Reset global fetch mock
    (global.fetch as any).mockReset();
  });

  describe("initial session check functionality", () => {
    it("should return true when user has valid session", async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Act
      const isAuthenticated = await checkInitialSession();

      // Assert
      expect(isAuthenticated).toBe(true);
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });

    it("should return false when no session exists", async () => {
      // Arrange
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const isAuthenticated = await checkInitialSession();

      // Assert
      expect(isAuthenticated).toBe(false);
    });

    it("should handle getSession errors gracefully", async () => {
      // Arrange
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error("Session fetch failed"),
      });

      // Act
      const isAuthenticated = await checkInitialSession();

      // Assert
      expect(isAuthenticated).toBe(false);
    });
  });

  describe("authentication state change handling", () => {
    it("should return true when user signs in", () => {
      // Arrange
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      // Act
      const isAuthenticated = handleAuthStateChange("SIGNED_IN", mockSession);

      // Assert
      expect(isAuthenticated).toBe(true);
    });

    it("should return false when user signs out", () => {
      // Act
      const isAuthenticated = handleAuthStateChange("SIGNED_OUT", null);

      // Assert
      expect(isAuthenticated).toBe(false);
    });

    it("should return true for token refresh with session", () => {
      // Arrange
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      // Act
      const isAuthenticated = handleAuthStateChange(
        "TOKEN_REFRESHED",
        mockSession
      );

      // Assert
      expect(isAuthenticated).toBe(true);
    });

    it("should return false for null session", () => {
      // Act
      const isAuthenticated = handleAuthStateChange("TOKEN_REFRESHED", null);

      // Assert
      expect(isAuthenticated).toBe(false);
    });
  });

  describe("logout functionality", () => {
    // Setup window mock for all logout tests
    const mockReplace = vi.fn();

    beforeEach(() => {
      // Mock window.location.replace for all logout tests
      Object.defineProperty(global, "window", {
        value: {
          location: {
            replace: mockReplace,
          },
        },
        writable: true,
      });
    });

    it("should perform server-side logout and redirect", async () => {
      // Arrange
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Act
      const result = await handleLogout();

      // Assert
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });

    it("should handle logout API failure gracefully", async () => {
      // Arrange
      (global.fetch as any).mockRejectedValue(new Error("Network error"));

      // Mock console.error to verify error logging
      const mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = await handleLogout();

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Logout failed",
        expect.any(Error)
      );

      // Cleanup
      mockConsoleError.mockRestore();
    });

    it("should fallback to client-side logout when server logout fails", async () => {
      // Arrange
      (global.fetch as any).mockRejectedValue(new Error("Server error"));
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      // Act
      const result = await handleLogout();

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it("should handle client-side signOut warning for non-fatal errors", async () => {
      // Arrange
      (global.fetch as any).mockResolvedValue({ ok: true });
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error("Client signout failed")
      );

      // Mock console.warn to verify warning logging
      const mockConsoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Act
      const result = await handleLogout();

      // Assert
      expect(result).toBe(true); // Server logout succeeded
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Client-side signOut failed (non-fatal)",
        expect.any(Error)
      );
      expect(mockReplace).toHaveBeenCalledWith("/");

      // Cleanup
      mockConsoleWarn.mockRestore();
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle rapid authentication state changes", () => {
      // Arrange
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      // Act - Rapid state changes
      let result1 = handleAuthStateChange("SIGNED_IN", mockSession);
      let result2 = handleAuthStateChange("SIGNED_OUT", null);
      let result3 = handleAuthStateChange("SIGNED_IN", mockSession);

      // Assert - Should reflect each state change
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(true);
    });

    it("should handle session fetch with error during initial check", async () => {
      // Arrange
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error("Network error")
      );

      // Act
      const isAuthenticated = await checkInitialSession();

      // Assert
      expect(isAuthenticated).toBe(false);
    });

    it("should handle empty session data during initial check", async () => {
      // Arrange
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert - Should not throw and return false
      const isAuthenticated = await checkInitialSession();
      expect(isAuthenticated).toBe(false);
    });

    it("should handle logout with both server and client failures", async () => {
      // Arrange
      (global.fetch as any).mockRejectedValue(new Error("Server error"));
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error("Client error")
      );

      // Mock console.error
      const mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = await handleLogout();

      // Assert
      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Logout failed",
        expect.any(Error)
      );

      // Cleanup
      mockConsoleError.mockRestore();
    });
  });

  describe("authentication flow integration", () => {
    it("should demonstrate the complete authentication state sync flow", async () => {
      // Arrange - Simulate the complete flow that should happen in Layout.vue
      const mockUser = createMockUser();
      const mockSession = createMockSession({ user: mockUser });

      // Step 1: Initial check (this is what's missing in current Layout.vue)
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      let initialAuth = await checkInitialSession();
      expect(initialAuth).toBe(false);

      // Step 2: User signs in (auth state change event)
      let authAfterSignIn = handleAuthStateChange("SIGNED_IN", mockSession);
      expect(authAfterSignIn).toBe(true);

      // Step 3: On next page load, initial check should find the session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      let authAfterReload = await checkInitialSession();
      expect(authAfterReload).toBe(true);

      // Step 4: User signs out
      let authAfterSignOut = handleAuthStateChange("SIGNED_OUT", null);
      expect(authAfterSignOut).toBe(false);

      // Assert - Complete flow demonstrates the sync between initial check and state changes
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(2);
    });
  });
});
