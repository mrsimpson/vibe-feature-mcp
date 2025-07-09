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
    createConversationContext: vi.fn().mockResolvedValue({
      conversationId: 'test-id',
      projectPath: '/test/path',
      gitBranch: 'main',
      currentPhase: 'ideation',
      planFilePath: '/test/path/.vibe/plan.md',
      workflowName: 'waterfall'
    }),
    updateConversationState: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../src/transition-engine', () => ({
  TransitionEngine: vi.fn().mockImplementation(() => ({
    analyzePhaseTransition: vi.fn(),
    handleExplicitTransition: vi.fn().mockResolvedValue({ newPhase: 'ideation' }),
    getStateMachine: vi.fn(),
    setConversationManager: vi.fn()
  }))
}));

vi.mock('../../src/plan-manager', () => ({
  PlanManager: vi.fn().mockImplementation(() => ({
    ensurePlanFile: vi.fn().mockResolvedValue('/test/plan.md'),
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
      initial_state: 'ideation',
      states: { ideation: { description: 'Ideation state', transitions: [] } }
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

vi.mock('../../src/git-manager', () => ({
  GitManager: {
    isGitRepository: vi.fn().mockReturnValue(false),
    getCurrentCommitHash: vi.fn().mockReturnValue(null)
  }
}));

describe('Project Path Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables to clean state
    process.env = { ...originalEnv };
    delete process.env.PROJECT_PATH;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  describe('Environment Variable Support', () => {
    it('should use PROJECT_PATH when provided', async () => {
      // Set environment variable
      const testProjectPath = '/custom/project/path';
      process.env.PROJECT_PATH = testProjectPath;
      
      // Create server instance
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify the project path was used - check the effective project path
      const projectPath = server.getProjectPath();
      expect(projectPath).toBe(testProjectPath);
      
      // Clean up
      await server.cleanup();
    });

    it('should use config projectPath over environment variable', async () => {
      // Set environment variable
      process.env.PROJECT_PATH = '/env/project/path';
      
      // Create server with explicit config
      const configProjectPath = '/config/project/path';
      const server = new VibeFeatureMCPServer({
        projectPath: configProjectPath
      });
      await server.initialize();
      
      // Verify config takes precedence over environment variable
      const projectPath = server.getProjectPath();
      expect(projectPath).toBe(configProjectPath);
      
      // Clean up
      await server.cleanup();
    });

    it('should fall back to process.cwd() when no project path is provided', async () => {
      // Ensure no environment variable is set
      delete process.env.PROJECT_PATH;
      
      // Create server without project path
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify fallback to process.cwd()
      const projectPath = server.getProjectPath();
      expect(projectPath).toBe(process.cwd());
      
      // Clean up
      await server.cleanup();
    });
  });

  describe('start_development Tool Schema', () => {
    it('should work with environment variable configuration', async () => {
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      const mockConversationManager = server.getConversationManager();
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'test-id',
        projectPath: server.getProjectPath(),
        gitBranch: 'main',
        currentPhase: 'ideation',
        planFilePath: `${server.getProjectPath()}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Replace the conversation manager method
      mockConversationManager.createConversationContext = mockCreateConversationContext;
      
      // Test start_development (no projectPath parameter needed)
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        commit_behaviour: 'none'
      });
      
      // Verify the result
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('conversation_id', 'test-id');
      
      // Verify createConversationContext was called with workflow only
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall');
      
      // Clean up
      await server.cleanup();
    });

    it('should work without any optional parameters (backward compatibility)', async () => {
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      const mockConversationManager = server.getConversationManager();
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'test-id',
        projectPath: process.cwd(),
        gitBranch: 'main',
        currentPhase: 'ideation',
        planFilePath: `${process.cwd()}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Replace the conversation manager method
      mockConversationManager.createConversationContext = mockCreateConversationContext;
      
      // Test start_development with minimal parameters
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall'
      });
      
      // Verify the result
      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('conversation_id', 'test-id');
      
      // Verify createConversationContext was called with workflow only
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall');
      
      // Clean up
      await server.cleanup();
    });
  });

  describe('Integration Tests', () => {
    it('should properly pass environment variable through server initialization', async () => {
      // Set environment variable
      const testProjectPath = '/integration/test/path';
      process.env.PROJECT_PATH = testProjectPath;
      
      // Create and initialize server
      const server = new VibeFeatureMCPServer();
      await server.initialize();
      
      // Verify server initialization succeeded with correct project path
      expect(server.getProjectPath()).toBe(testProjectPath);
      
      const mockConversationManager = server.getConversationManager();
      const mockCreateConversationContext = vi.fn().mockResolvedValue({
        conversationId: 'integration-test-id',
        projectPath: testProjectPath,
        gitBranch: 'main',
        currentPhase: 'ideation',
        planFilePath: `${testProjectPath}/.vibe/plan.md`,
        workflowName: 'waterfall'
      });
      
      // Replace the conversation manager method
      mockConversationManager.createConversationContext = mockCreateConversationContext;
      
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        commit_behaviour: 'none'
      });
      
      // Verify the project path was used correctly
      expect(result).toHaveProperty('conversation_id', 'integration-test-id');
      // Environment variable support works at server level, not tool parameter level
      expect(mockCreateConversationContext).toHaveBeenCalledWith('waterfall');
      
      // Clean up
      await server.cleanup();
    });
  });
});
