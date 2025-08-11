---
applyTo: "**/*test.ts"
---

# Testing Guidelines: Complete Unit Testing Strategy for JavaScript/TypeScript APIs

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Philosophy](#testing-philosophy)
3. [Architecture Overview](#architecture-overview)
4. [Factory Pattern Implementation](#factory-pattern-implementation)
5. [API Endpoint Testing Strategy](#api-endpoint-testing-strategy)
6. [Test Coverage Requirements](#test-coverage-requirements)
7. [Implementation Guidelines](#implementation-guidelines)
8. [Quality Assurance Standards](#quality-assurance-standards)
9. [Maintenance and Evolution](#maintenance-and-evolution)

## Executive Summary

This document establishes comprehensive testing standards for JavaScript/TypeScript API endpoints, focusing on unit testing methodologies that ensure code reliability, maintainability, and scalability. Our approach emphasizes **test isolation**, **explicit dependencies**, and **factory-driven data generation** to create a robust testing ecosystem.

### Key Principles

- **Isolation First**: Each test is independent and self-contained
- **Explicit Dependencies**: All mocks and dependencies are clearly defined per test
- **Factory-Driven**: Reusable, customizable test data generation
- **Coverage-Complete**: Every code path, error condition, and edge case is tested
- **Maintainability**: Tests serve as living documentation of system behavior

## Testing Philosophy

### Why This Approach Works

#### 1. **Test Isolation**

Each test operates in complete isolation, preventing cascade failures and ensuring that changes to one test don't affect others. This is achieved through:

- Test-specific mocks instead of global mocks
- Fresh mock state for each test
- Explicit setup and teardown

#### 2. **Explicit Dependencies**

Tests clearly declare what they depend on, making them:

- Easier to understand and debug
- More maintainable when dependencies change
- Self-documenting regarding system architecture

#### 3. **Predictable and Repeatable**

Using factories ensures:

- Consistent test data across test runs
- Ability to customize specific properties for edge cases
- Reduced test flakiness from random data

### Anti-Patterns Avoided

❌ **Mocking business logic**: Never mock implementation details or business logic. Always test the real behavior.
❌ **Global Mocks**: Hard to debug, create hidden dependencies  
❌ **Shared Test State**: Causes cascade failures between tests  
❌ **Magic Values**: Makes tests hard to understand and maintain  
❌ **Incomplete Coverage**: Leaves bugs undiscovered until production

## Architecture Overview

### Directory Structure

```
src/test/
├── testUtils/
│   ├── factories.ts          # Data factory functions
│   ├── mockHelpers.ts        # Mock utility functions
│   └── testConstants.ts      # Shared test constants
├── setupTests.ts             # Global test configuration
└── **/*.test.ts             # Test files co-located with source
```

### Test File Organization

```typescript
// Standard test file structure
import { describe, it, expect, vi, beforeEach } from "vitest";
import { functionUnderTest } from "../source/module";
import { factories } from "./testUtils/factories";

// Mock dependencies at file level
vi.mock("@/lib/externalDependency");

describe("Module Name", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("happy path scenarios", () => {
    // Success cases
  });

  describe("error scenarios", () => {
    // Error handling
  });

  describe("edge cases", () => {
    // Boundary conditions
  });
});
```

## Factory Pattern Implementation

### Why Factories?

Factories solve critical testing challenges:

#### 1. **Data Consistency**

```typescript
// Without factories - inconsistent, hard to maintain
const user1 = { id: "123", email: "test@example.com" /* 20+ other fields */ };
const user2 = {
  id: "456",
  email: "other@example.com" /* different field structure */,
};

// With factories - consistent, maintainable
const user1 = createMockUser({ id: "123" });
const user2 = createMockUser({ id: "456", email: "other@example.com" });
```

#### 2. **Customization Without Duplication**

```typescript
// Easy to create variations for different test scenarios
const validUser = createMockUser();
const unverifiedUser = createMockUser({ email_confirmed_at: null });
const adminUser = createMockUser({ role: "admin" });
```

#### 3. **Type Safety**

```typescript
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  // TypeScript ensures all required fields are present
  id: "default-id",
  email: "default@example.com",
  // ... all required User fields
  ...overrides, // Only allow valid User properties
});
```

### Factory Implementation Standards

#### Basic Factory Structure

```typescript
/**
 * Creates a mock [EntityName] object
 * @param overrides - Partial object to override default values
 * @returns Complete mock object with all required fields
 */
export const createMock[EntityName] = (
  overrides: Partial<[EntityType]> = {}
): [EntityType] => ({
  // All required fields with sensible defaults
  id: "default-id",
  createdAt: new Date().toISOString(),
  // ... other required fields
  ...overrides,
});
```

#### Advanced Factory Patterns

```typescript
// Factory with computed fields
export const createMockSession = (
  overrides: Partial<Session> = {}
): Session => {
  const baseUser = createMockUser();
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: baseUser,
    ...overrides,
    // Override user if provided
    user: overrides.user || baseUser,
  };
};

// Factory with relationships
export const createMockOrderWithItems = (
  orderOverrides: Partial<Order> = {},
  itemsCount: number = 2
): OrderWithItems => {
  const order = createMockOrder(orderOverrides);
  const items = Array.from({ length: itemsCount }, (_, i) =>
    createMockOrderItem({ orderId: order.id, name: `Item ${i + 1}` })
  );

  return { ...order, items };
};
```

## API Endpoint Testing Strategy

### Complete Test Coverage Matrix

For every API endpoint, test these categories:

#### 1. **Authentication & Authorization**

```typescript
describe("authentication", () => {
  it("should reject unauthenticated requests", async () => {
    // Test without auth headers/cookies
  });

  it("should reject invalid tokens", async () => {
    // Test with malformed/expired tokens
  });

  it("should reject insufficient permissions", async () => {
    // Test with valid auth but wrong role
  });
});
```

#### 2. **Input Validation**

```typescript
describe("input validation", () => {
  it("should validate required fields", async () => {
    // Test missing required parameters
  });

  it("should validate field formats", async () => {
    // Test invalid email, weak password, etc.
  });

  it("should validate field lengths", async () => {
    // Test min/max length constraints
  });

  it("should sanitize inputs", async () => {
    // Test XSS prevention, SQL injection protection
  });
});
```

#### 3. **Business Logic**

```typescript
describe("business logic", () => {
  it("should handle successful operation", async () => {
    // Happy path scenario
  });

  it("should enforce business rules", async () => {
    // Domain-specific constraints
  });

  it("should handle concurrent operations", async () => {
    // Race conditions, optimistic locking
  });
});
```

#### 4. **External Dependencies**

```typescript
describe("external dependencies", () => {
  it("should handle database failures", async () => {
    // Database connection errors, constraint violations
  });

  it("should handle third-party service failures", async () => {
    // Payment gateway down, email service unavailable
  });

  it("should handle network timeouts", async () => {
    // Slow responses, connection drops
  });
});
```

#### 5. **Rate Limiting & Security**

```typescript
describe("security controls", () => {
  it("should enforce rate limits", async () => {
    // Too many requests from same IP
  });

  it("should prevent brute force attacks", async () => {
    // Multiple failed login attempts
  });

  it("should validate request size", async () => {
    // Prevent DoS via large payloads
  });
});
```

#### 6. **Response Handling**

```typescript
describe("response handling", () => {
  it("should return correct success responses", async () => {
    // Proper status codes, response structure
  });

  it("should return consistent error responses", async () => {
    // Standardized error format
  });

  it("should include security headers", async () => {
    // OWASP security headers
  });

  it("should handle response serialization", async () => {
    // Large responses, special characters
  });
});
```

### Example: Complete Registration Endpoint Test

```typescript
describe("POST /api/auth/register", () => {
  // Test data factories
  const validRegistrationData = () => createMockRegistrationForm();
  const invalidEmailData = () => createMockRegistrationForm("invalid-email");

  describe("successful registration", () => {
    it("should create user and return session", async () => {
      // Arrange
      const userData = validRegistrationData();
      const expectedUser = createMockUser({ email: userData.get("email") });
      const expectedSession = createMockSession({ user: expectedUser });

      setupSuccessfulMocks({ user: expectedUser, session: expectedSession });

      // Act
      const response = await POST(createAPIContext(userData));

      // Assert
      expect(response.status).toBe(200);
      expect(cookiesWereSet).toBe(true);
      expect(databaseWasUpdated).toBe(true);
      expect(userWasLogged).toBe(true);
    });
  });

  describe("validation failures", () => {
    it("should reject invalid email format", async () => {
      // Test email validation
    });

    it("should reject weak passwords", async () => {
      // Test password strength requirements
    });
  });

  describe("database failures", () => {
    it("should handle user creation failures", async () => {
      // Test Supabase auth errors
    });

    it("should handle profile creation failures", async () => {
      // Test database constraint violations
    });
  });

  describe("security controls", () => {
    it("should enforce rate limiting", async () => {
      // Test too many registration attempts
    });

    it("should prevent duplicate registrations", async () => {
      // Test email already exists scenario
    });
  });
});
```

## Test Coverage Requirements

### Quantitative Metrics

- **Line Coverage**: Minimum 95%
- **Branch Coverage**: Minimum 90%
- **Function Coverage**: 100%
- **Statement Coverage**: Minimum 95%

### Qualitative Requirements

#### 1. **Error Path Coverage**

Every `throw`, `return error`, and `catch` block must have corresponding tests.

#### 2. **Boundary Condition Testing**

- Empty inputs, null values, undefined parameters
- Maximum/minimum values for numeric inputs
- Edge cases for string lengths, array sizes
- Time-based boundaries (expired tokens, future dates)

#### 3. **Integration Points**

- All external API calls
- All database operations
- All file system interactions
- All environment variable dependencies

#### 4. **Security Scenarios**

- Input sanitization effectiveness
- Authentication bypass attempts
- Authorization escalation attempts
- Rate limiting enforcement

### Coverage Monitoring

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 95,
        functions: 100,
        branches: 90,
        statements: 95,
      },
      exclude: ["src/test/**", "**/*.test.ts", "src/types/**"],
    },
  },
});
```

## Implementation Guidelines

### Test Structure Standards

#### AAA Pattern (Arrange, Act, Assert)

```typescript
it("should describe expected behavior", async () => {
  // Arrange - Set up test data and mocks
  const inputData = createMockInput();
  const expectedOutput = createMockOutput();
  setupMocks({ returnValue: expectedOutput });

  // Act - Execute the function under test
  const result = await functionUnderTest(inputData);

  // Assert - Verify the expected behavior
  expect(result).toEqual(expectedOutput);
  expect(mockFunction).toHaveBeenCalledWith(expectedInput);
});
```

#### Descriptive Test Names

```typescript
// ✅ Good - Describes behavior and context
it("should return 400 when email format is invalid", async () => {});
it("should create user profile when registration succeeds", async () => {});
it("should enforce rate limit after 5 failed attempts", async () => {});

// ❌ Bad - Vague or implementation-focused
it("should test validation", async () => {});
it("should call database function", async () => {});
```

#### Mock Organization

```typescript
// Group mocks by concern
describe("user registration", () => {
  // Setup common mocks
  beforeEach(() => {
    setupSecurityMocks();
    setupValidationMocks();
    setupDatabaseMocks();
  });

  // Override specific mocks per test
  it("should handle validation failure", async () => {
    vi.mocked(validateInput).mockImplementation(() => {
      throw new Error("Invalid input");
    });

    // Test continues...
  });
});
```

### Mock Best Practices

#### 1. **Explicit Mock Definitions**

```typescript
// ✅ Explicit and clear
vi.mocked(security.validateAndSecureRequest).mockResolvedValue({
  valid: true,
  rateLimitHeaders: {},
  remainingAttempts: 5,
});

// ❌ Implicit and unclear
vi.mocked(security.validateAndSecureRequest).mockResolvedValue({ valid: true });
```

#### 2. **Mock Verification**

```typescript
// Verify mocks were called correctly
expect(databaseInsert).toHaveBeenCalledWith({
  table: "users",
  data: expectedUserData,
});

expect(databaseInsert).toHaveBeenCalledTimes(1);
```

#### 3. **Mock Cleanup**

```typescript
beforeEach(() => {
  vi.resetAllMocks(); // Reset call history and implementations
});

afterEach(() => {
  vi.restoreAllMocks(); // Restore original implementations
});
```

## Quality Assurance Standards

### Test Quality Metrics

#### 1. **Test Reliability**

- Tests must pass consistently (>99.5% pass rate)
- No flaky tests due to timing, randomness, or external dependencies
- Deterministic test data and behavior

#### 2. **Test Performance**

- Unit tests should complete in <100ms each
- Full test suite should complete in <30 seconds
- Parallel test execution where possible

#### 3. **Test Maintainability**

- Tests should be easy to understand and modify
- Changes to business logic should require minimal test updates
- Clear failure messages that guide debugging

### Code Review Checklist

#### Test Coverage

- [ ] All new code paths are tested
- [ ] Error scenarios are covered
- [ ] Edge cases are addressed
- [ ] Security considerations are tested

#### Test Quality

- [ ] Tests follow AAA pattern
- [ ] Test names are descriptive
- [ ] Mocks are appropriate and minimal
- [ ] Assertions are specific and meaningful

#### Maintainability

- [ ] Factories are used for test data
- [ ] No hardcoded magic values
- [ ] Tests are independent and isolated
- [ ] Setup and teardown are handled correctly

### Continuous Integration Requirements

```yaml
# Example CI configuration
test:
  runs-on: ubuntu-latest
  steps:
    - name: Run tests
      run: pnpm test

    - name: Check coverage thresholds
      run: pnpm test:coverage

    - name: Enforce quality gates
      run: |
        # Fail if coverage below thresholds
        # Fail if tests take too long
        # Fail if flaky tests detected
```

## Maintenance and Evolution

### Updating Tests for Code Changes

#### 1. **Additive Changes**

When adding new features:

- Add corresponding test cases
- Ensure existing tests still pass
- Update factories if new required fields added

#### 2. **Breaking Changes**

When modifying existing behavior:

- Update affected tests to reflect new behavior
- Consider backward compatibility in test data
- Document behavior changes in test descriptions

#### 3. **Refactoring**

When restructuring code:

- Tests should continue to pass without modification
- Update only implementation details, not behavior verification
- Use this as an opportunity to improve test clarity

### Factory Evolution

```typescript
// Version 1 - Basic factory
export const createMockUser = (overrides = {}) => ({
  id: "user-123",
  email: "test@example.com",
  ...overrides,
});

// Version 2 - Enhanced with new requirements
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "user-123",
  email: "test@example.com",
  createdAt: new Date().toISOString(),
  emailVerified: true, // New required field
  preferences: createMockUserPreferences(), // New complex field
  ...overrides,
});

// Version 3 - Backward compatibility maintained
export const createMockUser = (
  overrides: Partial<User> = {},
  options: { legacy?: boolean } = {}
): User => {
  const base = {
    id: "user-123",
    email: "test@example.com",
    createdAt: new Date().toISOString(),
    ...overrides,
  };

  if (options.legacy) {
    return base; // Skip new fields for legacy tests
  }

  return {
    ...base,
    emailVerified: true,
    preferences: createMockUserPreferences(),
  };
};
```

### Performance Optimization

#### 1. **Test Parallelization**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
});
```

#### 2. **Mock Optimization**

```typescript
// Heavy mocks only when needed
describe("performance critical tests", () => {
  it("should use lightweight mocks", async () => {
    // Minimal mock setup
    vi.mocked(heavyService).mockReturnValue(simpleResult);
  });
});

describe("integration tests", () => {
  it("should use comprehensive mocks", async () => {
    // Full mock setup when testing integration
    setupComprehensiveMocks();
  });
});
```

## Conclusion

This testing strategy provides a comprehensive foundation for building reliable, maintainable, and scalable JavaScript/TypeScript applications. By following these guidelines, development teams can:

- **Catch bugs early** in the development cycle
- **Refactor with confidence** knowing tests will catch regressions
- **Document system behavior** through comprehensive test suites
- **Onboard new developers** quickly with clear testing patterns
- **Maintain high code quality** through enforced coverage and review standards

The investment in comprehensive testing pays dividends through reduced production bugs, faster development cycles, and increased developer confidence in making changes to the codebase.

---

_This document should be reviewed and updated quarterly to reflect evolving best practices and lessons learned from implementation._
