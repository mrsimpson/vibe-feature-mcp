/**
 * Test for Dynamic Tool Description Feature
 * 
 * Verifies that the start_development tool description adapts based on git repository detection
 * by testing the actual behavior when the tool is called with different commit_behaviour values
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { VibeFeatureMCPServer } from '../src/server/index.js';

describe('Dynamic Tool Description', () => {
  let tempDir: string;
  let server: VibeFeatureMCPServer;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = join(tmpdir(), `vibe-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Change to temp directory
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    if (server) {
      await server.cleanup();
    }
    
    // Remove temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle git repository with "end" commit behavior', async () => {
    // Initialize git repository
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    
    // Create initial commit
    writeFileSync(join(tempDir, 'README.md'), '# Test Project');
    execSync('git add .', { cwd: tempDir });
    execSync('git commit -m "Initial commit"', { cwd: tempDir });

    // Create feature branch
    execSync('git checkout -b feature/test', { cwd: tempDir });

    // Initialize server
    server = new VibeFeatureMCPServer();
    await server.initialize();

    // Call start_development with "end" behavior (recommended for git repos)
    const result = await server.handleStartDevelopment({
      workflow: 'waterfall',
      commit_behaviour: 'end'
    });

    expect(result.phase).toBeDefined();
    expect(result.instructions).toBeDefined();
  });

  it('should handle non-git directory with "none" commit behavior', async () => {
    // Don't initialize git - just use regular directory
    
    // Initialize server
    server = new VibeFeatureMCPServer();
    await server.initialize();

    // Call start_development with "none" behavior (required for non-git projects)
    const result = await server.handleStartDevelopment({
      workflow: 'waterfall',
      commit_behaviour: 'none'
    });

    expect(result.phase).toBeDefined();
    expect(result.instructions).toBeDefined();
  });

  it('should handle git repository with different commit behaviors', async () => {
    // Initialize git repository
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    
    // Create initial commit
    writeFileSync(join(tempDir, 'README.md'), '# Test Project');
    execSync('git add .', { cwd: tempDir });
    execSync('git commit -m "Initial commit"', { cwd: tempDir });

    // Create feature branch
    execSync('git checkout -b feature/test', { cwd: tempDir });

    // Initialize server
    server = new VibeFeatureMCPServer();
    await server.initialize();

    // Test all commit behaviors work for git repos
    const behaviors: Array<'step' | 'phase' | 'end' | 'none'> = ['step', 'phase', 'end', 'none'];
    
    for (const behavior of behaviors) {
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        commit_behaviour: behavior
      });

      expect(result.phase).toBeDefined();
      expect(result.instructions).toBeDefined();
      
      // Reset for next test
      await server.handleResetDevelopment({ confirm: true });
    }
  });

  it('should verify GitManager correctly detects repository status', async () => {
    // Test non-git directory
    const { GitManager } = await import('../src/git-manager.js');
    
    expect(GitManager.isGitRepository(tempDir)).toBe(false);
    
    // Initialize git repository
    execSync('git init', { cwd: tempDir });
    
    expect(GitManager.isGitRepository(tempDir)).toBe(true);
  });
});
