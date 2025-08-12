/**
 * Shared Test Utilities
 * 
 * Common utilities to eliminate repetition across test files
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { vi, expect } from 'vitest';
import { ResponsibleVibeMCPServer } from '../../src/server/index.js';
import { TempProject } from './temp-files.js';

/**
 * Mock project documents content
 */
export const MOCK_DOCS = {
  architecture: '# Architecture\n\nMock architecture document for testing.',
  requirements: '# Requirements\n\nMock requirements document for testing.',
  design: '# Design\n\nMock design document for testing.'
} as const;

/**
 * Git repository setup utilities
 */
export class GitTestHelper {
  static initializeRepo(projectPath: string): void {
    execSync('git init', { cwd: projectPath });
    execSync('git config user.email "test@example.com"', { cwd: projectPath });
    execSync('git config user.name "Test User"', { cwd: projectPath });
  }

  static createInitialCommit(projectPath: string): void {
    writeFileSync(join(projectPath, 'README.md'), '# Test Project');
    execSync('git add .', { cwd: projectPath });
    execSync('git commit -m "Initial commit"', { cwd: projectPath });
  }

  static createFeatureBranch(projectPath: string, branchName: string = 'feature/test'): void {
    execSync(`git checkout -b ${branchName}`, { cwd: projectPath });
  }

  static setupFullRepo(projectPath: string, branchName?: string): void {
    this.initializeRepo(projectPath);
    this.createInitialCommit(projectPath);
    if (branchName) {
      this.createFeatureBranch(projectPath, branchName);
    }
  }
}

/**
 * Server test utilities
 */
export class ServerTestHelper {
  static async createServer(projectPath: string, options: { enableLogging?: boolean } = {}): Promise<ResponsibleVibeMCPServer> {
    const server = new ResponsibleVibeMCPServer({ 
      projectPath,
      enableLogging: options.enableLogging ?? false 
    });
    await server.initialize();
    return server;
  }

  static async cleanupServer(server: ResponsibleVibeMCPServer): Promise<void> {
    if (server) {
      await server.cleanup();
    }
  }
}

/**
 * Mock project documents utilities
 */
export class MockDocsHelper {
  static addToProject(projectPath: string): void {
    const docsDir = join(projectPath, '.vibe', 'docs');
    mkdirSync(docsDir, { recursive: true });
    
    Object.entries(MOCK_DOCS).forEach(([docType, content]) => {
      writeFileSync(join(docsDir, `${docType}.md`), content);
    });
  }

  static addToTempProject(tempProject: TempProject): void {
    tempProject.addMockProjectDocs();
  }

  static ensureExists(projectPath: string): void {
    if (!existsSync(join(projectPath, '.vibe', 'docs'))) {
      this.addToProject(projectPath);
    }
  }
}

/**
 * Mock context factory for unit tests
 */
export class MockContextFactory {
  static createBasicContext(projectPath: string, overrides: any = {}) {
    return {
      projectPath,
      workflowManager: {
        validateWorkflowName: vi.fn().mockReturnValue(true),
        getWorkflowNames: vi.fn().mockReturnValue(['waterfall', 'epcc', 'greenfield']),
        loadWorkflowForProject: vi.fn().mockReturnValue({
          initial_state: 'requirements',
          states: {
            requirements: {
              description: 'Define requirements',
              instructions: 'Create detailed requirements for the project.'
            }
          }
        })
      },
      conversationManager: {
        createConversationContext: vi.fn().mockResolvedValue({
          conversationId: 'test-conversation',
          currentPhase: 'requirements',
          projectPath,
          planFilePath: join(projectPath, '.vibe', 'plan.md'),
          gitBranch: 'feature-branch'
        }),
        updateConversationState: vi.fn()
      },
      transitionEngine: {
        handleExplicitTransition: vi.fn().mockResolvedValue({
          newPhase: 'requirements'
        })
      },
      planManager: {
        setStateMachine: vi.fn(),
        ensurePlanFile: vi.fn()
      },
      ...overrides
    };
  }

  static createProjectDocsManagerMock(projectPath: string) {
    return {
      getProjectDocsInfo: vi.fn(),
      getVariableSubstitutions: vi.fn().mockReturnValue({
        '$ARCHITECTURE_DOC': join(projectPath, '.vibe', 'docs', 'architecture.md'),
        '$REQUIREMENTS_DOC': join(projectPath, '.vibe', 'docs', 'requirements.md'),
        '$DESIGN_DOC': join(projectPath, '.vibe', 'docs', 'design.md')
      }),
      templateManager: {
        getAvailableTemplates: vi.fn().mockResolvedValue({
          architecture: ['arc42', 'freestyle'],
          requirements: ['ears', 'freestyle'],
          design: ['comprehensive', 'freestyle']
        }),
        getDefaults: vi.fn().mockResolvedValue({
          architecture: 'freestyle',
          requirements: 'freestyle',
          design: 'freestyle'
        })
      }
    };
  }
}

/**
 * Test workflow patterns
 */
export const TEST_WORKFLOWS = {
  simple: {
    initial_state: 'requirements',
    states: {
      requirements: {
        description: 'Define requirements',
        instructions: 'Create detailed requirements for the project.'
      }
    }
  },
  
  withArchDoc: {
    initial_state: 'design',
    states: {
      design: {
        description: 'Create design',
        instructions: 'Review the architecture in $ARCHITECTURE_DOC and create detailed design.'
      }
    }
  },
  
  withMultipleDocs: {
    initial_state: 'implementation',
    states: {
      implementation: {
        description: 'Implement solution',
        instructions: 'Follow the architecture in $ARCHITECTURE_DOC and implement according to $DESIGN_DOC requirements.'
      },
      testing: {
        description: 'Test solution',
        instructions: 'Verify all requirements from $REQUIREMENTS_DOC are met.'
      }
    }
  }
} as const;

/**
 * Common test assertions
 */
export class TestAssertions {
  static expectValidResult(result: any): void {
    expect(result).toBeTypeOf('object');
    expect(result.phase).toBeDefined();
    expect(result.instructions).toBeDefined();
  }

  static expectArtifactSetupPhase(result: any): void {
    expect(result.phase).toBe('artifact-setup');
    expect(result.instructions).toContain('Referenced Variables');
  }

  static expectNormalPhase(result: any, expectedPhase: string): void {
    expect(result.phase).toBe(expectedPhase);
    expect(result.instructions).toBeDefined();
  }
}
