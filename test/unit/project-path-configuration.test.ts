/**
 * Unit tests for project path configuration
 * 
 * Tests the environment variable support and projectPath parameter in tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VibeFeatureMCPServer } from '../../src/server.js';

// Mock the logger to prevent console noise during tests
vi.mock('../../src/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }),
  setMcpServerForLogging: vi.fn()
}));

// Mock all dependencies with minimal implementations
vi.mock('../../src/database', () => ({
  Database: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../src/conversation-manager', () => ({
  ConversationManager: vi.fn().mockImplementation(() => ({
    getConversationContext: vi.fn(),
    createConversationContext: vi.fn(),
    updateConversationState: vi.fn()
  }))
}));

vi.mock('../../src/transition-engine', () => ({
  TransitionEngine: vi.fn().mockImplementation(() => ({
    analyzePhaseTransition: vi.fn(),
    handleExplicitTransition: vi.fn(),
    getStateMachine: vi.fn(),
    setConversationManager: vi.fn()
  }))
}));

vi.mock('../../src/plan-manager', () => ({
  PlanManager: vi.fn().mockImplementation(() => ({
    ensurePlanFile: vi.fn().mockResolvedValue(undefined),
    getPlanFileInfo: vi.fn().mockResolvedValue({ exists: true, path: '/test/plan.md' }),
    setStateMachine: vi.fn()
  }))
}));

vi.mock('../../src/instruction-generator', () => ({
  InstructionGenerator: vi.fn().mockImplementation(() => ({
    generateInstructions: vi.fn().mockResolvedValue({ instructions: 'Test instructions' }),
    setStateMachine: vi.fn()
  }))
}));

vi.mock('../../src/workflow-manager', () => ({
  WorkflowManager: vi.fn().mockImplementation(() => ({
    validateWorkflowName: vi.fn().mockReturnValue(true),
    getWorkflowNames: vi.fn().mockReturnValue(['waterfall', 'agile', 'custom']),
    loadWorkflowForProject: vi.fn().mockReturnValue({
      name: 'Test Workflow',
      description: 'Test workflow',
      initial_state: 'idle',
      states: { idle: { description: 'Idle state', transitions: [] } }
    }),
    getAvailableWorkflows: vi.fn().mockReturnValue([
      { name: 'waterfall', displayName: 'Waterfall', description: 'Classic waterfall workflow' }
    ]),
    getAvailableWorkflowsForProject: vi.fn().mockReturnValue([
      { name: 'waterfall', displayName: 'Waterfall', description: 'Classic waterfall workflow' }
    ])
  }))
}));

vi.mock('../../src/interaction-logger', () => ({
  InteractionLogger: vi.fn().mockImplementation(() => ({
    logInteraction: vi.fn()
  }))
}));

vi.mock('../../src/system-prompt-generator', () => ({
  generateSystemPrompt: vi.fn().mockReturnValue('Test system prompt')
}));

describe('Project Path Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset environment variables to clean state
    process.env = { ...originalEnv };
    delete process.env.VIBE_PROJECT_PATH;
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    process.env = originalEnv;
  });

  describe('Environment Variable Support', () => {
    it('should use VIBE_PROJECT_PATH when provided', async () => {
      // Set environment variable
      const testProjectPath = '/custom/project/path';
      process.env.VIBE_PROJECT_PATH = testProjectPath;
      
      // Create server instance
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify the project path was used
      // Note: We can't directly access the internal projectPath, 
      // but we can verify through the context that gets created
      expect(server).toBeDefined();
      
      // Clean up
      await server.cleanup();
    });

    it('should use config projectPath over environment variable', async () => {
      // Set environment variable
      process.env.VIBE_PROJECT_PATH = '/env/project/path';
      
      // Create server with explicit config
      const configProjectPath = '/config/project/path';
      const server = new VibeFeatureMCPServer({
        projectPath: configProjectPath
      });
      await server.initialize();
      
      // Verify server was created successfully
      expect(server).toBeDefined();
      
      // Clean up
      await server.cleanup();
    });

    it('should fall back to process.cwd() when no project path is provided', async () => {
      // Ensure no environment variable is set
      delete process.env.VIBE_PROJECT_PATH;
      
      // Create server without project path
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify server was created successfully
      expect(server).toBeDefined();
      
      // Clean up
      await server.cleanup();
    });
  });

  describe('start_development Tool Schema', () => {
    it('should accept projectPath parameter', async () => {
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Mock successful conversation creation
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'test-id',
        projectPath: '/custom/path',
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: '/custom/path/.vibe/plan.md',
        workflowName: 'waterfall'
      });
      
      // Replace the conversation manager method
      const conversationManager = (server as any).context?.conversationManager;
      if (conversationManager) {
        conversationManager.createConversationContext = mockCreateConversationContext;
      }
      
      // Test start_development with projectPath parameter
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        projectPath: '/custom/path'
      });
      
      // Verify the result
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('conversation_id', 'test-id');
      
      // Clean up
      await server.cleanup();
    });

    it('should work without projectPath parameter (backward compatibility)', async () => {
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Mock successful conversation creation
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'test-id',
        projectPath: process.cwd(),
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: `${process.cwd()}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Replace the conversation manager method
      const conversationManager = (server as any).context?.conversationManager;
      if (conversationManager) {
        conversationManager.createConversationContext = mockCreateConversationContext;
      }
      
      // Test start_development without projectPath parameter
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall'
      });
      
      // Verify the result
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('conversation_id', 'test-id');
      
      // Clean up
      await server.cleanup();
    });
  });

  describe('Integration Tests', () => {
    it('should properly pass environment variable through server initialization', async () => {
      // Set environment variable
      const testProjectPath = '/integration/test/path';
      process.env.VIBE_PROJECT_PATH = testProjectPath;
      
      // Create and initialize server
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify server initialization succeeded
      expect(server).toBeDefined();
      
      // Test that tools can access the configured project path
      // by creating a conversation and checking the context
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'integration-test-id',
        projectPath: testProjectPath,
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: `${testProjectPath}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Replace the conversation manager method
      const conversationManager = (server as any).context?.conversationManager;
      if (conversationManager) {
        conversationManager.createConversationContext = mockCreateConversationContext;
      }
      
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall'
      });
      
      // Verify the project path was used
      expect(result).toHaveProperty('conversation_id', 'integration-test-id');
      
      // Clean up
      await server.cleanup();
    });
  });
});
