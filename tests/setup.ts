// Setup file for Jest tests
// This file runs before all tests

// Type declarations for global scope
declare global {
  var sleep: (ms: number) => Promise<void>;
}

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.APP_NAME = 'Flash Sale API Test';
process.env.APP_URL = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.JWT_ACCESS_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Set test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Export empty object to make this a module
export {};
