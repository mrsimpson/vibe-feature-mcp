/**
 * Test the new commit_behaviour interface
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StartDevelopmentHandler } from '../src/server/tool-handlers/start-development.js';
import * as GitManagerModule from '../src/git-manager.js';
import type { ServerContext } from '../src/server/types.js';

// Spy on GitManager methods
const isGitRepositorySpy = vi.spyOn(
  GitManagerModule.GitManager,
  'isGitRepository'
);
const getCurrentCommitHashSpy = vi.spyOn(
  GitManagerModule.GitManager,
  'getCurrentCommitHash'
);

describe('Commit Behaviour Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isGitRepositorySpy.mockReturnValue(true);
    getCurrentCommitHashSpy.mockReturnValue('abc123');
  });

  it('should translate commit_behaviour "step" to correct git config', async () => {
    const handler = new StartDevelopmentHandler();
    const mockContext = {
      projectPath: '/test/path',
      conversationManager: {
        createConversationContext: vi
          .fn()
          .mockResolvedValue({ conversationId: 'test' }),
        updateConversationState: vi.fn().mockResolvedValue(undefined),
      },
      workflowManager: {
        validateWorkflowName: vi.fn().mockReturnValue(true),
        loadWorkflowForProject: vi
          .fn()
          .mockReturnValue({ name: 'minor', phases: ['explore', 'implement'] }),
      },
      transitionEngine: {
        handleExplicitTransition: vi
          .fn()
          .mockResolvedValue({ newPhase: 'explore' }),
      },
      planManager: {
        ensurePlanFile: vi.fn().mockResolvedValue('/test/plan.md'),
      },
      instructionGenerator: {
        generateInstructions: vi.fn().mockReturnValue('Test instructions'),
      },
    };

    const result = await handler.handle(
      {
        workflow: 'minor',
        commit_behaviour: 'step',
      },
      mockContext as ServerContext
    );

    // Verify the handler processed the commit_behaviour parameter
    expect(result).toBeTruthy();
    expect(
      mockContext.conversationManager.updateConversationState
    ).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        gitCommitConfig: expect.objectContaining({
          enabled: true,
          commitOnStep: true,
          commitOnPhase: false,
          commitOnComplete: true, // Should be true when step commits are enabled
        }),
      })
    );
  });

  it('should translate commit_behaviour "phase" to correct git config', async () => {
    const handler = new StartDevelopmentHandler();
    const mockContext = {
      projectPath: '/test/path',
      conversationManager: {
        createConversationContext: vi
          .fn()
          .mockResolvedValue({ conversationId: 'test' }),
        updateConversationState: vi.fn().mockResolvedValue(undefined),
      },
      workflowManager: {
        validateWorkflowName: vi.fn().mockReturnValue(true),
        loadWorkflowForProject: vi
          .fn()
          .mockReturnValue({ name: 'minor', phases: ['explore', 'implement'] }),
      },
      transitionEngine: {
        handleExplicitTransition: vi
          .fn()
          .mockResolvedValue({ newPhase: 'explore' }),
      },
      planManager: {
        ensurePlanFile: vi.fn().mockResolvedValue('/test/plan.md'),
      },
      instructionGenerator: {
        generateInstructions: vi.fn().mockReturnValue('Test instructions'),
      },
    };

    await handler.handle(
      {
        workflow: 'minor',
        commit_behaviour: 'phase',
      },
      mockContext as ServerContext
    );

    expect(
      mockContext.conversationManager.updateConversationState
    ).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        gitCommitConfig: expect.objectContaining({
          enabled: true,
          commitOnStep: false,
          commitOnPhase: true,
          commitOnComplete: true, // Should be true when phase commits are enabled
        }),
      })
    );
  });

  it('should translate commit_behaviour "end" to correct git config', async () => {
    const handler = new StartDevelopmentHandler();
    const mockContext = {
      projectPath: '/test/path',
      conversationManager: {
        createConversationContext: vi
          .fn()
          .mockResolvedValue({ conversationId: 'test' }),
        updateConversationState: vi.fn().mockResolvedValue(undefined),
      },
      workflowManager: {
        validateWorkflowName: vi.fn().mockReturnValue(true),
        loadWorkflowForProject: vi
          .fn()
          .mockReturnValue({ name: 'minor', phases: ['explore', 'implement'] }),
      },
      transitionEngine: {
        handleExplicitTransition: vi
          .fn()
          .mockResolvedValue({ newPhase: 'explore' }),
      },
      planManager: {
        ensurePlanFile: vi.fn().mockResolvedValue('/test/plan.md'),
      },
      instructionGenerator: {
        generateInstructions: vi.fn().mockReturnValue('Test instructions'),
      },
    };

    await handler.handle(
      {
        workflow: 'minor',
        commit_behaviour: 'end',
      },
      mockContext as ServerContext
    );

    expect(
      mockContext.conversationManager.updateConversationState
    ).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        gitCommitConfig: expect.objectContaining({
          enabled: true,
          commitOnStep: false,
          commitOnPhase: false,
          commitOnComplete: true,
        }),
      })
    );
  });

  it('should translate commit_behaviour "none" to disabled git config', async () => {
    const handler = new StartDevelopmentHandler();
    const mockContext = {
      projectPath: '/test/path',
      conversationManager: {
        createConversationContext: vi
          .fn()
          .mockResolvedValue({ conversationId: 'test' }),
        updateConversationState: vi.fn().mockResolvedValue(undefined),
      },
      workflowManager: {
        validateWorkflowName: vi.fn().mockReturnValue(true),
        loadWorkflowForProject: vi
          .fn()
          .mockReturnValue({ name: 'minor', phases: ['explore', 'implement'] }),
      },
      transitionEngine: {
        handleExplicitTransition: vi
          .fn()
          .mockResolvedValue({ newPhase: 'explore' }),
      },
      planManager: {
        ensurePlanFile: vi.fn().mockResolvedValue('/test/plan.md'),
      },
      instructionGenerator: {
        generateInstructions: vi.fn().mockReturnValue('Test instructions'),
      },
    };

    await handler.handle(
      {
        workflow: 'minor',
        commit_behaviour: 'none',
      },
      mockContext as ServerContext
    );

    expect(
      mockContext.conversationManager.updateConversationState
    ).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        gitCommitConfig: expect.objectContaining({
          enabled: false,
          commitOnStep: false,
          commitOnPhase: false,
          commitOnComplete: false,
        }),
      })
    );
  });
});
