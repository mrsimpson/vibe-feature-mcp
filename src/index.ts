#!/usr/bin/env node

/**
 * Vibe Feature MCP Server Entry Point
 * 
 * Starts the MCP server with stdio transport for process-based usage.
 * The core server logic is in server.ts for better testability.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VibeFeatureMCPServer } from './server.js';
import { createLogger } from './logger.js';

const logger = createLogger('Main');

/**
 * Main entry point for the MCP server process
 */
async function main() {
  try {
    logger.info('Starting Vibe Feature MCP Server');
    
    // Check for VIBE_PROJECT_PATH environment variable
    const projectPath = process.env.VIBE_PROJECT_PATH;
    if (projectPath) {
      logger.info('Using project path from VIBE_PROJECT_PATH environment variable', { projectPath });
    }
    
    // Create server instance with configuration
    const server = new VibeFeatureMCPServer({
      projectPath
    });
    
    // Initialize server
    await server.initialize();
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.getMcpServer().connect(transport);
    
    logger.info('Vibe Feature MCP Server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down Vibe Feature MCP Server...');
      await server.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down Vibe Feature MCP Server...');
      await server.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
// More robust check that works with npx and direct execution
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('responsible-vibe-mcp') ||
                     process.argv[1]?.endsWith('index.js');

if (isMainModule) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
  });
}
