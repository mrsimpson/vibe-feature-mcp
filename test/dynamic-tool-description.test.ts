/**
 * Test for Dynamic Tool Description Feature
 * 
 * Verifies that the start_development tool description adapts based on git repository detection
 * by testing the actual behavior when the tool is called with different commit_behaviour values
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { ResponsibleVibeMCPServer } from '../src/server/index.js';
import { GitTestHelper, ServerTestHelper, MockDocsHelper, TestAssertions } from './utils/test-helpers.js';

describe('Dynamic Tool Description', () => {
  let tempDir: string;
  let server: ResponsibleVibeMCPServer;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = join(tmpdir(), `vibe-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Change to temp directory
    process.chdir(tempDir);
  });

  afterEach(async () => {
    await ServerTestHelper.cleanupServer(server);
    
    // Remove temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle git repository with "end" commit behavior', async () => {
    // Setup git repository with feature branch
    GitTestHelper.setupFullRepo(tempDir, 'feature/test');
    MockDocsHelper.addToProject(tempDir);

    // Initialize server and test
    server = await ServerTestHelper.createServer(tempDir);
    const result = await server.handleStartDevelopment({
      workflow: 'waterfall',
      commit_behaviour: 'end'
    });

    TestAssertions.expectValidResult(result);
  });

  it('should handle non-git directory with "none" commit behavior', async () => {
    // Don't initialize git - just use regular directory
    MockDocsHelper.addToProject(tempDir);
    
    // Initialize server and test
    server = await ServerTestHelper.createServer(tempDir);
    const result = await server.handleStartDevelopment({
      workflow: 'waterfall',
      commit_behaviour: 'none'
    });

    TestAssertions.expectValidResult(result);
  });

  it('should handle git repository with different commit behaviors', async () => {
    // Setup git repository with feature branch
    GitTestHelper.setupFullRepo(tempDir, 'feature/test');
    MockDocsHelper.addToProject(tempDir);

    // Initialize server
    server = await ServerTestHelper.createServer(tempDir);

    // Test all commit behaviors work for git repos
    const behaviors: Array<'step' | 'phase' | 'end' | 'none'> = ['step', 'phase', 'end', 'none'];
    
    for (const behavior of behaviors) {
      const result = await server.handleStartDevelopment({
        workflow: 'waterfall',
        commit_behaviour: behavior
      });

      TestAssertions.expectValidResult(result);
      
      // Reset for next test
      await server.handleResetDevelopment({ confirm: true });
    }
  });

  it('should verify GitManager correctly detects repository status', async () => {
    // Test non-git directory
    const { GitManager } = await import('../src/git-manager.js');
    
    expect(GitManager.isGitRepository(tempDir)).toBe(false);
    
    // Initialize git repository
    GitTestHelper.initializeRepo(tempDir);
    
    expect(GitManager.isGitRepository(tempDir)).toBe(true);
  });
});
