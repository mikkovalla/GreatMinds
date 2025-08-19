import { z } from "zod";

/**
 * Password validation schema with security requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    "Password must contain at least one special character"
  );

/**
 * Email validation schema with proper format checking
 */
const emailSchema = z
  .email("Please provide a valid email address")
  .max(254, "Email address is too long")
  .toLowerCase();

/**
 * User registration input validation schema with password confirmation
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * User sign-in input validation schema
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Environment variables validation schema
 */
export const envSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string("Invalid Supabase URL"),
  PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase anonymous key is required"),
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "Stripe secret key is required")
    .regex(/^sk_/, "Stripe secret key must start with 'sk_'"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "Stripe webhook secret is required")
    .regex(/^whsec_/, "Stripe webhook secret must start with 'whsec_'"),
});

/**
 * Type definitions for validated inputs
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates environment variables at runtime
 */
export const validateEnvironment = (): ValidatedEnv => {
  const result = envSchema.safeParse({
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    STRIPE_SECRET_KEY: import.meta.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: import.meta.env.STRIPE_WEBHOOK_SECRET,
  });

  if (!result.success) {
    const prettyError = z.prettifyError(result.error);
    throw new Error(`Environment validation failed: ${prettyError}`);
  }

  return result.data;
};

/**
 * Validates registration input with detailed error messages
 */
export const validateRegistrationInput = (input: unknown): RegisterInput => {
  const result = registerSchema.safeParse(input);

  if (!result.success) {
    const prettyError = z.prettifyError(result.error);
    throw new Error(`Validation failed: ${prettyError}`);
  }

  return result.data;
};

/**
 * Validates sign-in input with detailed error messages
 */
export const validateSignInInput = (input: unknown): SignInInput => {
  const result = signInSchema.safeParse(input);

  if (!result.success) {
    const prettyError = z.prettifyError(result.error);
    throw new Error(`Validation failed: ${prettyError}`);
  }

  return result.data;
};

/**
 * Sanitizes user input by trimming whitespace and normalizing
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().normalize("NFC");
};

/**
 * Validates form data from request and extracts email/password/confirmPassword
 */
export const validateFormData = (
  formData: FormData
): { email: string; password: string; confirmPassword?: string } => {
  try {
    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");
    const confirmPasswordRaw = formData.get("confirmPassword");

    if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
      throw new Error("Email and password must be provided as strings");
    }

    const result: {
      email: string;
      password: string;
      confirmPassword?: string;
    } = {
      email: sanitizeInput(emailRaw),
      password: passwordRaw, // do not trim or alter passwords
    };

    if (confirmPasswordRaw && typeof confirmPasswordRaw === "string") {
      result.confirmPassword = confirmPasswordRaw;
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid form data: ${error.message}`);
    }
    throw new Error("Invalid form data");
  }
};

/**
 * Validates JSON body
 */
export const validateJsonBody = (
  body: any
): { email: string; password: string; confirmPassword?: string } => {
  try {
    const email = body.email;
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (typeof email !== "string" || typeof password !== "string") {
      throw new Error("Email and password must be provided as strings");
    }

    const result: {
      email: string;
      password: string;
      confirmPassword?: string;
    } = {
      email: sanitizeInput(email),
      password, // Passwords should not be trimmed or altered
    };

    if (confirmPassword && typeof confirmPassword === "string") {
      result.confirmPassword = confirmPassword;
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid JSON body: ${error.message}`);
    }
    throw new Error("Invalid JSON body");
  }
};
