/**
 * Test setup file for Vitest
 * Configures global test environment and utilities
 */

import { join } from 'path';
import { tmpdir } from 'os';

// Global test configuration
const TEST_DB_DIR = join(tmpdir(), 'vibe-feature-mcp-test');

// Export test utilities
export const TEST_CONFIG = {
  DB_DIR: TEST_DB_DIR,
  DB_PATH: join(TEST_DB_DIR, 'test.sqlite'),
  PROJECT_PATH: '/test/project',
  GIT_BRANCH: 'main'
};

// Global setup for memfs mocking
// This ensures fs is mocked for unit tests only
import { vi } from 'vitest';

// Only enable automatic fs mocking for unit tests
// Integration tests should use real file system
if (process.env.NODE_ENV !== 'integration') {
  vi.mock('fs');
  vi.mock('fs/promises');
}
