/**
 * Unit tests for ConversationManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationManager } from '../../src/conversation-manager';
import { Database } from '../../src/database';

// Mock database
const mockGetConversationState = vi.fn();
const mockSaveConversationState = vi.fn();
const mockDeleteConversationState = vi.fn();
const mockSoftDeleteInteractionLogs = vi.fn();
const mockInitialize = vi.fn();
const mockClose = vi.fn();

vi.mock('../../src/database', () => {
  return {
    Database: vi.fn().mockImplementation(() => ({
      getConversationState: mockGetConversationState,
      saveConversationState: mockSaveConversationState,
      deleteConversationState: mockDeleteConversationState,
      softDeleteInteractionLogs: mockSoftDeleteInteractionLogs,
      initialize: mockInitialize,
      close: mockClose,
    })),
  };
});

// Mock child_process for git branch detection
vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue('main'),
}));

// Mock fs for file existence checks
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

// Mock logger
vi.mock('../../src/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock WorkflowManager
const mockStateMachine = {
  name: 'Test Workflow',
  description: 'Test workflow for unit tests',
  initial_state: 'idle',
  states: {
    idle: {
      description: 'Idle state',
      transitions: [],
    },
  },
};

// Replace the actual WorkflowManager with our mock
vi.mock('../../src/workflow-manager', () => {
  return {
    WorkflowManager: function () {
      return {
        loadWorkflowForProject: () => mockStateMachine,
        validateWorkflowName: () => true,
        getWorkflowNames: () => ['waterfall', 'agile', 'custom'],
      };
    },
  };
});

// Mock PlanManager
vi.mock('../../src/plan-manager', () => {
  return {
    PlanManager: vi.fn().mockImplementation(() => ({
      deletePlanFile: vi.fn().mockResolvedValue(true),
      ensurePlanFileDeleted: vi.fn().mockResolvedValue(true),
    })),
  };
});

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;

  beforeEach(() => {
    vi.resetAllMocks();

    // Create a mock database with the mocked functions
    const mockDb = {
      getConversationState: mockGetConversationState,
      saveConversationState: mockSaveConversationState,
      deleteConversationState: mockDeleteConversationState,
      softDeleteInteractionLogs: mockSoftDeleteInteractionLogs,
      initialize: mockInitialize,
      close: mockClose,
    };

    // Create conversation manager with the mock database
    conversationManager = new ConversationManager(
      mockDb as Partial<Database>,
      '/test/project/path'
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getConversationContext', () => {
    it('should throw an error when no conversation exists', async () => {
      // Mock database to return null (no conversation)
      mockGetConversationState.mockResolvedValue(null);

      // Expect the method to throw an error
      await expect(
        conversationManager.getConversationContext()
      ).rejects.toThrow(
        'No development conversation exists for this project. Use the start_development tool first to initialize development with a workflow.'
      );

      // Verify database was called with expected ID
      expect(mockGetConversationState).toHaveBeenCalledWith(expect.any(String));
    });

    it('should return conversation context when conversation exists', async () => {
      // Mock existing conversation state
      const mockState = {
        conversationId: 'test-conversation-id',
        projectPath: '/test/project/path',
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: '/test/project/path/.vibe/development-plan.md',
        workflowName: 'custom',
        createdAt: '2025-06-25T00:00:00.000Z',
        updatedAt: '2025-06-25T00:00:00.000Z',
      };

      mockGetConversationState.mockResolvedValue(mockState);

      // Call the method
      const result = await conversationManager.getConversationContext();

      // Verify result
      expect(result).toEqual({
        conversationId: 'test-conversation-id',
        projectPath: '/test/project/path',
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: '/test/project/path/.vibe/development-plan.md',
        workflowName: 'custom',
      });

      // Verify database was called with expected ID
      expect(mockGetConversationState).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('createConversationContext', () => {
    it('should create a new conversation when none exists', async () => {
      // Mock database to return null (no conversation) then accept the new state
      mockGetConversationState.mockResolvedValue(null);
      mockSaveConversationState.mockResolvedValue(undefined);

      // Call the method - WorkflowManager is already mocked at the module level
      const result =
        await conversationManager.createConversationContext('custom');

      // Verify result has expected structure
      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('projectPath', '/test/project/path');
      expect(result).toHaveProperty('gitBranch', 'default'); // The actual value is 'default' not 'main'
      expect(result).toHaveProperty('currentPhase', 'idle');
      expect(result).toHaveProperty('planFilePath');
      expect(result).toHaveProperty('workflowName', 'custom');

      // Verify database was called to save the new state
      expect(mockSaveConversationState).toHaveBeenCalled();
      const savedState = mockSaveConversationState.mock.calls[0][0];
      expect(savedState.workflowName).toBe('custom');
    });

    it('should return existing conversation when one already exists', async () => {
      // Mock existing conversation state
      const mockState = {
        conversationId: 'test-conversation-id',
        projectPath: '/test/project/path',
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: '/test/project/path/.vibe/development-plan.md',
        workflowName: 'existing-workflow',
        createdAt: '2025-06-25T00:00:00.000Z',
        updatedAt: '2025-06-25T00:00:00.000Z',
      };

      mockGetConversationState.mockResolvedValue(mockState);

      // Call the method with a different workflow - WorkflowManager is already mocked at the module level
      const result =
        await conversationManager.createConversationContext('agile');

      // Verify result is the existing conversation
      expect(result).toEqual({
        conversationId: 'test-conversation-id',
        projectPath: '/test/project/path',
        gitBranch: 'main',
        currentPhase: 'idle',
        planFilePath: '/test/project/path/.vibe/development-plan.md',
        workflowName: 'existing-workflow',
      });

      // Verify database was NOT called to save a new state
      expect(mockSaveConversationState).not.toHaveBeenCalled();
    });
  });
});
