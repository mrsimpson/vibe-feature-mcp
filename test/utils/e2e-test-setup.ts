/**
 * End-to-End Test Setup Utilities
 * 
 * Provides utilities for testing the MCP server end-to-end without
 * spawning separate processes or using transport layers. Tests the
 * server's public interface directly for true consumer perspective testing.
 */

import { vi } from 'vitest';
import { VibeFeatureMCPServer, ServerConfig } from '../../src/server.js';
import { TempProject } from './temp-files.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

/**
 * Suite-level test isolation manager
 * Ensures each test suite gets its own isolated temporary directory
 */
export class TestSuiteIsolation {
  private static suiteDirectories = new Map<string, string>();
  private static cleanupCallbacks = new Map<string, (() => void)[]>();

  /**
   * Get or create an isolated directory for a test suite
   */
  static getSuiteDirectory(suiteName: string): string {
    if (!this.suiteDirectories.has(suiteName)) {
      // Create unique directory for this suite
      const suiteId = `${suiteName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const suiteDir = join(tmpdir(), 'responsible-vibe-e2e-suites', suiteId);
      
      // Ensure directory exists
      mkdirSync(suiteDir, { recursive: true });
      
      this.suiteDirectories.set(suiteName, suiteDir);
      this.cleanupCallbacks.set(suiteName, []);
    }
    
    return this.suiteDirectories.get(suiteName)!;
  }

  /**
   * Register a cleanup callback for a suite
   */
  static registerCleanup(suiteName: string, cleanup: () => void): void {
    const callbacks = this.cleanupCallbacks.get(suiteName) || [];
    callbacks.push(cleanup);
    this.cleanupCallbacks.set(suiteName, callbacks);
  }

  /**
   * Clean up all resources for a test suite
   */
  static async cleanupSuite(suiteName: string): Promise<void> {
    // Run all registered cleanup callbacks
    const callbacks = this.cleanupCallbacks.get(suiteName) || [];
    for (const cleanup of callbacks) {
      try {
        cleanup();
      } catch (error) {
        console.warn(`Cleanup callback failed for suite ${suiteName}:`, error);
      }
    }

    // Remove the suite directory
    const suiteDir = this.suiteDirectories.get(suiteName);
    if (suiteDir && existsSync(suiteDir)) {
      try {
        rmSync(suiteDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to remove suite directory ${suiteDir}:`, error);
      }
    }

    // Clean up tracking
    this.suiteDirectories.delete(suiteName);
    this.cleanupCallbacks.delete(suiteName);
  }

  /**
   * Clean up all suites (for global teardown)
   */
  static async cleanupAll(): Promise<void> {
    const suiteNames = Array.from(this.suiteDirectories.keys());
    for (const suiteName of suiteNames) {
      await this.cleanupSuite(suiteName);
    }
  }
}

/**
 * E2E test context that provides direct access to MCP server
 */
export interface E2ETestContext {
  server: VibeFeatureMCPServer;
  tempProject: TempProject;
  cleanup: () => Promise<void>;
}

/**
 * Direct Server Interface
 * Provides a consumer-like interface that calls server methods directly
 * without going through MCP transport layer
 */
export class DirectServerInterface {
  constructor(private server: VibeFeatureMCPServer) {}

