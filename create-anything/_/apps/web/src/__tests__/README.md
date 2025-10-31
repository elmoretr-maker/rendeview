# Integration Tests

This directory contains comprehensive integration tests for the Rende-VIEW dating application. These tests **invoke actual API route handlers** and perform **real database operations** to validate business logic end-to-end.

## Test Structure

### `/utils/test-helpers.ts`

Shared utilities for all integration tests:

- **`mockAuth(userId)`**: Mock authentication session for test user
- **`callRoute(handler, options)`**: Invoke API route handler with Request object
- **`cleanupTestData()`**: Reset database to clean state between tests
- **`createTestUser(id, options)`**: Create test users with specific attributes
- **`getUserData(userId)`**: Query user state from database
- **`getBlockersForUser(userId)`**: Query blocker relationships
- **`clearRateLimits(userId, endpoint?)`**: Reset rate limit counters
- **`assertSuccess(response)`**: Assert HTTP 2xx response
- **`assertError(response, status?)`**: Assert HTTP 4xx/5xx response

### Test User IDs

Tests use predefined user ID ranges:

- **User ID 1-10**: Primary test users (main test user is ID 1)
- **User ID 1000+**: Temporary test users for blocking, matching, etc.

All test users are cleaned up between tests via `cleanupTestData()`.

## Integration Test Suites

### `subscription.test.ts` (20+ tests)

Tests payment and subscription flows with real API calls:

- **POST /api/payments/checkout**
  - Subscription upgrades (Free → Casual/Dating/Business)
  - Idempotency key support
  - Invalid tier rejection
  - Unauthorized access handling

- **Scheduled Downgrades**
  - Schedule downgrade to lower tier
  - Cancel scheduled downgrade
  - Verify database state (scheduled_tier, tier_change_at)
  - Prevent downgrade to same/higher tier

- **POST /api/payments/webhook**
  - Process checkout.session.completed events
  - Signature validation
  - Webhook event logging

- **Pricing Validation**
  - Verify tier pricing from configuration
  - Validate video duration limits
  - Extension pricing checks

### `safety.test.ts` (25+ tests)

Tests user safety and moderation with real API calls:

- **POST /api/blockers**
  - Block user functionality
  - Block count incrementation
  - Duplicate block prevention
  - Self-blocking prevention

- **4-Strike Moderation Logic**
  - 3 blocks → `flagged_for_admin = true`
  - 4 blocks → `account_status = 'under_review'`
  - 5+ blocks → maintains `under_review` status
  - Independent tracking per user

- **Rate Limiting**
  - 20 blocks per hour enforcement
  - 429 responses with retry-after headers
  - Rate limit reset after window expires

- **GET /api/blockers**
  - Retrieve blocked user list
  - Empty list when no blocks

- **DELETE /api/blockers**
  - Unblock functionality
  - Graceful handling of non-blocked users

- **Safety Metrics**
  - Total blocks across platform
  - Most blocked users ranking
  - Flagged users count

## Running Tests

```bash
# Run all integration tests
npm test

# Run specific test suite
npm test subscription.test.ts
npm test safety.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

## Test Isolation

Each test suite uses `beforeEach` and `afterEach` hooks to ensure proper isolation:

```typescript
beforeEach(async () => {
  vi.clearAllMocks();
  mockAuth(1);
  await cleanupTestData();
  await createTestUser(1, { name: 'Test User' });
});

afterEach(async () => {
  await cleanupTestData();
});
```

**Critical**: `cleanupTestData()` cleans:
- All blockers involving test users
- ALL rate limits for test users (including user 1)
- Test webhook events
- Resets moderation flags, block counts, and Stripe IDs

This prevents state contamination between tests.

## Key Differences from Mock Tests

### ❌ Old Approach (Mocks Only)
```typescript
// Mocked database calls - doesn't test actual API
const mockDb = vi.fn().mockResolvedValue({ ok: true });
await mockDb.insert({ userId: 1 });
expect(mockDb).toHaveBeenCalled();
```

### ✅ New Approach (Real API Calls)
```typescript
// Invoke actual route handler
const response = await callRoute(blockUserHandler, {
  method: 'POST',
  body: { blockedId: 1001 },
});

// Verify response
assertSuccess(response);

// Verify database state
const user = await getUserData(1001);
expect(user.block_count).toBe(1);
```

## Best Practices

1. **Always use `cleanupTestData()`** in `beforeEach` and `afterEach`
2. **Use test user IDs >= 1000** for temporary users
3. **Verify both response and database state** after operations
4. **Clear rate limits** when testing rate-limited endpoints
5. **Mock external services** (Stripe, Daily.co) but NOT database or route handlers
6. **Test business logic**, not implementation details

## Debugging Failed Tests

1. **Check test isolation**: Ensure cleanup is running
2. **Verify database state**: Use `getUserData()` to inspect actual data
3. **Check rate limits**: May need to call `clearRateLimits()` manually
4. **Review logs**: Tests log errors from `cleanupTestData()` and route handlers
5. **Run tests individually**: Isolate failing test with `.only()`

## Adding New Tests

When adding new integration tests:

1. Import test helpers from `../utils/test-helpers`
2. Mock authentication with `mockAuth(userId)`
3. Create required test users with `createTestUser()`
4. Call actual route handlers with `callRoute()`
5. Verify response AND database state
6. Add cleanup for any new tables in `cleanupTestData()`

Example:

```typescript
it('should create new feature', async () => {
  mockAuth(1);
  await createTestUser(1, { membershipTier: 'dating' });
  
  const response = await callRoute(newFeatureHandler, {
    method: 'POST',
    body: { data: 'test' },
  });
  
  assertSuccess(response);
  expect(response.data.created).toBe(true);
  
  // Verify database state
  const result = await sql`SELECT * FROM new_feature WHERE user_id = 1`;
  expect(result.length).toBe(1);
});
```
