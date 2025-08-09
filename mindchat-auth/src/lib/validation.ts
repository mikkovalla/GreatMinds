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
 * User registration input validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
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
 * Validates form data from request and extracts email/password
 */
export const validateFormData = (
  formData: FormData
): { email: string; password: string } => {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("Email and password must be provided as strings");
  }

  return {
    email: sanitizeInput(email),
    password: sanitizeInput(password),
  };
};
