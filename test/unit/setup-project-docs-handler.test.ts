/**
 * Unit tests for SetupProjectDocsHandler
 *
 * Tests the setup_project_docs tool handler functionality
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  Mocked,
} from 'vitest';
import { TestAccess } from '../utils/test-access.js';
import { SetupProjectDocsHandler } from '../../src/server/tool-handlers/setup-project-docs.js';
import { ProjectDocsManager } from '../../src/project-docs-manager.js';
import { TemplateManager } from '../../src/template-manager.js';
import { ServerContext } from '../../src/server/types.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, rmdir } from 'node:fs/promises';

// Mock ProjectDocsManager and TemplateManager
vi.mock('../../src/project-docs-manager.js');
vi.mock('../../src/template-manager.js');

describe('SetupProjectDocsHandler', () => {
  let handler: SetupProjectDocsHandler;
  let mockProjectDocsManager: Mocked<ProjectDocsManager>;
  let mockTemplateManager: Mocked<TemplateManager>;
  let testProjectPath: string;
  let mockContext: ServerContext;

  beforeEach(async () => {
    // Create test project directory
    testProjectPath = join(tmpdir(), `setup-docs-test-${Date.now()}`);
    await mkdir(testProjectPath, { recursive: true });

    // Mock TemplateManager
    mockTemplateManager = {
      getAvailableTemplates: vi.fn().mockResolvedValue({
        architecture: ['arc42', 'freestyle'],
        requirements: ['ears', 'freestyle'],
        design: ['comprehensive', 'freestyle'],
      }),
    } as Partial<TemplateManager>;

    // Mock ProjectDocsManager
    mockProjectDocsManager = {
      createOrLinkProjectDocs: vi.fn(),
      createProjectDocs: vi.fn(),
      getDocumentPaths: vi.fn(),
      templateManager: mockTemplateManager,
    } as Partial<ProjectDocsManager>;

    // Create handler and inject mock
    handler = new SetupProjectDocsHandler();
    TestAccess.injectMock(
      handler,
      'projectDocsManager',
      mockProjectDocsManager
    );

    // Mock context
    mockContext = {
      projectPath: testProjectPath,
    } as ServerContext;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rmdir(testProjectPath, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('executeHandler', () => {
    beforeEach(() => {
      // Setup default mocks
      mockProjectDocsManager.getDocumentPaths.mockReturnValue({
        architecture: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        requirements: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        design: join(testProjectPath, '.vibe', 'docs', 'design.md'),
      });
    });

    it('should create documents with specified templates', async () => {
      const args = {
        architecture: 'arc42',
        requirements: 'ears',
        design: 'comprehensive',
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockResolvedValue({
        created: ['architecture.md', 'requirements.md', 'design.md'],
        linked: [],
        skipped: [],
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(result.created).toEqual([
        'architecture.md',
        'requirements.md',
        'design.md',
      ]);
      expect(result.linked).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.message).toContain(
        'Created: architecture.md, requirements.md, design.md'
      );
    });

    it('should create documents with freestyle templates', async () => {
      const args = {
        architecture: 'freestyle',
        requirements: 'freestyle',
        design: 'freestyle',
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockResolvedValue({
        created: ['architecture.md', 'requirements.md', 'design.md'],
        linked: [],
        skipped: [],
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(
        mockProjectDocsManager.createOrLinkProjectDocs
      ).toHaveBeenCalledWith(
        testProjectPath,
        expect.objectContaining({
          architecture: 'freestyle',
          requirements: 'freestyle',
          design: 'freestyle',
        }),
        {}
      );
    });

    it('should handle partial creation with skipped files', async () => {
      const args = {
        architecture: 'arc42',
        requirements: 'ears',
        design: 'comprehensive',
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockResolvedValue({
        created: ['requirements.md', 'design.md'],
        linked: [],
        skipped: ['architecture.md'],
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
        architecture: 'arc42',
        requirements: 'ears',
        design: 'comprehensive',
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockResolvedValue({
        created: [],
        linked: [],
        skipped: ['architecture.md', 'requirements.md', 'design.md'],
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(true);
      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual([
        'architecture.md',
        'requirements.md',
        'design.md',
      ]);
      expect(result.message).toContain(
        'Skipped existing: architecture.md, requirements.md, design.md'
      );
    });

    it('should handle errors gracefully', async () => {
      const args = {
        architecture: 'arc42',
        requirements: 'ears',
        design: 'comprehensive',
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockRejectedValue(
        new Error('Template not found: architecture/arc42')
      );

      const result = await handler.executeHandler(args, mockContext);

      expect(result.success).toBe(false);
      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.message).toContain(
        'Failed to setup project docs: Template not found: architecture/arc42'
      );
    });

    it('should use current working directory when no project path in context', async () => {
      const contextWithoutPath = {} as ServerContext;
      const args = {
        architecture: 'freestyle',
        requirements: 'freestyle',
        design: 'freestyle',
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockResolvedValue({
        created: ['architecture.md', 'requirements.md', 'design.md'],
        linked: [],
        skipped: [],
      });

      await handler.executeHandler(args, contextWithoutPath);

      expect(
        mockProjectDocsManager.createOrLinkProjectDocs
      ).toHaveBeenCalledWith(
        process.cwd(),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should return correct document paths', async () => {
      const args = {
        architecture: 'freestyle',
        requirements: 'freestyle',
        design: 'freestyle',
      };

      const expectedPaths = {
        architecture: join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        requirements: join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        design: join(testProjectPath, '.vibe', 'docs', 'design.md'),
      };

      mockProjectDocsManager.createOrLinkProjectDocs.mockResolvedValue({
        created: ['architecture.md', 'requirements.md', 'design.md'],
        linked: [],
        skipped: [],
      });

      const result = await handler.executeHandler(args, mockContext);

      expect(result.paths).toEqual(expectedPaths);
    });
  });
});
