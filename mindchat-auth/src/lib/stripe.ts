import Stripe from "stripe";
import { logger } from "@/lib/logging";

/**
 * Stripe client configuration and initialization
 *
 * Initializes the Stripe SDK with proper error handling and logging.
 * Uses environment variables for secure API key management.
 */

if (!import.meta.env.STRIPE_SECRET_KEY?.trim()) {
  logger.logError(
    5005,
    "Stripe initialization failed - missing secret key",
    new Error("STRIPE_SECRET_KEY environment variable is not set")
  );
  throw new Error(
    "STRIPE_SECRET_KEY is required but not found in environment variables"
  );
}

/**
 * Stripe API client instance
 *
 * Configured with:
 * - Latest stable API version
 * - TypeScript support enabled
 * - Application identification for Stripe logs
 */
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
  typescript: true,
  appInfo: {
    name: "mindchat-auth",
    version: "0.0.1",
    url: "https://github.com/mikkovalla/GreatMinds",
  },
});

logger.log(
  7001,
  "Stripe client initialized successfully",
  {},
  {
    apiVersion: "2025-07-30.basil",
    environment: import.meta.env.PROD ? "production" : "development",
  }
);
