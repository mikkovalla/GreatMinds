# GreatMinds Copilot Instructions

## Project Overview

GreatMinds is a secure authentication-focused web application built with Astro 5.x + Supabase. The main application is `mindchat-auth/` - an SSR (server-side rendered) authentication system with production-grade security features.

## Architecture & Critical Patterns

### Core Stack

- **Frontend**: Astro 5.x with Vue.js components, SSR mode (`output: "server"`)
- **Backend**: Supabase BaaS for auth, PostgreSQL database, and real-time features
- **Validation**: Zod 4.x for runtime type checking and security validation
- **Testing**: Vitest with factory pattern for isolated unit tests
- **Security**: Comprehensive rate limiting, OWASP headers, structured logging

### Authentication Architecture

The authentication flow follows a secure server-side pattern:

1. **API Endpoints** (`src/pages/api/auth/`): Server-side authentication handlers
2. **Session Management**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
3. **Security Middleware**: Rate limiting, input validation, comprehensive logging
4. **Database Integration**: Automatic user profile creation with role-based access

### Critical Security Implementation

Every endpoint follows this exact pattern:

```typescript
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // 1. Security validation & rate limiting
  const securityCheck = await validateAndSecureRequest(
    request,
    "OPERATION_TYPE"
  );
  if (!securityCheck.valid) return securityCheck.response!;

  // 2. Input validation with Zod
  const formData = await request.formData();
  const formInput = validateFormData(formData);
  const validatedInput = validateOperationInput(formInput);

  // 3. Supabase operation with error handling
  const { data, error } = await supabase.auth.operation(validatedInput);
  if (error) {
    logger.logRequestError(code, message, error, request);
    return createErrorResponse(500, "Internal Server Error", "Message");
  }

  // 4. Session handling & logging
  if (data.session) {
    const cookieOptions = getCookieOptions(import.meta.env.PROD);
    cookies.set("sb-access-token", data.session.access_token, cookieOptions);
    cookies.set("sb-refresh-token", data.session.refresh_token, cookieOptions);
  }

  logger.logRequest(successCode, "Success message", request, context);
  return redirect("/");
};
```

## Development Workflow

### Essential Commands

```bash
# Development with hot reload
npm run dev              # localhost:4321

# Testing (critical for auth)
npm test                 # Watch mode
npm run test:run         # Single run
npm run coverage         # Coverage report

# Production build
npm run build && npm run preview
```

### Environment Setup

Required environment variables in `.env`:

```bash
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Database Schema (Supabase)

Key tables for authentication flow:

- `auth.users` - Supabase managed user accounts
- `public.profiles` - Application user profiles (id, email, stripe_customer_id, role)
- `public.subscription_status` - User subscription data
- `public.entitlements` - Feature access control

## Critical Code Patterns

### TypeScript Conventions

Project's Typescript conventions are found in `.github/instructions/typescript.instructions.md`.
These Typescript rules must be followed at all times.

### Validation Pattern (Zod)

All input validation uses standardized Zod schemas in `src/lib/validation.ts`:

```typescript
// Password: 8+ chars, upper, lower, number, special char
const passwordSchema = z
  .string()
  .min(8)
  .regex(/[a-z]/, "lowercase required")
  .regex(/[A-Z]/, "uppercase required")
  .regex(/\d/, "number required")
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "special char required");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
```

### Security Pattern (Rate Limiting)

Security utilities in `src/lib/security.ts` provide:

- **Rate Limiting**: 5 registration/hour, 10 login/hour per IP
- **Security Headers**: CSP, XSS protection, frame denial
- **Input Sanitization**: Trim, normalize, size validation

### Logging Pattern (Structured)

Comprehensive logging system with error codes (`src/lib/logging.ts`):

- **1000-1999**: Authentication events (success/failure)
- **2000-2999**: Validation errors
- **3000-3999**: Security events (rate limiting)
- **4000-4999**: Supabase integration errors
- **5000-5999**: System/server errors

Usage: `logger.logRequest(1001, "Registration successful", request, { userId })`

### Testing

- Testing is specifically detailed in `.github/instructions/testing.instructions.md`.
- This file acts as the single source of truth for testing practices and guidelines.
- Test examples can be found in the `src/test` directory.

## MCP Integration & Development Tools

The project uses Model Context Protocol for enhanced development:

- **Supabase MCP** (`.vscode/mcp.json`): Direct database schema access
- **Stripe MCP**: Payment integration testing
- **Astro Docs MCP**: Framework documentation
- **Semgrep MCP**: Security vulnerability scanning

## Critical Files & Locations

**Core Authentication:**

- `src/lib/supabaseClient.ts` - Supabase client with persistent sessions
- `src/pages/api/auth/register.ts` - User registration endpoint (example implementation)
- `src/lib/security.ts` - Security middleware and utilities
- `src/lib/validation.ts` - Input validation schemas

**Configuration:**

- `astro.config.mjs` - SSR mode, Vue integration, Node adapter
- `vitest.config.ts` - Test configuration with path aliases
- `src/env.d.ts` - TypeScript environment variable definitions

**Documentation:**

- `.github/docs/database.schema.md` - Database structure
- `.github/docs/Logging.md` - Logging system documentation

## Common Implementation Tasks

### Adding New Features

The workflow in all cases is the following:

1. Plan the feature with a detailed description and task list
2. Write tests for the feature
3. Write the implementation code

Every step is reviewed by the developer before the next one begins.

### Adding Endpoints

1. Follow the security pattern above exactly
2. Follow project TypeScript conventions found in `.github/instructions/typescript.instructions.md`
3. Add rate limit type to `RATE_LIMITS` in `security.ts`
4. Add Zod validation schema to `validation.ts`
5. Add error codes to `loggingConstants.ts`
6. Write comprehensive tests following the testing guidelines in `.github/instructions/testing.instructions.md`

### Database Operations

Use Supabase MCP for schema changes. Client operations use the configured client with RLS policies.

## Documentation

- Every feature should have corresponding documentation
- Documentation should be kept up-to-date with code changes
- Documentation should be clear and concise
- Documentation should include examples where applicable
- Documentation should be versioned alongside the code
- Documentation is found at `.github/docs/`
