/**
 * Stripe Service - Core Business Logic
 *
 * Provides Stripe integration functions for subscription management.
 * Handles checkout sessions, portal sessions, subscription sync, and webhook validation.
 * Follows project security, logging, and error handling patterns.
 */

import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logging";
import { StripeEvent } from "@/lib/loggingConstants";

/**
 * Parameters for creating a checkout session
 */
export type CheckoutParams = {
  userId: string;
  successUrl: string;
  cancelUrl: string;
  priceId: string;
};

/**
 * Parameters for creating a portal session
 */
export type PortalParams = {
  customerId: string;
  returnUrl: string;
};

/**
 * Creates a Stripe checkout session for Premium subscription (€20/month)
 * Handles customer creation if user doesn't have a Stripe customer ID
 *
 * @param params - Checkout session parameters
 * @returns Stripe checkout session object
 * @throws Error if validation fails or Stripe/database operations fail
 */
export const createCheckoutSession = async (
  params: CheckoutParams,
  supabaseClient?: any
) => {
  // Input validation
  if (!params.userId || params.userId.trim() === "") {
    throw new Error("User ID is required");
  }
  if (!params.successUrl || params.successUrl.trim() === "") {
    throw new Error("Success URL is required");
  }
  if (!params.cancelUrl || params.cancelUrl.trim() === "") {
    throw new Error("Cancel URL is required");
  }
  if (!params.priceId || params.priceId.trim() === "") {
    throw new Error("Price ID is required");
  }

  try {
    // Require an explicit Supabase client to avoid implicit global/module fallbacks
    if (!supabaseClient) {
      throw new Error(
        "supabaseClient is required. Pass an explicit Supabase client to stripeService functions."
      );
    }
    const sb = supabaseClient;
    const userProfileResponse = await sb
      .from("profiles")
      .select("*")
      .eq("id", params.userId)
      .single();

    // Handle the case where mocking returns the response directly
    const userProfile = userProfileResponse?.data || userProfileResponse;
    const profileError = userProfileResponse?.error;

    if (profileError || !userProfile) {
      logger.logError(
        StripeEvent.USER_PROFILE_RETRIEVAL_FAILED,
        "Failed to retrieve user profile for checkout",
        new Error(profileError?.message || "User not found")
      );
      throw new Error(profileError?.message || "User not found");
    }

    let customerId = userProfile.stripe_customer_id;

    // Create Stripe customer if user doesn't have one
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: userProfile.email,
          metadata: {
            userId: params.userId,
          },
        });
        customerId = customer.id;

        // Save customer ID to database
        const updateResponse = await sb
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", params.userId);

        // Handle the case where mocking returns the response directly
        const updateError = updateResponse?.error;

        if (updateError) {
          logger.logError(
            StripeEvent.DATABASE_UPDATE_FAILED,
            "Failed to save customer ID to database",
            new Error(updateError.message)
          );
          throw new Error(updateError.message);
        }
      } catch (error) {
        logger.logError(
          StripeEvent.CUSTOMER_CREATION_ERROR,
          "Failed to create Stripe customer",
          error as Error
        );
        throw error;
      }
    }

    // Create checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          userId: params.userId,
        },
      });

      logger.log(
        StripeEvent.CHECKOUT_SESSION_CREATED,
        "Checkout session created successfully",
        {},
        {
          sessionId: session.id,
          customerId: customerId,
          userId: params.userId,
        }
      );

      return session;
    } catch (error) {
      logger.logError(
        StripeEvent.CHECKOUT_SESSION_FAILED,
        "Failed to create checkout session",
        error as Error
      );
      throw error;
    }
  } catch (error) {
    // Re-throw any errors that were already logged in specific handlers above
    // Ensures the stack is preserved and linter is satisfied by using the error
    throw error;
  }
};

/**
 * Creates a Stripe billing portal session for subscription management
 *
 * @param params - Portal session parameters
 * @returns Stripe portal session object
 * @throws Error if validation fails or Stripe operations fail
 */
export const createPortalSession = async (params: PortalParams) => {
  // Input validation
  if (!params.customerId || params.customerId.trim() === "") {
    throw new Error("Customer ID is required");
  }
  if (!params.returnUrl || params.returnUrl.trim() === "") {
    throw new Error("Return URL is required");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    logger.log(
      StripeEvent.PORTAL_SESSION_CREATED,
      "Portal session created successfully",
      {},
      {
        sessionId: session.id,
        customerId: params.customerId,
      }
    );

    return session;
  } catch (error) {
    logger.logError(
      StripeEvent.PORTAL_SESSION_FAILED,
      "Failed to create portal session",
      error as Error
    );
    throw error;
  }
};

/**
 * Syncs subscription status from Stripe to local database
 * Updates user's subscription status and related data
 *
 * @param subscriptionId - Stripe subscription ID
 * @param userId - User ID to update
 * @returns Stripe subscription object
 * @throws Error if validation fails or Stripe/database operations fail
 */
export const syncSubscriptionStatus = async (
  subscriptionId: string,
  userId: string,
  supabaseClient?: any
) => {
  // Input validation
  if (!subscriptionId || subscriptionId.trim() === "") {
    throw new Error("Subscription ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  try {
    // Retrieve subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!supabaseClient) {
      throw new Error(
        "supabaseClient is required. Pass an explicit Supabase client to stripeService functions."
      );
    }
    const sb = supabaseClient;

    // Update database with subscription status
    const updateResponse = await sb
      .from("profiles")
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
      })
      .eq("id", userId);

    // Handle the case where mocking returns the response directly
    const updateError = updateResponse?.error;

    if (updateError) {
      logger.logError(
        StripeEvent.SUBSCRIPTION_UPDATE_FAILED,
        "Failed to update subscription status in database",
        new Error(updateError.message)
      );
      throw new Error(updateError.message);
    }

    logger.log(
      StripeEvent.SUBSCRIPTION_SYNCED,
      "Subscription status synced successfully",
      {},
      {
        subscriptionId: subscription.id,
        userId,
        status: subscription.status,
      }
    );

    return subscription;
  } catch (error) {
    // Check if this is a Stripe error (subscription retrieval)
    if (!(error as Error).message?.includes("Failed to update")) {
      logger.logError(
        StripeEvent.SUBSCRIPTION_RETRIEVAL_FAILED,
        "Failed to retrieve subscription from Stripe",
        error as Error
      );
    }
    throw error;
  }
};

/**
 * Validates Stripe webhook signature and returns the event
 * Ensures webhook authenticity and prevents replay attacks
 *
 * @param payload - Raw webhook payload string
 * @param signature - Stripe signature header
 * @param webhookSecret - Webhook endpoint secret
 * @returns Validated Stripe event object
 * @throws Error if validation fails
 */
export const validateWebhookSignature = async (
  payload: string,
  signature: string,
  webhookSecret: string
) => {
  // Input validation
  if (!payload || payload.trim() === "") {
    throw new Error("Webhook payload is required");
  }
  if (!signature || signature.trim() === "") {
    throw new Error("Webhook signature is required");
  }
  if (!webhookSecret || webhookSecret.trim() === "") {
    throw new Error("Webhook secret is required");
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    logger.log(
      StripeEvent.WEBHOOK_VALIDATED,
      "Webhook signature validated successfully",
      {},
      {
        eventId: event.id,
        eventType: event.type,
      }
    );

    return event;
  } catch (error) {
    logger.logError(
      StripeEvent.WEBHOOK_VERIFICATION_FAILED,
      "Webhook signature validation failed",
      error as Error
    );
    throw error;
  }
};
