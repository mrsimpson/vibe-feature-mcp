#!/usr/bin/env node

/**
 * Vibe Feature MCP Server Entry Point
 * 
 * Starts the MCP server with stdio transport for process-based usage.
 * The core server logic is in server.ts for better testability.
 * 
 * Also handles CLI flags for documentation and setup assistance.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ResponsibleVibeMCPServer } from './server.js';
import { createLogger } from './logger.js';
import { generateSystemPrompt } from './system-prompt-generator.js';
import { StateMachineLoader } from './state-machine-loader.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { startVisualizationTool } from './cli/visualization-launcher.js';
import { generateConfig } from './config-generator.js';

const logger = createLogger('Main');

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

/**
 * Parse command line arguments and handle special flags
 */
function parseCliArgs(): { shouldStartServer: boolean } {
  const args = process.argv.slice(2);
  
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return { shouldStartServer: false };
  }
  
  // Handle version flag
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    return { shouldStartServer: false };
  }
  
  // Handle system prompt flag
  if (args.includes('--system-prompt')) {
    showSystemPrompt();
    return { shouldStartServer: false };
  }
  
  // Handle visualization flag
  if (args.includes('--visualize') || args.includes('--viz')) {
    startVisualizationTool();
    return { shouldStartServer: false };
  }
  
  // Handle generate config flag
  const generateConfigIndex = args.findIndex(arg => arg === '--generate-config');
  if (generateConfigIndex !== -1) {
    const agent = args[generateConfigIndex + 1];
    if (!agent) {
      console.error('❌ Error: --generate-config requires an agent parameter');
      console.error('Usage: --generate-config <agent>');
      console.error('Supported agents: amazonq-cli, claude, gemini');
      process.exit(1);
    }
    handleGenerateConfig(agent);
    return { shouldStartServer: false };
  }
  
  // No special flags, start server normally
  return { shouldStartServer: true };
}

/**
 * Handle generate config command
 */
async function handleGenerateConfig(agent: string): Promise<void> {
  try {
    // Suppress info logs during CLI operations
    const originalLogLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'ERROR';
    
    await generateConfig(agent, process.cwd());
    
    // Restore original log level
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  } catch (error) {
    console.error(`❌ Failed to generate configuration: ${error}`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
Responsible Vibe MCP Server

USAGE:
  responsible-vibe-mcp [OPTIONS]

OPTIONS:
  --help, -h                    Show this help message
  --version, -v                 Show version information
  --system-prompt               Show the system prompt for LLM integration
  --visualize, --viz            Start the interactive workflow visualizer
  --generate-config <agent>     Generate configuration files for AI coding agents
                                Supported agents: amazonq-cli, claude, gemini

ENVIRONMENT VARIABLES:
  PROJECT_PATH    Set the project directory for custom workflow discovery

DESCRIPTION:
  A Model Context Protocol server that acts as an intelligent conversation 
  state manager and development guide for LLMs. This server orchestrates 
  feature development conversations by maintaining state, determining 
  development phases, and providing contextual instructions.

WORKFLOW VISUALIZER:
  Use --visualize to start the interactive web-based workflow visualizer.
  This opens a browser-based tool for exploring and understanding workflow
  state machines with beautiful PlantUML diagrams.

CONFIGURATION GENERATOR:
  Use --generate-config to create configuration files for AI coding agents:
  
  Amazon Q CLI: --generate-config amazonq-cli  (generates .amazonq/cli-agents/vibe.json)
  Claude Code:  --generate-config claude       (generates CLAUDE.md, .mcp.json, settings.json)
  Gemini CLI:   --generate-config gemini       (generates settings.json, GEMINI.md)
  
  Files are generated in the current directory with pre-configured settings
  for the responsible-vibe-mcp server and default tool permissions.

MCP CLIENT CONFIGURATION:
  Add to your MCP client configuration:
  
  Claude Desktop (.claude/config.json):
  {
    "mcpServers": {
      "responsible-vibe-mcp": {
        "command": "npx",
        "args": ["responsible-vibe-mcp"]
      }
    }
  }
  
  Amazon Q (.amazonq/mcp.json):
  {
    "mcpServers": {
      "responsible-vibe-mcp": {
        "command": "npx", 
        "args": ["responsible-vibe-mcp"]
      }
    }
  }

SYSTEM PROMPT:
  Use --system-prompt to get the complete system prompt for your LLM.

MORE INFO:
  GitHub: https://github.com/mrsimpson/vibe-feature-mcp
  npm: https://www.npmjs.com/package/responsible-vibe-mcp
`);
}

/**
 * Show version information
 */
async function showVersion(): Promise<void> {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    console.log(`responsible-vibe-mcp v${packageJson.version}`);
  } catch (error) {
    console.log('responsible-vibe-mcp (version unknown)');
  }
}

/**
 * Show system prompt for LLM integration
 */
function showSystemPrompt(): void {
  try {
    // Load the default state machine for prompt generation
    const loader = new StateMachineLoader();
    const stateMachine = loader.loadStateMachine(process.cwd());
    
    // Generate the system prompt
    const systemPrompt = generateSystemPrompt(stateMachine);
    
    console.log(systemPrompt);
    
  } catch (error) {
    console.error('Error generating system prompt:', error);
    process.exit(1);
  }
}

/**
 * Main entry point for the MCP server process
 */
async function main() {
  // Parse CLI arguments first
  const { shouldStartServer } = parseCliArgs();
  
  // If special flags were handled, exit gracefully
  if (!shouldStartServer) {
    return;
  }
  
  // Normal MCP server startup
  try {
    const projectPath = process.env.PROJECT_PATH;
    
    logger.info('Starting Vibe Feature MCP Server', { 
      projectPath: projectPath || 'default (process.cwd())',
      nodeVersion: process.version,
      platform: process.platform
    });
    
    // Create server instance with project path configuration
    const server = new ResponsibleVibeMCPServer({
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
