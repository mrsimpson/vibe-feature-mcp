#!/usr/bin/env node

/**
 * Main entry point for responsible-vibe-mcp
 * 
 * Starts the MCP server and handles CLI arguments
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VibeFeatureMCPServer } from './server.js';
import { createLogger } from './logger.js';
import { generateSystemPrompt } from './system-prompt-generator.js';

const logger = createLogger('Main');

/**
 * Parse command line arguments
 */
function parseArguments(): { mode: string; projectPath?: string } {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
responsible-vibe-mcp - An MCP server for structured development workflows

Usage:
  npx responsible-vibe-mcp [options]

Options:
  --help, -h                 Show this help message
  --version, -v              Show version information
  --system-prompt           Display the system prompt for LLM configuration

Environment Variables:
  VIBE_PROJECT_PATH         Set the project directory for custom workflow discovery

Examples:
  # Start MCP server
  npx responsible-vibe-mcp

  # Start with custom project path
  VIBE_PROJECT_PATH=/path/to/project npx responsible-vibe-mcp

  # Get system prompt for Claude Desktop configuration
  npx responsible-vibe-mcp --system-prompt

For more information, visit: https://github.com/mrsimpson/responsible-vibe-mcp
`);
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    const packageJson = require('../package.json');
    console.log(packageJson.version);
    process.exit(0);
  }
  
  if (args.includes('--system-prompt')) {
    console.log(generateSystemPrompt());
    process.exit(0);
  }
  
  return { 
    mode: 'server',
    projectPath: process.env.VIBE_PROJECT_PATH
  };
}

/**
 * Main entry point for the MCP server process
 */
async function main() {
  try {
    const { mode, projectPath } = parseArguments();
    
    if (mode === 'server') {
      logger.info('Starting responsible-vibe-mcp server', { 
        projectPath: projectPath || 'default (process.cwd())',
        nodeVersion: process.version,
        platform: process.platform
      });
      
      // Create server instance with project path configuration
      const server = new VibeFeatureMCPServer({
        projectPath: projectPath
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
    }
    
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
