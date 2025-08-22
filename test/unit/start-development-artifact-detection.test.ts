/**
 * Unit tests for StartDevelopmentHandler dynamic artifact detection
 *
 * Tests the enhanced start_development functionality that dynamically analyzes workflows
 * to detect which document variables are referenced and validates only those documents
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestAccess } from '../utils/test-access.js';
import { StartDevelopmentHandler } from '../../src/server/tool-handlers/start-development.js';
import { join } from 'node:path';
import {
  MockContextFactory,
  TEST_WORKFLOWS,
  TestAssertions,
} from '../utils/test-helpers.js';

// Mock ProjectDocsManager
vi.mock('../../src/project-docs-manager.js');

// Mock other dependencies
vi.mock('../../src/git-manager.js', () => ({
  GitManager: {
    isGitRepository: vi.fn().mockReturnValue(true),
    getCurrentCommitHash: vi.fn().mockReturnValue('abc123'),
  },
}));

describe('StartDevelopmentHandler - Dynamic Artifact Detection', () => {
  let handler: StartDevelopmentHandler;
  let mockProjectDocsManager: ReturnType<
    typeof MockContextFactory.createProjectDocsManagerMock
  >;
  let testProjectPath: string;
  let mockContext: ReturnType<typeof MockContextFactory.createBasicContext>;

  beforeEach(() => {
    testProjectPath = '/test/project';

    // Create mock project docs manager
    mockProjectDocsManager =
      MockContextFactory.createProjectDocsManagerMock(testProjectPath);

    // Create handler and inject mock
    handler = new StartDevelopmentHandler();
    TestAccess.injectMock(
      handler,
      'projectDocsManager',
      mockProjectDocsManager
    );

    // Create basic mock context
    mockContext = MockContextFactory.createBasicContext(testProjectPath);

    // Mock file system operations
    vi.mock('fs', () => ({
      readFileSync: vi.fn().mockReturnValue('main'),
      writeFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(false),
    }));
  });

  describe('dynamic workflow analysis', () => {
    it('should proceed normally when workflow contains no document variables', async () => {
      mockContext.workflowManager.loadWorkflowForProject.mockReturnValue(
        TEST_WORKFLOWS.simple
      );

      const result = await handler.executeHandler(
        { workflow: 'simple-workflow' },
        mockContext
      );

      expect(mockProjectDocsManager.getProjectDocsInfo).not.toHaveBeenCalled();
      TestAssertions.expectNormalPhase(result, 'requirements');
    });

    it('should detect and validate only referenced document variables', async () => {
      mockContext.workflowManager.loadWorkflowForProject.mockReturnValue(
        TEST_WORKFLOWS.withArchDoc
      );

      // Update mock context to match the workflow's initial state
      mockContext.conversationManager.createConversationContext = vi
        .fn()
        .mockResolvedValue({
          conversationId: 'test-conversation',
          currentPhase: 'design',
          planFilePath: join(testProjectPath, '.vibe', 'development-plan.md'),
        });

      mockProjectDocsManager.getProjectDocsInfo.mockResolvedValue({
        architecture: {
          exists: false,
          path: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        },
        requirements: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        },
        design: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'design.md'),
        },
      });

      const result = await handler.executeHandler(
        { workflow: 'arch-focused' },
        mockContext
      );

      TestAssertions.expectArtifactSetupPhase(result);
      expect(result.instructions).toContain(
        '**Referenced Variables:** `$ARCHITECTURE_DOC`'
      );
      expect(result.instructions).toContain('architecture.md');
      expect(result.instructions).toContain('✅ requirements.md');
      expect(result.instructions).toContain('✅ design.md');
    });

    it('should detect multiple document variables in workflow', async () => {
      mockContext.workflowManager.loadWorkflowForProject.mockReturnValue(
        TEST_WORKFLOWS.withMultipleDocs
      );

      // Update mock context to match the workflow's initial state
      mockContext.conversationManager.createConversationContext = vi
        .fn()
        .mockResolvedValue({
          conversationId: 'test-conversation',
          currentPhase: 'implementation',
          planFilePath: join(testProjectPath, '.vibe', 'development-plan.md'),
        });

      mockProjectDocsManager.getProjectDocsInfo.mockResolvedValue({
        architecture: {
          exists: false,
          path: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        },
        requirements: {
          exists: false,
          path: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        },
        design: {
          exists: false,
          path: join(testProjectPath, '.vibe', 'docs', 'design.md'),
        },
      });

      const result = await handler.executeHandler(
        { workflow: 'multi-doc' },
        mockContext
      );

      TestAssertions.expectArtifactSetupPhase(result);
      expect(result.instructions).toContain(
        '**Referenced Variables:** `$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`, `$DESIGN_DOC`'
      );
      expect(result.instructions).toContain('architecture.md');
      expect(result.instructions).toContain('requirements.md');
      expect(result.instructions).toContain('design.md');
    });

    it('should proceed normally when all referenced documents exist', async () => {
      mockContext.workflowManager.loadWorkflowForProject.mockReturnValue(
        TEST_WORKFLOWS.withMultipleDocs
      );

      // Mock conversation context to match initial state
      mockContext.conversationManager.createConversationContext.mockResolvedValue(
        {
          conversationId: 'test-conversation',
          currentPhase: 'implementation',
          projectPath: testProjectPath,
          planFilePath: join(testProjectPath, '.vibe', 'plan.md'),
          gitBranch: 'feature-branch',
        }
      );

      // Mock transition engine to return the correct phase
      mockContext.transitionEngine.handleExplicitTransition.mockResolvedValue({
        newPhase: 'implementation',
      });

      mockProjectDocsManager.getProjectDocsInfo.mockResolvedValue({
        architecture: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        },
        requirements: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        },
        design: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'design.md'),
        },
      });

      const result = await handler.executeHandler(
        { workflow: 'complete-docs' },
        mockContext
      );

      expect(mockProjectDocsManager.getProjectDocsInfo).toHaveBeenCalledWith(
        testProjectPath
      );
      TestAssertions.expectNormalPhase(result, 'implementation');
    });

    it('should handle partial document availability correctly', async () => {
      // Mock workflow that references REQUIREMENTS_DOC and DESIGN_DOC
      const partialWorkflow = {
        initial_state: 'development',
        states: {
          development: {
            instructions:
              'Implement features based on $REQUIREMENTS_DOC and follow $DESIGN_DOC patterns.',
          },
        },
      };

      mockContext.workflowManager.loadWorkflowForProject.mockReturnValue(
        partialWorkflow
      );

      // Update mock context to match the workflow's initial state
      mockContext.conversationManager.createConversationContext = vi
        .fn()
        .mockResolvedValue({
          conversationId: 'test-conversation',
          currentPhase: 'development',
          planFilePath: join(testProjectPath, '.vibe', 'development-plan.md'),
        });

      mockProjectDocsManager.getProjectDocsInfo.mockResolvedValue({
        architecture: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        },
        requirements: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        },
        design: {
          exists: false,
          path: join(testProjectPath, '.vibe', 'docs', 'design.md'),
        },
      });

      const result = await handler.executeHandler(
        { workflow: 'req-design-focused' },
        mockContext
      );

      TestAssertions.expectArtifactSetupPhase(result);
      expect(result.instructions).toContain(
        '**Referenced Variables:** `$REQUIREMENTS_DOC`, `$DESIGN_DOC`'
      );
      expect(result.instructions).toContain('design.md'); // Only missing doc
      expect(result.instructions).toContain('✅ architecture.md'); // Existing doc
      expect(result.instructions).toContain('✅ requirements.md'); // Existing doc
    });

    it('should handle workflow loading errors gracefully', async () => {
      // Mock workflow loading failure - this should happen during artifact check, not during normal workflow loading
      let callCount = 0;
      mockContext.workflowManager.loadWorkflowForProject.mockImplementation(
        () => {
          callCount++;
          if (callCount === 1) {
            // First call during artifact check - throw error
            throw new Error('Workflow not found');
          } else {
            // Second call during normal flow - return valid workflow
            return TEST_WORKFLOWS.simple;
          }
        }
      );

      const result = await handler.executeHandler(
        { workflow: 'invalid-workflow' },
        mockContext
      );

      // Should proceed without artifact check when workflow analysis fails
      TestAssertions.expectNormalPhase(result, 'requirements');
    });

    it('should include detected variables in setup guidance', async () => {
      mockContext.workflowManager.loadWorkflowForProject.mockReturnValue(
        TEST_WORKFLOWS.withArchDoc
      );

      // Update mock context to match the workflow's initial state
      mockContext.conversationManager.createConversationContext = vi
        .fn()
        .mockResolvedValue({
          conversationId: 'test-conversation',
          currentPhase: 'design',
          planFilePath: join(testProjectPath, '.vibe', 'development-plan.md'),
        });

      mockProjectDocsManager.getProjectDocsInfo.mockResolvedValue({
        architecture: {
          exists: false,
          path: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        },
        requirements: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        },
        design: {
          exists: true,
          path: join(testProjectPath, '.vibe', 'docs', 'design.md'),
        },
      });

      const result = await handler.executeHandler(
        { workflow: 'arch-only' },
        mockContext
      );

      expect(result.instructions).toContain(
        '**Referenced Variables:** `$ARCHITECTURE_DOC`'
      );
      expect(result.instructions).toContain(
        'detected variables: `$ARCHITECTURE_DOC`'
      );
    });
  });
});
