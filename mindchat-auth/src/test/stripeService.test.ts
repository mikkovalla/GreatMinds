/**
 * Stripe Service Tests
 *
 * Comprehensive tests for Stripe business logic functions.
 * Tests checkout session creation, portal sessions, subscription sync,
 * and webhook validation following project testing guidelines.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockStripeCheckoutSession,
  createMockStripePortalSession,
  createMockStripeSubscription,
  createMockStripeCustomer,
  createMockWebhookEvent,
  createMockUserProfileWithStripe,
  createMockCheckoutParams,
  createMockPortalParams,
  createMockSupabaseResponse,
  createMockWebhookPayload,
  createMockWebhookHeaders,
} from "./testUtils/factories";

// Mock Stripe client at module level
const mockStripeClient = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
  },
  customers: {
    retrieve: vi.fn(),
    create: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

vi.mock("@/lib/stripe", () => ({
  stripe: mockStripeClient,
}));

// Mock Supabase client
const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const updateEqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn(() => ({
  select: selectMock,
  update: updateMock,
  insert: vi.fn(),
}));

const mockSupabaseClient = {
  from: fromMock,
};

vi.mock("@/lib/supabaseClient", () => ({
  supabase: mockSupabaseClient,
}));

// Mock logger module
const mockLogger = {
  log: vi.fn(),
  logError: vi.fn(),
  logRequest: vi.fn(),
  logRequestError: vi.fn(),
};

vi.mock("@/lib/logging", () => ({
  logger: mockLogger,
}));

describe("Stripe Service Functions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("createCheckoutSession", () => {
    describe("successful checkout session creation", () => {
      it("should create checkout session with correct parameters", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();
        const userProfile = createMockUserProfileWithStripe();
        const expectedSession = createMockStripeCheckoutSession({
          customer: userProfile.stripe_customer_id,
        });

        // Mock database response for user profile
        singleMock.mockResolvedValue(createMockSupabaseResponse(userProfile));

        // Mock Stripe checkout session creation
        mockStripeClient.checkout.sessions.create.mockResolvedValue(
          expectedSession
        );

        // Import the function after mocks are set up
        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act
        const result = await createCheckoutSession(checkoutParams);

        // Assert
        expect(result).toEqual(expectedSession);
        expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith({
          mode: "subscription",
          customer: userProfile.stripe_customer_id,
          line_items: [
            {
              price: checkoutParams.priceId,
              quantity: 1,
            },
          ],
          success_url: checkoutParams.successUrl,
          cancel_url: checkoutParams.cancelUrl,
          metadata: {
            userId: checkoutParams.userId,
          },
        });
      });

      it("should create customer if user has no stripe_customer_id", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();
        const userProfileWithoutStripe = createMockUserProfileWithStripe({
          stripe_customer_id: null,
        });
        const newCustomer = createMockStripeCustomer();
        const expectedSession = createMockStripeCheckoutSession({
          customer: newCustomer.id,
        });

        // Mock database responses
        singleMock.mockResolvedValue(
          createMockSupabaseResponse(userProfileWithoutStripe)
        );
        updateEqMock.mockResolvedValue(
          createMockSupabaseResponse({ stripe_customer_id: newCustomer.id })
        );

        // Mock Stripe operations
        mockStripeClient.customers.create.mockResolvedValue(newCustomer);
        mockStripeClient.checkout.sessions.create.mockResolvedValue(
          expectedSession
        );

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act
        const result = await createCheckoutSession(checkoutParams);

        // Assert
        expect(mockStripeClient.customers.create).toHaveBeenCalledWith({
          email: userProfileWithoutStripe.email,
          metadata: {
            userId: checkoutParams.userId,
          },
        });
        expect(updateEqMock).toHaveBeenCalledWith("id", checkoutParams.userId);
        expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: newCustomer.id, // Verify the new customer ID is used
          })
        );
        expect(result).toEqual(expectedSession);
      });

      it("should log successful checkout session creation", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();
        const userProfile = createMockUserProfileWithStripe();
        const expectedSession = createMockStripeCheckoutSession();

        singleMock.mockResolvedValue(createMockSupabaseResponse(userProfile));
        mockStripeClient.checkout.sessions.create.mockResolvedValue(
          expectedSession
        );

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act
        await createCheckoutSession(checkoutParams);

        // Assert
        expect(mockLogger.log).toHaveBeenCalledWith(
          7010,
          "Checkout session created successfully",
          {},
          {
            sessionId: expectedSession.id,
            customerId: userProfile.stripe_customer_id,
            userId: checkoutParams.userId,
          }
        );
      });
    });

    describe("error scenarios", () => {
      it("should handle user not found in database", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();

        singleMock.mockResolvedValue(
          createMockSupabaseResponse(null, { message: "User not found" })
        );

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(checkoutParams)).rejects.toThrow(
          "User not found"
        );
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7110,
          "Failed to retrieve user profile for checkout",
          expect.any(Error)
        );
      });

      it("should handle Stripe checkout session creation failure", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();
        const userProfile = createMockUserProfileWithStripe();
        const stripeError = new Error("Invalid price ID");

        singleMock.mockResolvedValue(createMockSupabaseResponse(userProfile));
        mockStripeClient.checkout.sessions.create.mockRejectedValue(
          stripeError
        );

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(checkoutParams)).rejects.toThrow(
          "Invalid price ID"
        );
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7111,
          "Failed to create checkout session",
          stripeError
        );
      });

      it("should handle customer creation failure", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();
        const userProfileWithoutStripe = createMockUserProfileWithStripe({
          stripe_customer_id: null,
        });
        const customerError = new Error("Invalid email");

        singleMock.mockResolvedValue(
          createMockSupabaseResponse(userProfileWithoutStripe)
        );
        mockStripeClient.customers.create.mockRejectedValue(customerError);

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(checkoutParams)).rejects.toThrow(
          "Invalid email"
        );
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7112,
          "Failed to create Stripe customer",
          customerError
        );
      });

      it("should handle database update failure when saving customer ID", async () => {
        // Arrange
        const checkoutParams = createMockCheckoutParams();
        const userProfileWithoutStripe = createMockUserProfileWithStripe({
          stripe_customer_id: null,
        });
        const newCustomer = createMockStripeCustomer();
        const dbError = new Error("Database connection failed");

        singleMock.mockResolvedValue(
          createMockSupabaseResponse(userProfileWithoutStripe)
        );
        mockStripeClient.customers.create.mockResolvedValue(newCustomer);
        updateEqMock.mockResolvedValue(
          createMockSupabaseResponse(null, dbError)
        );

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(checkoutParams)).rejects.toThrow(
          "Database connection failed"
        );
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7113,
          "Failed to save customer ID to database",
          dbError
        );
      });
    });

    describe("input validation", () => {
      it("should validate required userId parameter", async () => {
        // Arrange
        const invalidParams = createMockCheckoutParams({ userId: "" });

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(invalidParams)).rejects.toThrow(
          "User ID is required"
        );
      });

      it("should validate required successUrl parameter", async () => {
        // Arrange
        const invalidParams = createMockCheckoutParams({ successUrl: "" });

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(invalidParams)).rejects.toThrow(
          "Success URL is required"
        );
      });

      it("should validate required cancelUrl parameter", async () => {
        // Arrange
        const invalidParams = createMockCheckoutParams({ cancelUrl: "" });

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(invalidParams)).rejects.toThrow(
          "Cancel URL is required"
        );
      });

      it("should validate required priceId parameter", async () => {
        // Arrange
        const invalidParams = createMockCheckoutParams({ priceId: "" });

        const { createCheckoutSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createCheckoutSession(invalidParams)).rejects.toThrow(
          "Price ID is required"
        );
      });
    });
  });

  describe("createPortalSession", () => {
    describe("successful portal session creation", () => {
      it("should create portal session with correct parameters", async () => {
        // Arrange
        const portalParams = createMockPortalParams();
        const expectedSession = createMockStripePortalSession({
          customer: portalParams.customerId,
          return_url: portalParams.returnUrl,
        });

        mockStripeClient.billingPortal.sessions.create.mockResolvedValue(
          expectedSession
        );

        const { createPortalSession } = await import("@/lib/stripeService");

        // Act
        const result = await createPortalSession(portalParams);

        // Assert
        expect(result).toEqual(expectedSession);
        expect(
          mockStripeClient.billingPortal.sessions.create
        ).toHaveBeenCalledWith({
          customer: portalParams.customerId,
          return_url: portalParams.returnUrl,
        });
      });

      it("should log successful portal session creation", async () => {
        // Arrange
        const portalParams = createMockPortalParams();
        const expectedSession = createMockStripePortalSession();

        mockStripeClient.billingPortal.sessions.create.mockResolvedValue(
          expectedSession
        );

        const { createPortalSession } = await import("@/lib/stripeService");

        // Act
        await createPortalSession(portalParams);

        // Assert
        expect(mockLogger.log).toHaveBeenCalledWith(
          7020,
          "Portal session created successfully",
          {},
          {
            sessionId: expectedSession.id,
            customerId: portalParams.customerId,
          }
        );
      });
    });

    describe("error scenarios", () => {
      it("should handle Stripe portal session creation failure", async () => {
        // Arrange
        const portalParams = createMockPortalParams();
        const stripeError = new Error("Customer not found");

        mockStripeClient.billingPortal.sessions.create.mockRejectedValue(
          stripeError
        );

        const { createPortalSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createPortalSession(portalParams)).rejects.toThrow(
          "Customer not found"
        );
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7120,
          "Failed to create portal session",
          stripeError
        );
      });
    });

    describe("input validation", () => {
      it("should validate required customerId parameter", async () => {
        // Arrange
        const invalidParams = createMockPortalParams({ customerId: "" });

        const { createPortalSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createPortalSession(invalidParams)).rejects.toThrow(
          "Customer ID is required"
        );
      });

      it("should validate required returnUrl parameter", async () => {
        // Arrange
        const invalidParams = createMockPortalParams({ returnUrl: "" });

        const { createPortalSession } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(createPortalSession(invalidParams)).rejects.toThrow(
          "Return URL is required"
        );
      });
    });
  });

  describe("syncSubscriptionStatus", () => {
    describe("successful subscription sync", () => {
      it("should sync active subscription status to database", async () => {
        // Arrange
        const subscription = createMockStripeSubscription({ status: "active" });
        const userId = "user-test123456789";

        mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);
        updateEqMock.mockResolvedValue(
          createMockSupabaseResponse({ subscription_status: "active" })
        );

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act
        const result = await syncSubscriptionStatus(subscription.id, userId);

        // Assert
        expect(result).toEqual(subscription);
        expect(updateEqMock).toHaveBeenCalledWith("id", userId);
        expect(mockLogger.log).toHaveBeenCalledWith(
          7030,
          "Subscription status synced successfully",
          {},
          {
            subscriptionId: subscription.id,
            userId,
            status: "active",
          }
        );
      });

      it("should handle canceled subscription sync", async () => {
        // Arrange
        const subscription = createMockStripeSubscription({
          status: "canceled",
          canceled_at: Math.floor(Date.now() / 1000),
        });
        const userId = "user-test123456789";

        mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);
        mockSupabaseClient
          .from()
          .update()
          .eq.mockResolvedValue(
            createMockSupabaseResponse({ subscription_status: "canceled" })
          );

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act
        await syncSubscriptionStatus(subscription.id, userId);

        // Assert
        expect(mockLogger.log).toHaveBeenCalledWith(
          7030,
          "Subscription status synced successfully",
          {},
          {
            subscriptionId: subscription.id,
            userId,
            status: "canceled",
          }
        );
      });

      it("should handle trial subscription sync", async () => {
        // Arrange
        const subscription = createMockStripeSubscription({
          status: "trialing",
          trial_end: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        });
        const userId = "user-test123456789";

        mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);
        mockSupabaseClient
          .from()
          .update()
          .eq.mockResolvedValue(
            createMockSupabaseResponse({ subscription_status: "trialing" })
          );

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act
        await syncSubscriptionStatus(subscription.id, userId);

        // Assert
        expect(mockLogger.log).toHaveBeenCalledWith(
          7030,
          "Subscription status synced successfully",
          {},
          {
            subscriptionId: subscription.id,
            userId,
            status: "trialing",
          }
        );
      });
    });

    describe("error scenarios", () => {
      it("should handle subscription not found in Stripe", async () => {
        // Arrange
        const subscriptionId = "sub_nonexistent";
        const userId = "user-test123456789";
        const stripeError = new Error("No such subscription");

        mockStripeClient.subscriptions.retrieve.mockRejectedValue(stripeError);

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(
          syncSubscriptionStatus(subscriptionId, userId)
        ).rejects.toThrow("No such subscription");
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7130,
          "Failed to retrieve subscription from Stripe",
          stripeError
        );
      });

      it("should handle database update failure", async () => {
        // Arrange
        const subscription = createMockStripeSubscription();
        const userId = "user-test123456789";
        const dbError = new Error("Database connection failed");

        mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);
        mockSupabaseClient
          .from()
          .update()
          .eq.mockResolvedValue(createMockSupabaseResponse(null, dbError));

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(
          syncSubscriptionStatus(subscription.id, userId)
        ).rejects.toThrow("Database connection failed");
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7131,
          "Failed to update subscription status in database",
          dbError
        );
      });
    });

    describe("input validation", () => {
      it("should validate required subscriptionId parameter", async () => {
        // Arrange
        const userId = "user-test123456789";

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(syncSubscriptionStatus("", userId)).rejects.toThrow(
          "Subscription ID is required"
        );
      });

      it("should validate required userId parameter", async () => {
        // Arrange
        const subscriptionId = "sub_test123456789";

        const { syncSubscriptionStatus } = await import("@/lib/stripeService");

        // Act & Assert
        await expect(
          syncSubscriptionStatus(subscriptionId, "")
        ).rejects.toThrow("User ID is required");
      });
    });
  });

  describe("validateWebhookSignature", () => {
    describe("successful webhook validation", () => {
      it("should validate correct webhook signature and return event", async () => {
        // Arrange
        const webhookEvent = createMockWebhookEvent();
        const payload = createMockWebhookPayload(webhookEvent);
        const headers = createMockWebhookHeaders();
        const webhookSecret = "whsec_test123456789";

        mockStripeClient.webhooks.constructEvent.mockReturnValue(webhookEvent);

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        // Act
        const result = await validateWebhookSignature(
          payload,
          headers["stripe-signature"],
          webhookSecret
        );

        // Assert
        expect(result).toEqual(webhookEvent);
        expect(mockStripeClient.webhooks.constructEvent).toHaveBeenCalledWith(
          payload,
          headers["stripe-signature"],
          webhookSecret
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          7040,
          "Webhook signature validated successfully",
          {},
          {
            eventId: webhookEvent.id,
            eventType: webhookEvent.type,
          }
        );
      });

      it("should handle different webhook event types", async () => {
        // Arrange
        const eventTypes = [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.payment_succeeded",
          "invoice.payment_failed",
        ];

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        for (const eventType of eventTypes) {
          // Arrange
          const webhookEvent = createMockWebhookEvent(eventType);
          const payload = createMockWebhookPayload(webhookEvent);
          const headers = createMockWebhookHeaders();
          const webhookSecret = "whsec_test123456789";

          mockStripeClient.webhooks.constructEvent.mockReturnValue(
            webhookEvent
          );

          // Act
          const result = await validateWebhookSignature(
            payload,
            headers["stripe-signature"],
            webhookSecret
          );

          // Assert
          expect(result.type).toBe(eventType);
        }
      });
    });

    describe("security validation failures", () => {
      it("should reject invalid webhook signature", async () => {
        // Arrange
        const payload = createMockWebhookPayload();
        const invalidSignature = "invalid_signature";
        const webhookSecret = "whsec_test123456789";
        const signatureError = new Error("Invalid signature");

        mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
          throw signatureError;
        });

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        // Act & Assert
        await expect(
          validateWebhookSignature(payload, invalidSignature, webhookSecret)
        ).rejects.toThrow("Invalid signature");
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7140,
          "Webhook signature validation failed",
          signatureError
        );
      });

      it("should reject missing webhook signature", async () => {
        // Arrange
        const payload = createMockWebhookPayload();
        const webhookSecret = "whsec_test123456789";

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        // Act & Assert
        await expect(
          validateWebhookSignature(payload, "", webhookSecret)
        ).rejects.toThrow("Webhook signature is required");
      });

      it("should reject empty webhook payload", async () => {
        // Arrange
        const headers = createMockWebhookHeaders();
        const webhookSecret = "whsec_test123456789";

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        // Act & Assert
        await expect(
          validateWebhookSignature(
            "",
            headers["stripe-signature"],
            webhookSecret
          )
        ).rejects.toThrow("Webhook payload is required");
      });

      it("should reject missing webhook secret", async () => {
        // Arrange
        const payload = createMockWebhookPayload();
        const headers = createMockWebhookHeaders();

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        // Act & Assert
        await expect(
          validateWebhookSignature(payload, headers["stripe-signature"], "")
        ).rejects.toThrow("Webhook secret is required");
      });

      it("should handle timestamp validation failure", async () => {
        // Arrange
        const payload = createMockWebhookPayload();
        const headers = createMockWebhookHeaders();
        const webhookSecret = "whsec_test123456789";
        const timestampError = new Error("Timestamp outside tolerance");

        mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
          throw timestampError;
        });

        const { validateWebhookSignature } = await import(
          "@/lib/stripeService"
        );

        // Act & Assert
        await expect(
          validateWebhookSignature(
            payload,
            headers["stripe-signature"],
            webhookSecret
          )
        ).rejects.toThrow("Timestamp outside tolerance");
        expect(mockLogger.logError).toHaveBeenCalledWith(
          7140,
          "Webhook signature validation failed",
          timestampError
        );
      });
    });
  });
});
