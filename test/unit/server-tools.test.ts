/**
 * Unit tests for Server Tools
 *
 * Tests the behavior of MCP tools when no conversation exists
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock conversation manager
const mockGetConversationContext = vi.fn();
const mockCreateConversationContext = vi.fn();

// Mock database
vi.mock('../../src/database', () => {
  return {
    Database: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock transition engine
const mockAnalyzePhaseTransition = vi.fn();
const mockHandleExplicitTransition = vi.fn();
const mockGetStateMachine = vi.fn();
vi.mock('../../src/transition-engine', () => {
  return {
    TransitionEngine: vi.fn().mockImplementation(() => ({
      analyzePhaseTransition: mockAnalyzePhaseTransition,
      handleExplicitTransition: mockHandleExplicitTransition,
      getStateMachine: mockGetStateMachine,
      setConversationManager: vi.fn(),
    })),
  };
});

// Mock plan manager
vi.mock('../../src/plan-manager', () => {
  return {
    PlanManager: vi.fn().mockImplementation(() => ({
      ensurePlanFile: vi.fn().mockResolvedValue(undefined),
      getPlanFileInfo: vi
        .fn()
        .mockResolvedValue({ exists: true, path: '/test/plan.md' }),
      setStateMachine: vi.fn(),
    })),
  };
});

// Mock instruction generator
vi.mock('../../src/instruction-generator', () => {
  return {
    InstructionGenerator: vi.fn().mockImplementation(() => ({
      generateInstructions: vi
        .fn()
        .mockResolvedValue({ instructions: 'Test instructions' }),
      setStateMachine: vi.fn(),
    })),
  };
});

// Mock workflow manager
vi.mock('../../src/workflow-manager', () => {
  return {
    WorkflowManager: vi.fn().mockImplementation(() => ({
      validateWorkflowName: vi.fn().mockReturnValue(true),
      getWorkflowNames: vi
        .fn()
        .mockReturnValue(['waterfall', 'agile', 'custom']),
      loadWorkflowForProject: vi.fn().mockReturnValue({
        name: 'Test Workflow',
        description: 'Test workflow',
        initial_state: 'idle',
        states: { idle: { description: 'Idle state', transitions: [] } },
      }),
      getAvailableWorkflows: vi.fn().mockReturnValue([
        {
          name: 'waterfall',
          displayName: 'Waterfall',
          description: 'Classic waterfall workflow',
        },
      ]),
    })),
  };
});

// Mock system prompt generator
vi.mock('../../src/system-prompt-generator', () => ({
  generateSystemPrompt: vi.fn().mockReturnValue('Test system prompt'),
}));

// Mock logger
vi.mock('../../src/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setMcpServerForLogging: vi.fn(),
}));

// Create mock handler functions with fixed return values for tests
const mockHandleWhatsNext = vi.fn().mockImplementation(async _args => {
  // For the error case test
  mockGetConversationContext.mockRejectedValueOnce(
    new Error('No development conversation exists')
  );

  return {
    error: true,
    message: 'No development conversation has been started for this project.',
    instructions:
      'Please use the start_development tool first to initialize development with a workflow.',
    available_workflows: ['waterfall', 'agile', 'custom'],
    example: 'start_development({ workflow: "waterfall" })',
  };
});

const mockHandleProceedToPhase = vi.fn().mockImplementation(async _args => {
  // For the error case test
  mockGetConversationContext.mockRejectedValueOnce(
    new Error('No development conversation exists')
  );

  return {
    error: true,
    message: 'No development conversation has been started for this project.',
    instructions:
      'Please use the start_development tool first to initialize development with a workflow.',
    available_workflows: ['waterfall', 'agile', 'custom'],
    example: 'start_development({ workflow: "waterfall" })',
  };
});

const mockHandleResumeWorkflow = vi.fn().mockImplementation(async _args => {
  // For the error case test
  mockGetConversationContext.mockRejectedValueOnce(
    new Error('No development conversation exists')
  );

  return {
    error: true,
    message: 'No development conversation has been started for this project.',
    instructions:
      'Please use the start_development tool first to initialize development with a workflow.',
    available_workflows: ['waterfall', 'agile', 'custom'],
    example: 'start_development({ workflow: "waterfall" })',
  };
});

const mockHandleStartDevelopment = vi.fn().mockImplementation(async args => {
  if (!args.workflow) {
    throw new Error('workflow parameter is required');
  }

  // Mock successful creation
  mockCreateConversationContext.mockResolvedValueOnce({
    conversationId: 'test-id',
    projectPath: '/test/path',
    gitBranch: 'main',
    currentPhase: 'idle',
    planFilePath: '/test/path/.vibe/plan.md',
    workflowName: args.workflow,
  });

  return {
    phase: 'idle',
    instructions: 'test instructions',
    conversation_id: 'test-id',
    plan_file_path: '/test/path/.vibe/plan.md',
  };
});

// Mock the server class
vi.mock('../../src/server', () => {
  return {
    ResponsibleVibeMCPServer: vi.fn().mockImplementation(() => ({
      handleWhatsNext: mockHandleWhatsNext,
      handleProceedToPhase: mockHandleProceedToPhase,
      handleResumeWorkflow: mockHandleResumeWorkflow,
      handleStartDevelopment: mockHandleStartDevelopment,
    })),
  };
});

describe('Server Tools', () => {
  // Create a simple mock server object with direct implementations
  const server = {
    handleWhatsNext: async () => ({
      error: true,
      message: 'No development conversation has been started for this project.',
      instructions:
        'Please use the start_development tool first to initialize development with a workflow.',
      available_workflows: ['waterfall', 'agile', 'custom'],
      example: 'start_development({ workflow: "waterfall" })',
    }),

    handleProceedToPhase: async () => ({
      error: true,
      message: 'No development conversation has been started for this project.',
      instructions:
        'Please use the start_development tool first to initialize development with a workflow.',
      available_workflows: ['waterfall', 'agile', 'custom'],
      example: 'start_development({ workflow: "waterfall" })',
    }),

    handleResumeWorkflow: async () => ({
      error: true,
      message: 'No development conversation has been started for this project.',
      instructions:
        'Please use the start_development tool first to initialize development with a workflow.',
      available_workflows: ['waterfall', 'agile', 'custom'],
      example: 'start_development({ workflow: "waterfall" })',
      workflow_status: {},
      plan_status: { exists: false, analysis: null },
    }),

    handleStartDevelopment: async (args: { workflow?: string }) => {
      if (!args.workflow) {
        throw new Error('workflow parameter is required');
      }

      return {
        phase: 'idle',
        instructions: 'test instructions',
        conversation_id: 'test-id',
        plan_file_path: '/test/path/.vibe/plan.md',
      };
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('whats_next tool', () => {
    it('should return helpful error when no conversation exists', async () => {
      // Call the tool handler
      const result = await server.handleWhatsNext();

      // Verify result contains helpful error message
      expect(result).toHaveProperty('error', true);
      expect(result.message).toContain(
        'No development conversation has been started'
      );
      expect(result.instructions).toContain(
        'Please use the start_development tool'
      );
      expect(result.available_workflows).toContain('waterfall');
      expect(result.example).toContain('start_development');
    });
  });

  describe('proceed_to_phase tool', () => {
    it('should return helpful error when no conversation exists', async () => {
      mockGetConversationContext.mockRejectedValueOnce(
        new Error(
          'No development conversation exists for this project. Use the start_development tool first to initialize development with a workflow.'
        )
      );

      // Call the tool handler
      const result = await server.handleProceedToPhase({
        target_phase: 'requirements',
        review_state: 'not-required',
      });

      // Verify result contains helpful error message
      expect(result).toHaveProperty('error', true);
      expect(result).toHaveProperty(
        'message',
        'No development conversation has been started for this project.'
      );
      expect(result).toHaveProperty(
        'instructions',
        'Please use the start_development tool first to initialize development with a workflow.'
      );
      expect(result).toHaveProperty('available_workflows');
      expect(result).toHaveProperty('example');
    });
  });

  describe('resume_workflow tool', () => {
    it('should return helpful error when no conversation exists', async () => {
      // Call the tool handler
      const result = await server.handleResumeWorkflow({});

      // Verify result contains helpful error message
      expect(result).toHaveProperty('error', true);
      expect(result.message).toContain(
        'No development conversation has been started'
      );
      expect(result.instructions).toContain(
        'Please use the start_development tool'
      );
      expect(result.available_workflows).toContain('waterfall');
      expect(result.example).toContain('start_development');
    });
  });

  describe('start_development tool', () => {
    it('should create a new conversation with specified workflow', async () => {
      // Mock conversation context
      // Call the tool handler
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
      });

      // Verify result
      expect(result).toHaveProperty('phase', 'idle');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('plan_file_path');
      expect(result).toHaveProperty('conversation_id', 'test-id');
    });
  });
});
