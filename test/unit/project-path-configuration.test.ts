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
      
      // Verify the project path was used by checking the server context
      const context = (server as any).context;
      expect(context).toBeDefined();
      expect(context.projectPath).toBe(testProjectPath);
      
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
      
      // Verify config takes precedence over environment variable
      const context = (server as any).context;
      expect(context).toBeDefined();
      expect(context.projectPath).toBe(configProjectPath);
      
      // Clean up
      await server.cleanup();
    });

    it('should fall back to process.cwd() when no project path is provided', async () => {
      // Ensure no environment variable is set
      delete process.env.VIBE_PROJECT_PATH;
      
      // Create server without project path
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify fallback to process.cwd()
      const context = (server as any).context;
      expect(context).toBeDefined();
      expect(context.projectPath).toBe(process.cwd());
      
      // Clean up
      await server.cleanup();
    });
  });

  describe('start_development Tool Schema', () => {
    it('should accept projectPath parameter', async () => {
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      const customProjectPath = '/custom/path';
      
      // Mock successful conversation creation
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'test-id',
        projectPath: customProjectPath,
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: `${customProjectPath}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Mock transition engine
      const mockHandleExplicitTransition = vi.fn().mockResolvedValue({
        newPhase: 'requirements',
        success: true
      });
      
      // Replace the conversation manager and transition engine methods
      const context = (server as any).context;
      if (context?.conversationManager) {
        context.conversationManager.createConversationContext = mockCreateConversationContext;
      }
      if (context?.transitionEngine) {
        context.transitionEngine.handleExplicitTransition = mockHandleExplicitTransition;
      }
      
      // Test start_development with projectPath parameter
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        projectPath: customProjectPath
      });
      
      // Verify the result
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('conversation_id', 'test-id');
      
      // Verify that createConversationContext was called with the custom project path
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall', customProjectPath);
      
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
      
      // Mock transition engine
      const mockHandleExplicitTransition = vi.fn().mockResolvedValue({
        newPhase: 'requirements',
        success: true
      });
      
      // Replace the conversation manager and transition engine methods
      const context = (server as any).context;
      if (context?.conversationManager) {
        context.conversationManager.createConversationContext = mockCreateConversationContext;
      }
      if (context?.transitionEngine) {
        context.transitionEngine.handleExplicitTransition = mockHandleExplicitTransition;
      }
      
      // Test start_development without projectPath parameter
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall'
      });
      
      // Verify the result
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('conversation_id', 'test-id');
      
      // Verify that createConversationContext was called with the server's default project path
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall', process.cwd());
      
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
      
      // Verify server context uses the environment variable project path
      const context = (server as any).context;
      expect(context).toBeDefined();
      expect(context.projectPath).toBe(testProjectPath);
      
      // Test that tools can access the configured project path
      // by creating a conversation and verifying the project path is passed correctly
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'integration-test-id',
        projectPath: testProjectPath,
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: `${testProjectPath}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Mock transition engine
      const mockHandleExplicitTransition = vi.fn().mockResolvedValue({
        newPhase: 'requirements',
        success: true
      });
      
      // Replace the conversation manager and transition engine methods
      if (context?.conversationManager) {
        context.conversationManager.createConversationContext = mockCreateConversationContext;
      }
      if (context?.transitionEngine) {
        context.transitionEngine.handleExplicitTransition = mockHandleExplicitTransition;
      }
      
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall'
      });
      
      // Verify the project path from environment variable was used
      expect(result).toHaveProperty('conversation_id', 'integration-test-id');
      
      // Verify that createConversationContext was called with the environment variable project path
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall', testProjectPath);
      
      // Clean up
      await server.cleanup();
    });

    it('should prioritize tool parameter over environment variable', async () => {
      // Set environment variable
      process.env.VIBE_PROJECT_PATH = '/env/project/path';
      
      // Create and initialize server
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      const toolProjectPath = '/tool/parameter/path';
      
      // Mock conversation creation
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'priority-test-id',
        projectPath: toolProjectPath,
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: `${toolProjectPath}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Mock transition engine
      const mockHandleExplicitTransition = vi.fn().mockResolvedValue({
        newPhase: 'requirements',
        success: true
      });
      
      // Replace the methods
      const context = (server as any).context;
      if (context?.conversationManager) {
        context.conversationManager.createConversationContext = mockCreateConversationContext;
      }
      if (context?.transitionEngine) {
        context.transitionEngine.handleExplicitTransition = mockHandleExplicitTransition;
      }
      
      // Call start_development with explicit projectPath parameter
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        projectPath: toolProjectPath
      });
      
      // Verify the tool parameter project path was used, not the environment variable
      expect(result).toHaveProperty('conversation_id', 'priority-test-id');
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall', toolProjectPath);
      
      // Clean up
      await server.cleanup();
    });
  });
});
