import { beforeAll, afterAll, beforeEach } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.AUTH_URL = 'http://localhost:5000';

// Global test setup
beforeAll(() => {
  // Setup code before all tests
  console.log('Starting test suite...');
});

afterAll(() => {
  // Cleanup code after all tests
  console.log('Test suite completed.');
});

beforeEach(() => {
  // Reset mocks before each test
});
