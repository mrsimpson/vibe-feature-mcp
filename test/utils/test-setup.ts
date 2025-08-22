/**
 * Shared Test Setup Utilities
 *
 * Provides common mocking and server setup functions for integration tests
 */

import { join } from 'node:path';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Server test context
 */
export interface ServerTestContext {
  client: Client;
  transport: StdioClientTransport;
  cleanup: () => Promise<void>;
}

/**
 * Start a test server instance
 * @param options Server configuration options
 * @returns Server test context with client and cleanup function
 */
export async function startTestServer(
  options: {
    projectPath?: string;
    logLevel?: string;
  } = {}
): Promise<ServerTestContext> {
  const serverPath = join(process.cwd(), 'src', 'index.ts');
  const tsxModule = join(
    process.cwd(),
    'node_modules',
    'tsx',
    'dist',
    'cli.mjs'
  );
  const tempDir = options.projectPath || process.cwd(); // Use current directory as fallback

  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import(
    '@modelcontextprotocol/sdk/client/stdio.js'
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: [tsxModule, serverPath],
    env: {
      ...process.env,
      LOG_LEVEL: options.logLevel || 'ERROR', // Reduce noise in tests
      NODE_ENV: 'test',
    },
    cwd: tempDir, // Set working directory to the test project
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  return {
    client,
    transport,
    cleanup: async () => {
      if (client) {
        await client.close();
      }
    },
  };
}
