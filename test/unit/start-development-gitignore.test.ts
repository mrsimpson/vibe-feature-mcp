/**
 * Unit tests for StartDevelopment .gitignore management
 *
 * Tests the automatic .vibe/.gitignore creation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { TestAccess } from '../utils/test-access.js';
import { tmpdir } from 'node:os';
import { StartDevelopmentHandler } from '../../src/server/tool-handlers/start-development.js';

describe('StartDevelopment .gitignore management', () => {
  let tempDir: string;
  let handler: StartDevelopmentHandler;
  let mockLogger: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = resolve(tmpdir(), `vibe-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Create handler instance with mocked logger
    handler = new StartDevelopmentHandler();
    (handler as unknown as { logger: unknown }).logger = mockLogger;
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('ensureGitignoreEntry', () => {
    it('should skip non-git repositories', () => {
      // Call the private method cleanly
      TestAccess.callMethod(handler, 'ensureGitignoreEntry', tempDir);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Not a git repository, skipping .gitignore management',
        { projectPath: tempDir }
      );
    });

    it('should create .vibe/.gitignore when none exists in git repo', () => {
      // Create .git directory to simulate git repo
      mkdirSync(resolve(tempDir, '.git'));

      // Call the method
      TestAccess.callMethod(handler, 'ensureGitignoreEntry', tempDir);

      // Check that .vibe/.gitignore was created with correct content
      const vibeGitignorePath = resolve(tempDir, '.vibe', '.gitignore');
      expect(existsSync(vibeGitignorePath)).toBe(true);

      const content = readFileSync(vibeGitignorePath, 'utf-8');
      expect(content).toContain('*.sqlite');
      expect(content).toContain('conversation-state.sqlite');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Created .vibe/.gitignore to exclude SQLite files',
        { projectPath: tempDir, gitignorePath: vibeGitignorePath }
      );
    });

    it('should create .vibe directory if it does not exist', () => {
      // Create .git directory to simulate git repo
      mkdirSync(resolve(tempDir, '.git'));

      // Ensure .vibe directory doesn't exist
      const vibeDir = resolve(tempDir, '.vibe');
      expect(existsSync(vibeDir)).toBe(false);

      // Call the method
      TestAccess.callMethod(handler, 'ensureGitignoreEntry', tempDir);

      // Check that .vibe directory was created
      expect(existsSync(vibeDir)).toBe(true);

      // Check that .vibe/.gitignore was created
      const vibeGitignorePath = resolve(vibeDir, '.gitignore');
      expect(existsSync(vibeGitignorePath)).toBe(true);
    });

    it('should skip when .vibe/.gitignore already exists with SQLite exclusions', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));

      // Create .vibe directory and .gitignore with existing SQLite exclusions
      const vibeDir = resolve(tempDir, '.vibe');
      mkdirSync(vibeDir, { recursive: true });
      const vibeGitignorePath = resolve(vibeDir, '.gitignore');
      const existingContent = '*.sqlite\nconversation-state.sqlite*\n';
      writeFileSync(vibeGitignorePath, existingContent);

      // Call the method
      TestAccess.callMethod(handler, 'ensureGitignoreEntry', tempDir);

      // Check that content wasn't changed
      const content = readFileSync(vibeGitignorePath, 'utf-8');
      expect(content).toBe(existingContent);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '.vibe/.gitignore already exists with SQLite exclusions',
        { gitignorePath: vibeGitignorePath }
      );
    });

    it('should recreate .vibe/.gitignore if existing one is incomplete', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));

      // Create .vibe directory and incomplete .gitignore
      const vibeDir = resolve(tempDir, '.vibe');
      mkdirSync(vibeDir, { recursive: true });
      const vibeGitignorePath = resolve(vibeDir, '.gitignore');
      const incompleteContent = 'some-other-file\n';
      writeFileSync(vibeGitignorePath, incompleteContent);

      // Call the method
      TestAccess.callMethod(handler, 'ensureGitignoreEntry', tempDir);

      // Check that content was updated to include SQLite exclusions
      const content = readFileSync(vibeGitignorePath, 'utf-8');
      expect(content).toContain('*.sqlite');
      expect(content).toContain('conversation-state.sqlite');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Created .vibe/.gitignore to exclude SQLite files',
        { projectPath: tempDir, gitignorePath: vibeGitignorePath }
      );
    });

    it('should not affect parent directory .gitignore', () => {
      // Create .git directory
      mkdirSync(resolve(tempDir, '.git'));

      // Create parent .gitignore with existing content
      const parentGitignorePath = resolve(tempDir, '.gitignore');
      const parentContent = 'node_modules/\n*.log\n';
      writeFileSync(parentGitignorePath, parentContent);

      // Call the method
      TestAccess.callMethod(handler, 'ensureGitignoreEntry', tempDir);

      // Check that parent .gitignore was not modified
      const parentContentAfter = readFileSync(parentGitignorePath, 'utf-8');
      expect(parentContentAfter).toBe(parentContent);

      // Check that .vibe/.gitignore was created
      const vibeGitignorePath = resolve(tempDir, '.vibe', '.gitignore');
      expect(existsSync(vibeGitignorePath)).toBe(true);
      const vibeContent = readFileSync(vibeGitignorePath, 'utf-8');
      expect(vibeContent).toContain('*.sqlite');
    });
  });
});
