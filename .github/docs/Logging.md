# Logging

## 📊 loggingConstants.ts Features

### 1. Structured Error Codes

- ✅ Authentication Events: 1000-1999 (success/failure events)
- ✅ Validation Errors: 2000-2999 (input validation issues)
- ✅ Security Events: 3000-3999 (rate limiting, suspicious activity)
- ✅ Supabase Errors: 4000-4999 (database/auth integration issues)
- ✅ System Errors: 5000-5999 (server/configuration problems)
- ✅ Request Errors: 6000-6999 (HTTP/API issues)

### 2. Smart Categorization

- ✅ Auto-categorization by error code ranges
- ✅ Auto log level assignment based on severity
- ✅ TypeScript type safety for all error codes

## 📝 logging.ts Features

### 1. Environment-Aware Configuration

``` typescript
// Development: Pretty console output with colors
// Production: JSON structured logs
isDevelopment: import.meta.env.DEV
```

### 2. Multiple Logger Types

``` typescript
// General purpose
logger.log(AuthEvent.LOGIN_SUCCESS, "User logged in successfully");

// Request-specific (auto-extracts IP, method, URL)
const requestLogger = createRequestLogger(request);
requestLogger.log(SecurityEvent.RATE_LIMIT_EXCEEDED, "Too many attempts");

// User-specific context
const userLogger = createUserLogger(userId, email);
userLogger.log(AuthEvent.EMAIL_VERIFIED, "Email verification complete");
```

### 3. Rich Context Extraction

- ✅ IP Address: Multiple header support (x-forwarded-for, x-real-ip, cf-connecting-ip)
- ✅ Request Details: Method, URL, User-Agent
- ✅ User Context: User ID, email when available
- ✅ Performance Metrics: Built-in timing utilities

## 4. Developer Experience

- ✅ Colored console output in development
- ✅ Pretty formatting for debugging
- ✅ Stack traces in development mode
- ✅ JSON format for production parsing

## 5. Production Ready

- ✅ Configurable log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
- ✅ Structured JSON logs for analysis
- ✅ No sensitive data logging (passwords, tokens filtered out)
- ✅ Performance monitoring built-in

## 🎯 Usage Examples

``` typescript
import { logger, createRequestLogger } from './lib/logging';
import { AuthEvent, ValidationError, SecurityEvent } from './lib/loggingConstants';

// Simple logging
logger.log(AuthEvent.REGISTRATION_SUCCESS, "New user registered", { userId: "123" });

// Request-based logging (in API endpoints)
const requestLogger = createRequestLogger(request);
requestLogger.log(SecurityEvent.RATE_LIMIT_EXCEEDED, "Login attempts exceeded");

// Error logging with full context
logger.logError(
  ValidationError.EMAIL_INVALID, 
  "Email validation failed", 
  error,
  { email: "redacted" }
);

// Performance measurement
const result = await measurePerformance("user-registration", async () => {
  return await supabase.auth.signUp({ email, password });
});
```
