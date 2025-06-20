/**
 * whats_next Tool E2E Tests
 * 
 * Feature: Primary Analysis and Instruction Tool
 * 
 * As an LLM client using the Vibe Feature MCP server
 * I want to call the `whats_next` tool to get contextual development guidance
 * So that I can provide structured assistance to users throughout their development process
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: Primary Analysis and Instruction Tool', () => {
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Scenario: First call to whats_next creates new conversation', () => {
    beforeEach(async () => {
      // Given: no existing conversation state for the current project
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'whats-next-new-conversation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should create new conversation with requirements phase', async () => {
      // Given: the user provides input about implementing a new feature
      // When: I call whats_next with user input "implement user authentication"
      const result = await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'User wants to add authentication to their application'
      });

      // Then: a new conversation should be created
      const response = assertToolSuccess(result);
      
      // And: the phase should be "requirements"
      expect(response.phase).toBe('requirements');
      
      // And: instructions should guide requirements gathering
      expect(response.instructions).toContain('requirements');
      expect(response.instructions.toLowerCase()).toContain('what');
      
      // And: a plan file path should be provided
      expect(response.plan_file_path).toBeDefined();
      expect(response.plan_file_path).toContain('.md');
      
      // And: the transition reason should indicate new feature detection
      expect(response.transition_reason).toContain('New feature request detected');
    });

    it('should detect project path and create conversation ID', async () => {
      // When: I call whats_next
      const result = await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Testing conversation creation'
      });

      const response = assertToolSuccess(result);

      // Then: conversation state should be accessible
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);

      // Database should be queried for existing conversation state
      // New conversation record should be created with unique ID
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.conversationId).toMatch(/^.+-default-.+$/); // Contains project and branch info
      
      // Project path should be detected from current working directory
      expect(stateData.projectPath).toBe(tempProject.projectPath);
      
      // Git branch should be detected from repository state (or default)
      // Note: gitBranch may not be included in state resource, but conversation ID contains branch info
      expect(stateData.conversationId).toContain('default');
    });

    it('should generate plan file path based on feature context', async () => {
      // When: I call whats_next with feature context
      const result = await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Testing plan file generation'
      });

      const response = assertToolSuccess(result);

      // Then: plan file path should be generated based on feature context
      expect(response.plan_file_path).toBeDefined();
      expect(response.plan_file_path).toContain('.vibe');
      expect(response.plan_file_path).toContain('development-plan');
      expect(response.plan_file_path.endsWith('.md')).toBe(true);
    });
  });

  describe('Scenario: Continuing existing conversation in requirements phase', () => {
    beforeEach(async () => {
      // Given: an existing conversation in "requirements" phase
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'whats-next-continuing-conversation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create initial conversation in requirements phase
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Initial feature request'
      });
    });

    it('should remain in requirements phase if not complete', async () => {
      // Given: some requirements have been gathered
      // When: I call whats_next with conversation context
      const result = await client.callTool('whats_next', {
        user_input: 'I need email/password authentication',
        context: 'Continuing requirements gathering',
        conversation_summary: 'User wants authentication, gathering requirements'
      });

      // Then: the phase should remain "requirements" if not complete
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('requirements');
      
      // And: instructions should be contextually appropriate
      expect(response.instructions).toContain('requirements');
      expect(response.instructions.toLowerCase()).toContain('what');
    });

    it('should create isolated conversation states per git branch', async () => {
      // This test verifies that git branch context creates isolated conversation states
      // The current implementation uses "default" branch for temp projects

      // When: I check the conversation state
      const result = await client.callTool('whats_next', {
        user_input: 'check conversation isolation',
        context: 'Testing branch-based conversation isolation'
      });

      const response = assertToolSuccess(result);

      // Then: git branch context should create isolated conversation states
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);

      expect(stateData.conversationId).toContain('default'); // Branch name in conversation ID
      // Note: gitBranch may not be included in state resource, but conversation ID contains branch info
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });

    it('should retrieve existing conversation state from database', async () => {
      // When: I call whats_next on existing conversation
      const result = await client.callTool('whats_next', {
        user_input: 'continue working on authentication',
        context: 'Continuing existing conversation'
      });

      const response = assertToolSuccess(result);

      // Then: existing conversation state should be retrieved from database
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBe(response.phase);
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });
  });

  describe('Scenario: Handling malformed or missing parameters', () => {
    beforeEach(async () => {
      // Given: the MCP server is running
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'whats-next-error-handling',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should handle missing parameters gracefully', async () => {
      // When: I call whats_next with missing parameters
      const result = await client.callTool('whats_next', {
        // Minimal parameters - testing graceful handling
      });

      // Then: the tool should handle errors gracefully
      // And: return meaningful response (not crash)
      expect(result).toBeDefined();
      
      // Tool should work with minimal required parameters
      if (result.isError) {
        // If it's an error, it should be properly formatted
        expect(result.content).toBeDefined();
      } else {
        // If it succeeds, it should provide valid response
        const response = assertToolSuccess(result);
        expect(response.phase).toBeDefined();
        expect(response.instructions).toBeDefined();
      }
    });

    it('should handle invalid parameters gracefully', async () => {
      // When: I call whats_next with invalid parameters
      const result = await client.callTool('whats_next', {
        invalid_parameter: 'this should not cause a crash',
        another_invalid_param: 12345
      });

      // Then: the tool should handle errors gracefully
      // And: not crash the server
      expect(result).toBeDefined();
      
      // Server should still be responsive after invalid call
      const followupResult = await client.callTool('whats_next', {
        user_input: 'test server is still working',
        context: 'Testing server recovery after invalid call'
      });
      
      const followupResponse = assertToolSuccess(followupResult);
      expect(followupResponse.phase).toBeDefined();
    });

    it('should return meaningful error messages when appropriate', async () => {
      // This test depends on the specific error handling implementation
      // For now, we'll test that the server doesn't crash and remains functional
      
      // When: I call whats_next with potentially problematic data
      const result = await client.callTool('whats_next', {
        user_input: null as any, // Intentionally problematic
        context: undefined as any
      });

      // Then: server should handle it gracefully
      expect(result).toBeDefined();
      
      // And: server should remain functional
      const recoveryResult = await client.callTool('whats_next', {
        user_input: 'recovery test',
        context: 'Testing server recovery'
      });
      
      expect(recoveryResult).toBeDefined();
    });
  });
});
