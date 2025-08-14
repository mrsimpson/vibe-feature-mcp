/**
 * Tests for directory linking and extension preservation functionality
 * 
 * Tests the fixes for:
 * - Issue 1: Directory linking support
 * - Issue 2: Extension preservation in symlinks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PathValidationUtils } from '../../src/path-validation-utils.js';
import { ProjectDocsManager } from '../../src/project-docs-manager.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile, rm, readlink, lstat } from 'fs/promises';

describe('Directory Linking and Extension Preservation', () => {
  let testProjectPath: string;
  let projectDocsManager: ProjectDocsManager;

  beforeEach(async () => {
    // Create test project directory
    testProjectPath = join(tmpdir(), `dir-ext-test-${Date.now()}`);
    await mkdir(testProjectPath, { recursive: true });

    projectDocsManager = new ProjectDocsManager();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testProjectPath, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Directory Linking Support (Issue 1 Fix)', () => {
    it('should validate directories with validateFileOrDirectoryPath', async () => {
      // Create test directory
      const docsDir = join(testProjectPath, 'docs');
      await mkdir(docsDir, { recursive: true });
      await writeFile(join(docsDir, 'index.md'), '# Documentation');

      const result = await PathValidationUtils.validateFileOrDirectoryPath(docsDir, testProjectPath);
      
      expect(result.isValid).toBe(true);
      expect(result.resolvedPath).toBe(docsDir);
    });

    it('should reject directories with old validateFilePath method', async () => {
      // Create test directory
      const docsDir = join(testProjectPath, 'docs');
      await mkdir(docsDir, { recursive: true });
      await writeFile(join(docsDir, 'index.md'), '# Documentation');

      const result = await PathValidationUtils.validateFilePath(docsDir, testProjectPath);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('directory, not a file');
    });

    it('should recognize directories as valid file paths in validateParameter', async () => {
      // Create test directory
      const docsDir = join(testProjectPath, 'docs');
      await mkdir(docsDir, { recursive: true });
      await writeFile(join(docsDir, 'index.md'), '# Documentation');

      const result = await PathValidationUtils.validateParameter(docsDir, ['arc42'], testProjectPath);
      
      expect(result.isTemplate).toBe(false);
      expect(result.isFilePath).toBe(true);
      expect(result.resolvedPath).toBe(docsDir);
    });

    it('should create symlinks to directories', async () => {
      // Create test directory
      const docsDir = join(testProjectPath, 'docs');
      await mkdir(docsDir, { recursive: true });
      await writeFile(join(docsDir, 'architecture.md'), '# Architecture');

      const result = await projectDocsManager.createOrLinkProjectDocs(
        testProjectPath,
        {}, // No templates
        { architecture: docsDir }
      );

      expect(result.linked).toContain('docs');
      expect(result.created.length).toBe(2); // requirements and design from templates
      expect(result.skipped.length).toBe(0);

      // Verify symlink was created
      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath, { architecture: docsDir });
      const stats = await lstat(paths.architecture);
      expect(stats.isSymbolicLink()).toBe(true);

      const linkTarget = await readlink(paths.architecture);
      expect(linkTarget).toContain('docs');
    });
  });

  describe('Extension Preservation (Issue 2 Fix)', () => {
    it('should preserve file extensions in getDocumentPathsWithExtensions', async () => {
      // Create test files with different extensions
      await writeFile(join(testProjectPath, 'arch.adoc'), '= Architecture');
      await writeFile(join(testProjectPath, 'reqs.docx'), 'Requirements');
      await writeFile(join(testProjectPath, 'design.txt'), 'Design');

      const sourcePaths = {
        architecture: join(testProjectPath, 'arch.adoc'),
        requirements: join(testProjectPath, 'reqs.docx'),
        design: join(testProjectPath, 'design.txt')
      };

      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath, sourcePaths);

      expect(paths.architecture.endsWith('.adoc')).toBe(true);
      expect(paths.requirements.endsWith('.docx')).toBe(true);
      expect(paths.design.endsWith('.txt')).toBe(true);
    });

    it('should use .md extension for templates (backward compatibility)', async () => {
      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath);

      expect(paths.architecture.endsWith('.md')).toBe(true);
      expect(paths.requirements.endsWith('.md')).toBe(true);
      expect(paths.design.endsWith('.md')).toBe(true);
    });

    it('should create symlinks with preserved extensions', async () => {
      // Create test files
      await writeFile(join(testProjectPath, 'architecture.adoc'), '= Architecture\n\nAsciiDoc format');
      await writeFile(join(testProjectPath, 'requirements.docx'), 'Word document');
      await writeFile(join(testProjectPath, 'design.txt'), 'Plain text');

      const sourcePaths = {
        architecture: join(testProjectPath, 'architecture.adoc'),
        requirements: join(testProjectPath, 'requirements.docx'),
        design: join(testProjectPath, 'design.txt')
      };

      const result = await projectDocsManager.createOrLinkProjectDocs(
        testProjectPath,
        {}, // No templates
        sourcePaths
      );

      expect(result.linked).toEqual(['architecture.adoc', 'requirements.docx', 'design.txt']);
      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual([]);

      // Verify symlinks exist with correct extensions
      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath, sourcePaths);
      
      const archStats = await lstat(paths.architecture);
      expect(archStats.isSymbolicLink()).toBe(true);
      
      const reqStats = await lstat(paths.requirements);
      expect(reqStats.isSymbolicLink()).toBe(true);
      
      const designStats = await lstat(paths.design);
      expect(designStats.isSymbolicLink()).toBe(true);
    });

    it('should handle mixed templates and file paths with correct extensions', async () => {
      // Create one test file
      await writeFile(join(testProjectPath, 'existing-design.adoc'), '= Design\n\nExisting design doc');

      const result = await projectDocsManager.createOrLinkProjectDocs(
        testProjectPath,
        {
          architecture: 'freestyle', // Template
          requirements: 'freestyle'  // Template
        },
        {
          design: join(testProjectPath, 'existing-design.adoc') // File path
        }
      );

      expect(result.created).toEqual(['architecture.md', 'requirements.md']);
      expect(result.linked).toEqual(['design.adoc']);
      expect(result.skipped).toEqual([]);
    });

    it('should handle files without extensions', async () => {
      // Create file without extension
      await writeFile(join(testProjectPath, 'README'), '# Project\n\nNo extension file');

      const sourcePaths = {
        architecture: join(testProjectPath, 'README')
      };

      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath, sourcePaths);

      // Should default to .md for files without extensions
      expect(paths.architecture.endsWith('.md')).toBe(true);
    });

    it('should handle directories with no extension', async () => {
      // Create test directory
      const docsDir = join(testProjectPath, 'documentation');
      await mkdir(docsDir, { recursive: true });
      await writeFile(join(docsDir, 'index.md'), '# Documentation Index');

      const sourcePaths = {
        architecture: docsDir
      };

      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath, sourcePaths);

      // Should use directory name without extension
      expect(paths.architecture.endsWith('documentation')).toBe(true);
      expect(paths.architecture).not.toContain('.md');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain old getDocumentPaths behavior', () => {
      const paths = projectDocsManager.getDocumentPaths(testProjectPath);

      expect(paths.architecture.endsWith('architecture.md')).toBe(true);
      expect(paths.requirements.endsWith('requirements.md')).toBe(true);
      expect(paths.design.endsWith('design.md')).toBe(true);
    });

    it('should maintain old getVariableSubstitutions behavior', () => {
      const substitutions = projectDocsManager.getVariableSubstitutions(testProjectPath);

      expect(substitutions['$ARCHITECTURE_DOC'].endsWith('architecture.md')).toBe(true);
      expect(substitutions['$REQUIREMENTS_DOC'].endsWith('requirements.md')).toBe(true);
      expect(substitutions['$DESIGN_DOC'].endsWith('design.md')).toBe(true);
    });

    it('should provide new getVariableSubstitutionsWithExtensions method', async () => {
      // Create test files
      await writeFile(join(testProjectPath, 'arch.adoc'), '= Architecture');

      const sourcePaths = {
        architecture: join(testProjectPath, 'arch.adoc')
      };

      const substitutions = await projectDocsManager.getVariableSubstitutionsWithExtensions(testProjectPath, sourcePaths);

      expect(substitutions['$ARCHITECTURE_DOC'].endsWith('architecture.adoc')).toBe(true);
      expect(substitutions['$REQUIREMENTS_DOC'].endsWith('requirements.md')).toBe(true); // Default for no source
      expect(substitutions['$DESIGN_DOC'].endsWith('design.md')).toBe(true); // Default for no source
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent source paths gracefully', async () => {
      const sourcePaths = {
        architecture: join(testProjectPath, 'nonexistent.adoc')
      };

      const paths = await projectDocsManager.getDocumentPathsWithExtensions(testProjectPath, sourcePaths);

      // Should default to .md when source doesn't exist
      expect(paths.architecture.endsWith('.md')).toBe(true);
    });

    it('should validate security boundaries for directories', async () => {
      // Try to link directory far outside project (not in parent directory)
      const outsideDir = '/tmp/completely-outside-project';
      await mkdir(outsideDir, { recursive: true });

      const result = await PathValidationUtils.validateFileOrDirectoryPath(outsideDir, testProjectPath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('outside project boundaries');

      // Cleanup
      await rm(outsideDir, { recursive: true });
    });
  });
});
