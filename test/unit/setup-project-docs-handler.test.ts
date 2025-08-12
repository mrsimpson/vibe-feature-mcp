/**
 * Unit tests for SetupProjectDocsHandler
 * 
 * Tests the setup_project_docs tool handler functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SetupProjectDocsHandler } from '../../src/server/tool-handlers/setup-project-docs.js';
import { ProjectDocsManager } from '../../src/project-docs-manager.js';
import { ServerContext } from '../../src/server/types.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, rmdir } from 'fs/promises';

// Mock ProjectDocsManager
vi.mock('../../src/project-docs-manager.js');

describe('SetupProjectDocsHandler', () => {
  let handler: SetupProjectDocsHandler;
  let mockProjectDocsManager: vi.Mocked<ProjectDocsManager>;
  let testProjectPath: string;
  let mockContext: ServerContext;

  beforeEach(async () => {
    // Create test project directory
    testProjectPath = join(tmpdir(), `setup-docs-test-${Date.now()}`);
    await mkdir(testProjectPath, { recursive: true });

    // Mock ProjectDocsManager
    mockProjectDocsManager = {
      createProjectDocs: vi.fn(),
      getDocumentPaths: vi.fn()
    } as any;

    // Create handler and inject mock
    handler = new SetupProjectDocsHandler();
    // @ts-ignore - accessing private property for testing
    handler.projectDocsManager = mockProjectDocsManager;

    // Mock context
    mockContext = {
      projectPath: testProjectPath
    } as ServerContext;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rmdir(testProjectPath, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('executeHandler', () => {
    beforeEach(() => {
      // Setup default mocks
      mockProjectDocsManager.getDocumentPaths.mockReturnValue({
        architecture: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        requirements: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        design: join(testProjectPath, '.vibe', 'docs', 'design.md')
      });
    });

    it('should create documents with specified templates', async () => {
      const args = {
        architecture: 'arc42' as const,
        requirements: 'ears' as const,
        design: 'comprehensive' as const
      };

      mockProjectDocsManager.createProjectDocs.mockResolvedValue({
        created: ['architecture.md', 'requirements.md', 'design.md'],
        skipped: []
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(result.created).toEqual(['architecture.md', 'requirements.md', 'design.md']);
      expect(result.skipped).toEqual([]);
      expect(result.message).toContain('Created: architecture.md, requirements.md, design.md');

      expect(mockProjectDocsManager.createProjectDocs).toHaveBeenCalledWith(
        testProjectPath,
        {
          architecture: 'arc42',
          requirements: 'ears',
          design: 'comprehensive'
        }
      );
    });

    it('should create documents with freestyle templates', async () => {
      const args = {
        architecture: 'freestyle' as const,
        requirements: 'freestyle' as const,
        design: 'freestyle' as const
      };

      mockProjectDocsManager.createProjectDocs.mockResolvedValue({
        created: ['architecture.md', 'requirements.md', 'design.md'],
        skipped: []
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(mockProjectDocsManager.createProjectDocs).toHaveBeenCalledWith(
        testProjectPath,
        {
          architecture: 'freestyle',
          requirements: 'freestyle',
          design: 'freestyle'
        }
      );
    });

    it('should handle partial creation with skipped files', async () => {
      const args = {
        architecture: 'arc42' as const,
        requirements: 'ears' as const,
        design: 'comprehensive' as const
      };

      mockProjectDocsManager.createProjectDocs.mockResolvedValue({
        created: ['requirements.md', 'design.md'],
        skipped: ['architecture.md']
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(result.created).toEqual(['requirements.md', 'design.md']);
      expect(result.skipped).toEqual(['architecture.md']);
      expect(result.message).toContain('Created: requirements.md, design.md');
      expect(result.message).toContain('Skipped existing: architecture.md');
    });

    it('should handle all files being skipped', async () => {
      const args = {
        architecture: 'arc42' as const,
        requirements: 'ears' as const,
        design: 'comprehensive' as const
      };

      mockProjectDocsManager.createProjectDocs.mockResolvedValue({
        created: [],
        skipped: ['architecture.md', 'requirements.md', 'design.md']
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual(['architecture.md', 'requirements.md', 'design.md']);
      expect(result.message).toContain('Skipped existing: architecture.md, requirements.md, design.md');
    });

    it('should handle errors gracefully', async () => {
      const args = {
        architecture: 'arc42' as const,
        requirements: 'ears' as const,
        design: 'comprehensive' as const
      };

      const error = new Error('Template not found: architecture/arc42');
      mockProjectDocsManager.createProjectDocs.mockRejectedValue(error);

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(false);
      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.message).toContain('Failed to setup project docs: Template not found: architecture/arc42');
    });

    it('should use current working directory when no project path in context', async () => {
      const contextWithoutPath = {} as ServerContext;
      const args = {
        architecture: 'freestyle' as const,
        requirements: 'freestyle' as const,
        design: 'freestyle' as const
      };

      mockProjectDocsManager.createProjectDocs.mockResolvedValue({
        created: ['architecture.md'],
        skipped: []
      });

      await handler.executeHandler(args, contextWithoutPath);

      expect(mockProjectDocsManager.createProjectDocs).toHaveBeenCalledWith(
        process.cwd(),
        expect.any(Object)
      );
    });

    it('should return correct document paths', async () => {
      const args = {
        architecture: 'freestyle' as const,
        requirements: 'freestyle' as const,
        design: 'freestyle' as const
      };

      mockProjectDocsManager.createProjectDocs.mockResolvedValue({
        created: ['architecture.md'],
        skipped: []
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.paths).toEqual({
        architecture: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        requirements: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        design: join(testProjectPath, '.vibe', 'docs', 'design.md')
      });
    });
  });
});