  /**
   * Call a tool on the server directly
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    try {
      // Call the server's tool handlers directly based on tool name
      switch (name) {
        case 'whats_next':
          return await this.server.handleWhatsNext(arguments_);
        
        case 'proceed_to_phase':
          return await this.server.handleProceedToPhase(arguments_);
        
        case 'start_development':
          return await this.server.handleStartDevelopment(arguments_);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      // Return errors as objects instead of throwing them
      // This matches the expected behavior in tests
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Read a resource from the server directly
   */
  async readResource(uri: string): Promise<any> {
    // Call the server's resource handlers directly based on URI
    switch (uri) {
      case 'state://current':
        return await this.getConversationState();
      
      case 'plan://current':
        return await this.getDevelopmentPlan();
      
      case 'system-prompt://':
        return await this.getSystemPrompt();
      
      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  }

  /**
   * Get conversation state directly
   */
  private async getConversationState(): Promise<any> {
    const conversationManager = this.server.getConversationManager();
    const conversationContext = await conversationManager.getConversationContext();
    
    const stateData = {
      conversationId: conversationContext.conversationId,
      currentPhase: conversationContext.currentPhase,
      projectPath: conversationContext.projectPath,
      timestamp: new Date().toISOString()
    };
    
    return {
      contents: [{
        uri: 'state://current',
        mimeType: 'application/json',
        text: JSON.stringify(stateData, null, 2)
      }]
    };
  }

  /**
   * Get development plan directly
   */
  private async getDevelopmentPlan(): Promise<any> {
    const conversationManager = this.server.getConversationManager();
    const planManager = this.server.getPlanManager();
    
    const conversationContext = await conversationManager.getConversationContext();
    const planFilePath = conversationContext.planFilePath;
    
    let planContent: string;
    try {
      planContent = await planManager.getPlanFileContent(planFilePath);
    } catch (error) {
      // If plan file doesn't exist yet, return a default message
      planContent = `# Development Plan\n\nPlan file will be created when development begins.\n\nConversation ID: ${conversationContext.conversationId}`;
    }
    
    return {
      contents: [{
        uri: 'plan://current',
        mimeType: 'text/markdown',
        text: planContent
      }]
    };
  }

  /**
   * Get system prompt resource directly
   */
  async getSystemPrompt(): Promise<any> {
    // Use the system prompt handler directly with the default workflow
    const { SystemPromptResourceHandler } = await import('../../src/server/resource-handlers/system-prompt.js');
    const handler = new SystemPromptResourceHandler();
    
    // Create a minimal context - system prompt doesn't need full server context
    const result = await handler.handle(new URL('system-prompt://'), {} as any);
    
    return {
      contents: [{
        uri: 'system-prompt://',
        mimeType: result.mimeType,
        text: result.text
      }]
    };
  }

  /**
   * List available tools (for testing completeness)
   */
  async listTools(): Promise<{ tools: { name: string }[] }> {
    return {
      tools: [
        { name: 'whats_next' },
        { name: 'proceed_to_phase' }
      ]
    };
  }

  /**
   * List available resources (for testing completeness)
   */
  async listResources(): Promise<{ resources: { uri: string }[] }> {
    return {
      resources: [
        { uri: 'state://current' },
        { uri: 'plan://current' },
        { uri: 'system-prompt://' }
      ]
    };
  }

  /**
   * Get a prompt (if we add prompt support later)
   */
  async getPrompt(name: string, arguments_: any = {}): Promise<any> {
    // For now, just return a placeholder
    return {
      description: `Prompt for ${name}`,
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Prompt: ${name} with args: ${JSON.stringify(arguments_)}`
        }
      }]
    };
  }
}

/**
 * Setup end-to-end test environment with real MCP server
 */
export async function setupE2ETest(options: {
  tempProject: TempProject;
  serverConfig?: Partial<ServerConfig>;
} = {} as any): Promise<E2ETestContext> {
  const { tempProject, serverConfig = {} } = options;

  // Create server with test configuration
  const server = new VibeFeatureMCPServer({
    projectPath: tempProject.projectPath,
    enableLogging: false, // Disable logging in tests
    ...serverConfig
  });

  // Initialize server
  await server.initialize();

  return {
    server,
    tempProject,
    cleanup: async () => {
      await server.cleanup();
    }
  };
}

/**
 * Create direct server interface for testing
 */
export function createDirectServerInterface(server: VibeFeatureMCPServer): DirectServerInterface {
  return new DirectServerInterface(server);
}

/**
 * Helper to safely parse JSON responses, handling both success and error cases
 */
export function parseToolResponse(result: any): any {
  // If result is already an object (direct server call), return as-is
  if (typeof result === 'object' && result !== null) {
    return result;
  }
  
  // If it's a string, try to parse as JSON
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch (error) {
      return { error: result };
    }
  }
  
  return result;
}

/**
 * Assert that a tool call was successful and return the response
 */
export function assertToolSuccess(result: any): any {
  // Parse result if it's a string
  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  
  if (parsed.error) {
    throw new Error(`Tool call failed: ${parsed.error}`);
  }
  
  return parsed;
}

/**
 * Initialize development for tests by calling start_development with a workflow
 * This must be called before any other tools in tests due to the new requirement
 * 
 * @param client - The DirectServerInterface instance
 * @param workflow - The workflow to use (defaults to 'waterfall')
 * @param commitBehaviour - The commit behavior to use (defaults to 'none' for tests)
 * @returns The response from start_development
 */
export async function initializeDevelopment(
  client: DirectServerInterface, 
  workflow: string = 'waterfall',
  commitBehaviour: 'step' | 'phase' | 'end' | 'none' = 'none'
): Promise<any> {
  const result = await client.callTool('start_development', { 
    workflow,
    commit_behaviour: commitBehaviour
  });
  return assertToolSuccess(result);
}

/**
 * Helper to create a complete E2E test scenario
 */
export async function createE2EScenario(options: {
  tempProject: TempProject;
  serverConfig?: Partial<ServerConfig>;
}): Promise<{
  client: DirectServerInterface;
  server: VibeFeatureMCPServer;
  tempProject: TempProject;
  cleanup: () => Promise<void>;
}> {
  const context = await setupE2ETest(options);
  const client = createDirectServerInterface(context.server);

  return {
    client,
    server: context.server,
    tempProject: context.tempProject,
    cleanup: context.cleanup
  };
}

/**
 * Create a suite-isolated E2E scenario
 * Each test suite gets its own isolated temporary directory
 */
export async function createSuiteIsolatedE2EScenario(options: {
  suiteName: string;
  tempProjectFactory: (baseDir?: string) => TempProject;
  serverConfig?: Partial<ServerConfig>;
}): Promise<{
  client: DirectServerInterface;
  server: VibeFeatureMCPServer;
  tempProject: TempProject;
  cleanup: () => Promise<void>;
}> {
  const { suiteName, tempProjectFactory, serverConfig = {} } = options;
  
  // Get suite-isolated directory
  const suiteDir = TestSuiteIsolation.getSuiteDirectory(suiteName);
  
  // Create temp project in the suite directory
  const tempProject = tempProjectFactory(suiteDir);
  
  // Register temp project cleanup with the suite
  TestSuiteIsolation.registerCleanup(suiteName, () => {
    tempProject.cleanup();
  });

  const context = await setupE2ETest({ tempProject, serverConfig });
  const client = createDirectServerInterface(context.server);

  return {
    client,
    server: context.server,
    tempProject: context.tempProject,
    cleanup: context.cleanup
  };
}
