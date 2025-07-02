import { defineConfig } from 'vitest/config';
import { existsSync } from 'fs';

// Check if custom state machine exists
const hasCustomStateMachine = existsSync('.vibe/workflow.yml') || existsSync('.vibe/workflow.yaml');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    exclude: [
      'node_modules', 
      'dist',
      // Exclude MCP contract tests if custom state machine is present
      ...(hasCustomStateMachine ? ['test/e2e/consolidated/mcp-contract.test.ts'] : []),
    ],
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    env: {
      // Set log level to ERROR for tests by default
      LOG_LEVEL: 'ERROR',
      NODE_ENV: 'test',
      VITEST: 'true'
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});
