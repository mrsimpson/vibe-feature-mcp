/**
 * GitManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitManager } from '../src/git-manager.js';
import { GitCommitConfig } from '../src/types.js';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';

describe('GitManager', () => {
  const testDir = resolve(__dirname, 'test-git-repo');
  
  beforeEach(() => {
    // Clean up any existing test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
    
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    
    // Initialize git repository
    execSync('git init', { cwd: testDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'ignore' });
    
    // Create initial commit
    writeFileSync(resolve(testDir, 'README.md'), '# Test Repository');
    execSync('git add .', { cwd: testDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'ignore' });
  });
  
  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('isGitRepository', () => {
    it('should detect git repository', () => {
      expect(GitManager.isGitRepository(testDir)).toBe(true);
    });

    it('should detect non-git directory', () => {
      const nonGitDir = resolve(__dirname, 'non-git-dir');
      mkdirSync(nonGitDir, { recursive: true });
      
      try {
        expect(GitManager.isGitRepository(nonGitDir)).toBe(false);
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  describe('getCurrentBranch', () => {
    it('should get current branch name', () => {
      const branch = GitManager.getCurrentBranch(testDir);
      // CI environments may use different default branch names
      expect(['main', 'master']).toContain(branch);
    });
  });

  describe('hasChangesToCommit', () => {
    it('should detect no changes initially', () => {
      expect(GitManager.hasChangesToCommit(testDir)).toBe(false);
    });

    it('should detect changes when files are modified', () => {
      writeFileSync(resolve(testDir, 'test.txt'), 'test content');
      expect(GitManager.hasChangesToCommit(testDir)).toBe(true);
    });
  });

  describe('createWipCommitIfNeeded', () => {
    it('should create WIP commit when changes exist and config is enabled', () => {
      const config: GitCommitConfig = {
        enabled: true,
        commitOnStep: true,
        commitOnPhase: false,
        commitOnComplete: false,
        initialMessage: 'Test feature'
      };

      // Create some changes
      writeFileSync(resolve(testDir, 'test.txt'), 'test content');

      const result = GitManager.createWipCommitIfNeeded(
        testDir,
        config,
        'test context',
        'test-phase'
      );

      expect(result).toBe(true);
      
      // Verify commit was created
      const log = execSync('git log --oneline -1', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      }).trim();
      
      expect(log).toContain('WIP: Test feature - test context (test-phase)');
    });

    it('should not create commit when disabled', () => {
      const config: GitCommitConfig = {
        enabled: false,
        commitOnStep: true,
        commitOnPhase: false,
        commitOnComplete: false,
        initialMessage: 'Test feature'
      };

      // Create some changes
      writeFileSync(resolve(testDir, 'test.txt'), 'test content');

      const result = GitManager.createWipCommitIfNeeded(
        testDir,
        config,
        'test context',
        'test-phase'
      );

      expect(result).toBe(false);
    });

    it('should not create commit when no changes exist', () => {
      const config: GitCommitConfig = {
        enabled: true,
        commitOnStep: true,
        commitOnPhase: false,
        commitOnComplete: false,
        initialMessage: 'Test feature'
      };

      const result = GitManager.createWipCommitIfNeeded(
        testDir,
        config,
        'test context',
        'test-phase'
      );

      expect(result).toBe(false);
    });
  });

  describe('getCurrentCommitHash', () => {
    it('should get current commit hash', () => {
      const hash = GitManager.getCurrentCommitHash(testDir);
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[a-f0-9]{40}$/); // SHA-1 hash format
    });
  });
});
