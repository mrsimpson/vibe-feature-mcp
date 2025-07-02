/**
 * Unit tests for StartDevelopment .gitignore management
 * 
 * Tests the automatic .gitignore entry management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { StartDevelopmentHandler } from '../../src/server/tool-handlers/start-development.js';

describe('StartDevelopment .gitignore management', () => {
  let tempDir: string;
  let handler: StartDevelopmentHandler;
  let mockLogger: any;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = resolve(tmpdir(), `vibe-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // Create handler instance with mocked logger
    handler = new StartDevelopmentHandler();
    (handler as any).logger = mockLogger;
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('ensureGitignoreEntry', () => {
    it('should skip non-git repositories', () => {
      // Call the private method using bracket notation
      (handler as any).ensureGitignoreEntry(tempDir);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Not a git repository, skipping .gitignore management',
        { projectPath: tempDir }
      );
    });

    it('should create .gitignore with entry when none exists in git repo', () => {
      // Create .git directory to simulate git repo
      mkdirSync(resolve(tempDir, '.git'));

      // Call the method
      (handler as any).ensureGitignoreEntry(tempDir);

      // Check that .gitignore was created with correct content
      const gitignorePath = resolve(tempDir, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
      
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe('.vibe/*.sqlite\n');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Added .vibe/*.sqlite entry to .gitignore',
        { projectPath: tempDir, gitignorePath }
      );
    });

    it('should add entry to existing .gitignore when entry is missing', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));
      
      // Create existing .gitignore with other content
      const gitignorePath = resolve(tempDir, '.gitignore');
      const existingContent = 'node_modules/\n*.log\n';
      writeFileSync(gitignorePath, existingContent);

      // Call the method
      (handler as any).ensureGitignoreEntry(tempDir);

      // Check that entry was added
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe('node_modules/\n*.log\n.vibe/*.sqlite\n');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Added .vibe/*.sqlite entry to .gitignore',
        { projectPath: tempDir, gitignorePath }
      );
    });

    it('should skip when entry already exists (exact match)', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));
      
      // Create .gitignore with existing entry
      const gitignorePath = resolve(tempDir, '.gitignore');
      const existingContent = 'node_modules/\n.vibe/*.sqlite\n*.log\n';
      writeFileSync(gitignorePath, existingContent);

      // Call the method
      (handler as any).ensureGitignoreEntry(tempDir);

      // Check that content wasn't changed
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe(existingContent);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '.gitignore entry already exists, skipping',
        { projectPath: tempDir, targetEntry: '.vibe/*.sqlite' }
      );
    });

    it('should skip when entry already exists (case insensitive)', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));
      
      // Create .gitignore with case-different entry
      const gitignorePath = resolve(tempDir, '.gitignore');
      const existingContent = 'node_modules/\n.VIBE/*.SQLITE\n*.log\n';
      writeFileSync(gitignorePath, existingContent);

      // Call the method
      (handler as any).ensureGitignoreEntry(tempDir);

      // Check that content wasn't changed
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe(existingContent);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '.gitignore entry already exists, skipping',
        { projectPath: tempDir, targetEntry: '.vibe/*.sqlite' }
      );
    });

    it('should skip when entry already exists (with whitespace)', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));
      
      // Create .gitignore with whitespace-padded entry
      const gitignorePath = resolve(tempDir, '.gitignore');
      const existingContent = 'node_modules/\n  .vibe/*.sqlite  \n*.log\n';
      writeFileSync(gitignorePath, existingContent);

      // Call the method
      (handler as any).ensureGitignoreEntry(tempDir);

      // Check that content wasn't changed
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe(existingContent);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '.gitignore entry already exists, skipping',
        { projectPath: tempDir, targetEntry: '.vibe/*.sqlite' }
      );
    });

    it('should handle .gitignore without trailing newline', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));
      
      // Create .gitignore without trailing newline
      const gitignorePath = resolve(tempDir, '.gitignore');
      const existingContent = 'node_modules/\n*.log';
      writeFileSync(gitignorePath, existingContent);

      // Call the method
      (handler as any).ensureGitignoreEntry(tempDir);

      // Check that entry was added with proper newlines
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toBe('node_modules/\n*.log\n.vibe/*.sqlite\n');
    });
  });
});
