/**
 * Stripe Integration Tests
 *
 * Tests for Stripe client initialization, configuration, and error handling.
 * Follows the project's testing guidelines with isolation, explicit dependencies,
 * and factory-driven data generation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockStripeConfig,
  createMockEnvironment,
  createMockStripeClient,
} from "./testUtils/factories";

// Mock Stripe SDK at module level
const mockStripeConstructor = vi.fn();
vi.mock("stripe", () => ({
  default: mockStripeConstructor,
}));

// Mock logger module
const mockLogger = {
  log: vi.fn(),
  logError: vi.fn(),
};
vi.mock("@/lib/logging", () => ({
  logger: mockLogger,
}));

describe("Stripe Client Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful initialization", () => {
    it("should create Stripe client with correct configuration", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();
      const expectedConfig = createMockStripeConfig();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      // Mock import.meta.env using vi.stubEnv
      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act
      await import("@/lib/stripe");

      // Assert
      expect(mockStripeConstructor).toHaveBeenCalledWith(
        mockEnv.STRIPE_SECRET_KEY,
        expectedConfig
      );
      expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
    });

    it("should log successful initialization with correct details", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act
      await import("@/lib/stripe");

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        7001,
        "Stripe client initialized successfully",
        {},
        {
          apiVersion: "2025-07-30.basil",
          environment: "development",
        }
      );
    });

    it("should detect production environment correctly", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", true);

      // Act
      await import("@/lib/stripe");

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        7001,
        "Stripe client initialized successfully",
        {},
        {
          apiVersion: "2025-07-30.basil",
          environment: "production",
        }
      );
    });

    it("should configure Stripe client with correct API version", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act
      await import("@/lib/stripe");

      // Assert
      const [, config] = mockStripeConstructor.mock.calls[0];
      expect(config.apiVersion).toBe("2025-07-30.basil");
      expect(config.typescript).toBe(true);
    });

    it("should configure Stripe client with correct app metadata", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act
      await import("@/lib/stripe");

      // Assert
      const [, config] = mockStripeConstructor.mock.calls[0];
      expect(config.appInfo).toEqual({
        name: "mindchat-auth",
        version: "0.0.1",
        url: "https://github.com/mikkovalla/GreatMinds",
      });
    });
  });

  describe("environment validation failures", () => {
    it("should throw error when STRIPE_SECRET_KEY is missing", async () => {
      // Arrange
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("PROD", false);

      // Act & Assert
      await expect(async () => {
        await import("@/lib/stripe");
      }).rejects.toThrow(
        "STRIPE_SECRET_KEY is required but not found in environment variables"
      );
    });

    it("should log error when STRIPE_SECRET_KEY is missing", async () => {
      // Arrange
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("PROD", false);

      // Act
      try {
        await import("@/lib/stripe");
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockLogger.logError).toHaveBeenCalledWith(
        5005,
        "Stripe initialization failed - missing secret key",
        expect.any(Error)
      );
    });

    it("should throw error when STRIPE_SECRET_KEY is empty string", async () => {
      // Arrange
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("PROD", false);

      // Act & Assert
      await expect(async () => {
        await import("@/lib/stripe");
      }).rejects.toThrow(
        "STRIPE_SECRET_KEY is required but not found in environment variables"
      );
    });

    it("should not create Stripe client when validation fails", async () => {
      // Arrange
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("PROD", false);

      // Act
      try {
        await import("@/lib/stripe");
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockStripeConstructor).not.toHaveBeenCalled();
    });
  });

  describe("configuration edge cases", () => {
    it("should handle whitespace-only STRIPE_SECRET_KEY", async () => {
      // Arrange
      vi.stubEnv("STRIPE_SECRET_KEY", "   ");
      vi.stubEnv("PROD", false);

      // Act & Assert
      await expect(async () => {
        await import("@/lib/stripe");
      }).rejects.toThrow(
        "STRIPE_SECRET_KEY is required but not found in environment variables"
      );
    });

    it("should handle environment without PROD flag", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      // Don't set PROD - should default to development

      // Act
      await import("@/lib/stripe");

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        7001,
        "Stripe client initialized successfully",
        {},
        {
          apiVersion: "2025-07-30.basil",
          environment: "development",
        }
      );
    });
  });

  describe("Stripe constructor error handling", () => {
    it("should handle Stripe constructor throwing error", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const constructorError = new Error("Invalid API key");

      mockStripeConstructor.mockImplementation(() => {
        throw constructorError;
      });

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act & Assert
      await expect(async () => {
        await import("@/lib/stripe");
      }).rejects.toThrow("Invalid API key");
    });

    it("should propagate Stripe SDK initialization errors", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      mockStripeConstructor.mockImplementation(() => {
        throw new Error("Network connection failed");
      });

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act & Assert
      await expect(async () => {
        await import("@/lib/stripe");
      }).rejects.toThrow("Network connection failed");
      expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
    });
  });

  describe("logging integration", () => {
    it("should call logger exactly once on successful initialization", async () => {
      // Arrange
      const mockEnv = createMockEnvironment();
      const mockStripeClient = createMockStripeClient();

      mockStripeConstructor.mockReturnValue(mockStripeClient);

      vi.stubEnv("STRIPE_SECRET_KEY", mockEnv.STRIPE_SECRET_KEY);
      vi.stubEnv("PROD", false);

      // Act
      await import("@/lib/stripe");

      // Assert
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logError).not.toHaveBeenCalled();
    });

    it("should call logger with correct error code on failure", async () => {
      // Arrange
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("PROD", false);

      // Act
      try {
        await import("@/lib/stripe");
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockLogger.logError).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).not.toHaveBeenCalled();

      const [errorCode] = mockLogger.logError.mock.calls[0];
      expect(errorCode).toBe(5005);
    });
  });
});
