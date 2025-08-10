import { createRequestLogger } from "./logging";
import type { ErrorCode } from "./loggingConstants";

/**
 * Rate limiting configuration constants
 */
const RATE_LIMITS = {
  REGISTRATION: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  LOGIN: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  PASSWORD_RESET: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
} as const;

/**
 * Rate limit entry structure
 */
type RateLimitEntry = {
  count: number;
  resetTime: number;
};

/**
 * Rate limit operation types
 */
type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * In-memory rate limit storage
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup expired rate limit entries every 15 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Extracts client IP address from request
 */
export const getClientIP = (request: Request): string => {
  // Check for forwarded IP in common headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection remote address (might not be available in all environments)
  return request.headers.get("cf-connecting-ip") || "unknown";
};

/**
 * Generates rate limit key based on type and identifier
 */
const getRateLimitKey = (type: RateLimitType, identifier: string): string => {
  return `${type}:${identifier}`;
};

/**
 * Checks if request is rate limited
 */
export const checkRateLimit = (
  type: RateLimitType,
  identifier: string
): { isLimited: boolean; remainingAttempts: number; resetTime: number } => {
  const key = getRateLimitKey(type, identifier);
  const limit = RATE_LIMITS[type];
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // No entry or expired entry - create new one
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + limit.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      isLimited: false,
      remainingAttempts: limit.maxAttempts - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Update existing entry
  entry.count += 1;

  const isLimited = entry.count > limit.maxAttempts;
  const remainingAttempts = Math.max(0, limit.maxAttempts - entry.count);

  return {
    isLimited,
    remainingAttempts,
    resetTime: entry.resetTime,
  };
};

/**
 * Security headers configuration
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for Astro
      "style-src 'self' 'unsafe-inline'", // Allow inline styles
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co", // Allow Supabase connections
      "frame-ancestors 'none'",
    ].join("; "),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
    ].join(", "),
  };
};

/**
 * Secure cookie configuration
 */
export const getCookieOptions = (isProduction: boolean = false) => {
  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
};

/**
 * Standardized error response structure
 */
type ErrorResponse = {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
};

/**
 * Creates standardized error response
 */
export const createErrorResponse = (
  statusCode: number,
  error: string,
  message: string,
  additionalHeaders: Record<string, string> = {}
): Response => {
  const errorResponse: ErrorResponse = {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  const headers = {
    "Content-Type": "application/json",
    ...getSecurityHeaders(),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers,
  });
};

/**
 * Creates success response with security headers
 */
export const createSuccessResponse = (
  data: unknown,
  statusCode: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response => {
  const headers = {
    "Content-Type": "application/json",
    ...getSecurityHeaders(),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers,
  });
};

/**
 * Validates user agent string
 */
export const isValidUserAgent = (userAgent: string | null): boolean => {
  if (!userAgent) return false;

  // Basic user agent validation
  const minLength = 10;
  const maxLength = 512;

  return userAgent.length >= minLength && userAgent.length <= maxLength;
};

/**
 * Validates request size
 */
export const validateRequestSize = (request: Request): boolean => {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return true;

  const size = parseInt(contentLength, 10);
  const maxSize = 1024 * 1024; // 1MB limit

  return size <= maxSize;
};

/**
 * Sanitizes and validates request data
 */
export const validateRequest = (
  request: Request
): { isValid: boolean; error?: string } => {
  if (!validateRequestSize(request)) {
    return { isValid: false, error: "Request size too large" };
  }

  // Check user agent
  const userAgent = request.headers.get("user-agent");
  if (!isValidUserAgent(userAgent)) {
    return { isValid: false, error: "Invalid user agent" };
  }

  // Check content type for POST requests
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/x-www-form-urlencoded")) {
      return { isValid: false, error: "Invalid content type" };
    }
  }

  return { isValid: true };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const applyRateLimit = async (
  request: Request,
  type: RateLimitType,
  identifier?: string
): Promise<{
  allowed: boolean;
  response?: Response;
  rateLimitHeaders: Record<string, string>;
  remainingAttempts: number;
}> => {
  const clientIP = getClientIP(request);
  const rateLimitId = identifier || clientIP;

  const { isLimited, remainingAttempts, resetTime } = checkRateLimit(
    type,
    rateLimitId
  );

  const resetDate = new Date(resetTime);
  const rateLimitHeaders = {
    "X-RateLimit-Limit": RATE_LIMITS[type].maxAttempts.toString(),
    "X-RateLimit-Remaining": remainingAttempts.toString(),
    "X-RateLimit-Reset": resetDate.toISOString(),
  };

  if (isLimited) {
    const response = createErrorResponse(
      429,
      "Too Many Requests",
      "Rate limit exceeded. Please try again later.",
      {
        ...rateLimitHeaders,
        "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
      }
    );

    return {
      allowed: false,
      response,
      rateLimitHeaders,
      remainingAttempts,
    };
  }

  return {
    allowed: true,
    rateLimitHeaders,
    remainingAttempts,
  };
};

/**
 * Comprehensive request validation and security check
 */
export const validateAndSecureRequest = async (
  request: Request,
  rateLimitType: RateLimitType,
  rateLimitIdentifier?: string
): Promise<{
  valid: boolean;
  response?: Response;
  rateLimitHeaders?: Record<string, string>;
  remainingAttempts?: number;
}> => {
  // Basic request validation
  const requestValidation = validateRequest(request);
  if (!requestValidation.isValid) {
    return {
      valid: false,
      response: createErrorResponse(
        400,
        "Bad Request",
        requestValidation.error || "Invalid request"
      ),
    };
  }

  // Rate limiting
  const rateLimitResult = await applyRateLimit(
    request,
    rateLimitType,
    rateLimitIdentifier
  );
  if (!rateLimitResult.allowed) {
    return {
      valid: false,
      response: rateLimitResult.response,
      rateLimitHeaders: rateLimitResult.rateLimitHeaders,
      remainingAttempts: rateLimitResult.remainingAttempts,
    };
  }

  return {
    valid: true,
    rateLimitHeaders: rateLimitResult.rateLimitHeaders,
    remainingAttempts: rateLimitResult.remainingAttempts,
  };
};

/**
 * Logs security events (without sensitive data)
 */
export const logSecurityEvent = (
  event: string,
  request: Request,
  errorCode: ErrorCode = 3005,
  additionalData?: Record<string, unknown>
): void => {
  const requestLogger = createRequestLogger(request);
  requestLogger.log(errorCode, event, {}, additionalData);
};
