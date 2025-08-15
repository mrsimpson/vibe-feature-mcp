/**
 * Unit tests for ProjectDocsManager
 * 
 * Tests project documentation management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectDocsManager } from '../../src/project-docs-manager.js';
import { TemplateManager } from '../../src/template-manager.js';
import { mkdir, writeFile, rmdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock TemplateManager
vi.mock('../../src/template-manager.js');

describe('ProjectDocsManager', () => {
  let projectDocsManager: ProjectDocsManager;
  let testProjectPath: string;
  let mockTemplateManager: vi.Mocked<TemplateManager>;

  beforeEach(async () => {
    // Create a temporary directory for test project
    testProjectPath = join(tmpdir(), `project-test-${Date.now()}`);
    await mkdir(testProjectPath, { recursive: true });
    
    // Mock TemplateManager
    mockTemplateManager = {
      getDefaults: vi.fn().mockReturnValue({
        architecture: 'arc42',
        requirements: 'ears',
        design: 'comprehensive'
      }),
      validateOptions: vi.fn(),
      loadTemplate: vi.fn(),
      getAvailableTemplates: vi.fn()
    } as any;

    projectDocsManager = new ProjectDocsManager();
    // @ts-ignore - accessing private property for testing
    projectDocsManager.templateManager = mockTemplateManager;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rmdir(testProjectPath, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getDocsPath', () => {
    it('should return correct docs path', () => {
      const docsPath = projectDocsManager.getDocsPath(testProjectPath);
      expect(docsPath).toBe(join(testProjectPath, '.vibe', 'docs'));
    });
  });

  describe('getDocumentPaths', () => {
    it('should return correct document paths', () => {
      const paths = projectDocsManager.getDocumentPaths(testProjectPath);
      
      expect(paths.architecture).toBe(join(testProjectPath, '.vibe', 'docs', 'architecture.md'));
      expect(paths.requirements).toBe(join(testProjectPath, '.vibe', 'docs', 'requirements.md'));
      expect(paths.design).toBe(join(testProjectPath, '.vibe', 'docs', 'design.md'));
    });
  });

  describe('getProjectDocsInfo', () => {
    it('should return info when no documents exist', async () => {
      const info = await projectDocsManager.getProjectDocsInfo(testProjectPath);
      
      expect(info.architecture.exists).toBe(false);
      expect(info.requirements.exists).toBe(false);
      expect(info.design.exists).toBe(false);
      expect(info.architecture.path).toBe(join(testProjectPath, '.vibe', 'docs', 'architecture.md'));
    });

    it('should return info when documents exist', async () => {
      // Create docs directory and files
      const docsPath = join(testProjectPath, '.vibe', 'docs');
      await mkdir(docsPath, { recursive: true });
      await writeFile(join(docsPath, 'architecture.md'), '# Architecture');
      await writeFile(join(docsPath, 'requirements.md'), '# Requirements');
      
      const info = await projectDocsManager.getProjectDocsInfo(testProjectPath);
      
      expect(info.architecture.exists).toBe(true);
      expect(info.requirements.exists).toBe(true);
      expect(info.design.exists).toBe(false);
    });
  });

  describe('createProjectDocs', () => {
    beforeEach(() => {
      // Setup template manager mocks
      mockTemplateManager.loadTemplate.mockImplementation(async (type, template) => {
        return {
          content: `# Test ${type} template (${template})\n\nTest content for ${type}.`
        };
      });
    });

    it('should create all documents with default templates', async () => {
      const result = await projectDocsManager.createProjectDocs(testProjectPath);
      
      expect(result.created).toEqual(['architecture.md', 'requirements.md', 'design.md']);
      expect(result.skipped).toEqual([]);
      
      // Verify template manager was called with defaults
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith('architecture', 'arc42');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith('requirements', 'ears');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith('design', 'comprehensive');
      
      // Verify files were created
      const docsPath = join(testProjectPath, '.vibe', 'docs');
      const archContent = await readFile(join(docsPath, 'architecture.md'), 'utf-8');
      expect(archContent).toContain('Test architecture template (arc42)');
    });

    it('should create documents with custom templates', async () => {
      const options = {
        architecture: 'freestyle' as const,
        requirements: 'freestyle' as const,
        design: 'freestyle' as const
      };
      
      const result = await projectDocsManager.createProjectDocs(testProjectPath, options);
      
      expect(result.created).toEqual(['architecture.md', 'requirements.md', 'design.md']);
      expect(result.skipped).toEqual([]);
      
      // Verify template manager was called with custom options
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith('architecture', 'freestyle');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith('requirements', 'freestyle');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith('design', 'freestyle');
    });

    it('should skip existing documents', async () => {
      // Create docs directory and one existing file
      const docsPath = join(testProjectPath, '.vibe', 'docs');
      await mkdir(docsPath, { recursive: true });
      await writeFile(join(docsPath, 'architecture.md'), '# Existing Architecture');
      
      const result = await projectDocsManager.createProjectDocs(testProjectPath);
      
      expect(result.created).toEqual(['requirements.md', 'design.md']);
      expect(result.skipped).toEqual(['architecture.md']);
      
      // Verify existing file wasn't overwritten
      const archContent = await readFile(join(docsPath, 'architecture.md'), 'utf-8');
      expect(archContent).toBe('# Existing Architecture');
    });

    it('should handle template with additional files', async () => {
      mockTemplateManager.loadTemplate.mockImplementation(async (type, template) => {
        if (type === 'architecture' && template === 'arc42') {
          return {
            content: '# Arc42 Template\n\nSee images/diagram.png',
            additionalFiles: [
              {
                relativePath: 'images/diagram.png',
                content: Buffer.from('fake-image-data')
              }
            ]
          };
        }
        return {
          content: `# Test ${type} template (${template})`
        };
      });
      
      const result = await projectDocsManager.createProjectDocs(testProjectPath);
      
      expect(result.created).toEqual(['architecture.md', 'requirements.md', 'design.md']);
      
      // Verify additional file was created
      const imagePath = join(testProjectPath, '.vibe', 'docs', 'images', 'diagram.png');
      const imageContent = await readFile(imagePath);
      expect(imageContent).toEqual(Buffer.from('fake-image-data'));
    });

    it('should handle template loading errors', async () => {
      mockTemplateManager.loadTemplate.mockRejectedValue(new Error('Template not found'));
      
      // The method should throw when template loading fails
      await expect(
        projectDocsManager.createProjectDocs(testProjectPath)
      ).rejects.toThrow('Template not found');
    });
  });

  describe('getVariableSubstitutions', () => {
    it('should return correct variable substitutions', () => {
      const substitutions = projectDocsManager.getVariableSubstitutions(testProjectPath);
      
      expect(substitutions).toEqual({
        '$ARCHITECTURE_DOC': join(testProjectPath, '.vibe', 'docs', 'architecture.md'),
        '$REQUIREMENTS_DOC': join(testProjectPath, '.vibe', 'docs', 'requirements.md'),
        '$DESIGN_DOC': join(testProjectPath, '.vibe', 'docs', 'design.md')
      });
    });
  });

  describe('readDocument', () => {
    it('should return path to existing document', async () => {
      // Create docs directory and file
      const docsPath = join(testProjectPath, '.vibe', 'docs');
      await mkdir(docsPath, { recursive: true });
      await writeFile(join(docsPath, 'architecture.md'), '# Test Architecture');
      
      const path = await projectDocsManager.readDocument(testProjectPath, 'architecture');
      expect(path).toContain('architecture.md');
      expect(path).toContain('.vibe/docs');
    });

    it('should throw error for non-existent document', async () => {
      await expect(
        projectDocsManager.readDocument(testProjectPath, 'architecture')
      ).rejects.toThrow('architecture document not found');
    });
  });

  describe('allDocumentsExist', () => {
    it('should return false when no documents exist', async () => {
      const result = await projectDocsManager.allDocumentsExist(testProjectPath);
      expect(result).toBe(false);
    });

    it('should return false when some documents exist', async () => {
      const docsPath = join(testProjectPath, '.vibe', 'docs');
      await mkdir(docsPath, { recursive: true });
      await writeFile(join(docsPath, 'architecture.md'), '# Architecture');
      
      const result = await projectDocsManager.allDocumentsExist(testProjectPath);
      expect(result).toBe(false);
    });

    it('should return true when all documents exist', async () => {
      const docsPath = join(testProjectPath, '.vibe', 'docs');
      await mkdir(docsPath, { recursive: true });
      await writeFile(join(docsPath, 'architecture.md'), '# Architecture');
      await writeFile(join(docsPath, 'requirements.md'), '# Requirements');
      await writeFile(join(docsPath, 'design.md'), '# Design');
      
      const result = await projectDocsManager.allDocumentsExist(testProjectPath);
      expect(result).toBe(true);
    });
  });
});
