import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    typecheck: {
      tsconfig: './tsconfig.test.json'
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});
