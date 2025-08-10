/**
 * Logging constants and error codes for the authentication system
 * Organized by category with numerical codes for easy tracking and analysis
 */

/**
 * Log levels for filtering and prioritization
 */
export enum LogLevel {
  DEBUG = 0,    // Development debugging
  INFO = 1,     // General information
  WARN = 2,     // Warning conditions
  ERROR = 3,    // Error conditions
  CRITICAL = 4, // Critical system failures
}

/**
 * Authentication Events (1000-1999)
 */
export enum AuthEvent {
  // Success Events (1000-1099)
  REGISTRATION_SUCCESS = 1001,
  LOGIN_SUCCESS = 1002,
  LOGOUT_SUCCESS = 1003,
  EMAIL_VERIFICATION_SENT = 1004,
  EMAIL_VERIFIED = 1005,
  PASSWORD_RESET_REQUESTED = 1006,
  PASSWORD_RESET_SUCCESS = 1007,
  SESSION_REFRESHED = 1008,
  
  // Failure Events (1100-1199)
  REGISTRATION_FAILED = 1101,
  LOGIN_FAILED = 1102,
  LOGOUT_FAILED = 1103,
  EMAIL_VERIFICATION_FAILED = 1104,
  PASSWORD_RESET_FAILED = 1105,
  SESSION_REFRESH_FAILED = 1106,
  INVALID_SESSION = 1107,
}

/**
 * Validation Errors (2000-2999)
 */
export enum ValidationError {
  EMAIL_INVALID = 2001,
  PASSWORD_TOO_SHORT = 2002,
  PASSWORD_NO_UPPERCASE = 2003,
  PASSWORD_NO_LOWERCASE = 2004,
  PASSWORD_NO_NUMBER = 2005,
  PASSWORD_NO_SPECIAL = 2006,
  REQUIRED_FIELD_MISSING = 2007,
  EMAIL_TOO_LONG = 2008,
  FORM_DATA_INVALID = 2009,
  INPUT_SANITIZATION_FAILED = 2010,
}

/**
 * Security Events (3000-3999)
 */
export enum SecurityEvent {
  RATE_LIMIT_EXCEEDED = 3001,
  INVALID_USER_AGENT = 3002,
  REQUEST_TOO_LARGE = 3003,
  INVALID_CONTENT_TYPE = 3004,
  SUSPICIOUS_ACTIVITY = 3005,
  BRUTE_FORCE_ATTEMPT = 3006,
  IP_BLOCKED = 3007,
  CSRF_DETECTED = 3008,
  INVALID_ORIGIN = 3009,
  MALFORMED_REQUEST = 3010,
}

/**
 * Supabase Integration Errors (4000-4999)
 */
export enum SupabaseError {
  CONNECTION_FAILED = 4001,
  USER_NOT_FOUND = 4002,
  USER_ALREADY_EXISTS = 4003,
  EMAIL_NOT_CONFIRMED = 4004,
  INVALID_CREDENTIALS = 4005,
  SESSION_EXPIRED = 4006,
  DATABASE_ERROR = 4007,
  AUTH_ERROR = 4008,
  SIGNUP_DISABLED = 4009,
  WEAK_PASSWORD = 4010,
}

/**
 * System Errors (5000-5999)
 */
export enum SystemError {
  ENVIRONMENT_VALIDATION_FAILED = 5001,
  INTERNAL_SERVER_ERROR = 5002,
  SERVICE_UNAVAILABLE = 5003,
  TIMEOUT = 5004,
  CONFIGURATION_ERROR = 5005,
  MEMORY_LIMIT_EXCEEDED = 5006,
  DEPENDENCY_FAILURE = 5007,
}

/**
 * Request/Response Errors (6000-6999)
 */
export enum RequestError {
  MALFORMED = 6001,
  MISSING_HEADERS = 6002,
  INVALID_METHOD = 6003,
  SERIALIZATION_FAILED = 6004,
  DESERIALIZATION_FAILED = 6005,
  CONTENT_TYPE_MISMATCH = 6006,
}

/**
 * All error codes combined for type safety
 */
export type ErrorCode = 
  | AuthEvent 
  | ValidationError 
  | SecurityEvent 
  | SupabaseError 
  | SystemError 
  | RequestError;

/**
 * Log entry structure for consistent logging
 */
export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  code: ErrorCode;
  message: string;
  context: {
    ip?: string;
    userAgent?: string;
    method?: string;
    url?: string;
    userId?: string;
    email?: string;
    requestId?: string;
  };
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

/**
 * Event categories for filtering and analysis
 */
export enum EventCategory {
  AUTHENTICATION = 'auth',
  VALIDATION = 'validation',
  SECURITY = 'security',
  SUPABASE = 'supabase',
  SYSTEM = 'system',
  REQUEST = 'request',
}

/**
 * Maps error codes to their categories for easier filtering
 */
export const getEventCategory = (code: ErrorCode): EventCategory => {
  if (code >= 1000 && code < 2000) return EventCategory.AUTHENTICATION;
  if (code >= 2000 && code < 3000) return EventCategory.VALIDATION;
  if (code >= 3000 && code < 4000) return EventCategory.SECURITY;
  if (code >= 4000 && code < 5000) return EventCategory.SUPABASE;
  if (code >= 5000 && code < 6000) return EventCategory.SYSTEM;
  if (code >= 6000 && code < 7000) return EventCategory.REQUEST;
  return EventCategory.SYSTEM; // fallback
};

/**
 * Maps error codes to appropriate log levels
 */
export const getLogLevel = (code: ErrorCode): LogLevel => {
  // Critical system failures
  if ([
    SystemError.INTERNAL_SERVER_ERROR,
    SystemError.SERVICE_UNAVAILABLE,
    SystemError.MEMORY_LIMIT_EXCEEDED,
    SupabaseError.CONNECTION_FAILED,
  ].includes(code as any)) {
    return LogLevel.CRITICAL;
  }
  
  // Security events are generally errors
  if (code >= 3000 && code < 4000) {
    return LogLevel.ERROR;
  }
  
  // Authentication failures
  if ([
    AuthEvent.REGISTRATION_FAILED,
    AuthEvent.LOGIN_FAILED,
    AuthEvent.EMAIL_VERIFICATION_FAILED,
    AuthEvent.PASSWORD_RESET_FAILED,
  ].includes(code as any)) {
    return LogLevel.ERROR;
  }
  
  // Validation errors
  if (code >= 2000 && code < 3000) {
    return LogLevel.WARN;
  }
  
  // Success events
  if ([
    AuthEvent.REGISTRATION_SUCCESS,
    AuthEvent.LOGIN_SUCCESS,
    AuthEvent.LOGOUT_SUCCESS,
    AuthEvent.EMAIL_VERIFIED,
    AuthEvent.PASSWORD_RESET_SUCCESS,
  ].includes(code as any)) {
    return LogLevel.INFO;
  }
  
  // Default to INFO for other events
  return LogLevel.INFO;
};
