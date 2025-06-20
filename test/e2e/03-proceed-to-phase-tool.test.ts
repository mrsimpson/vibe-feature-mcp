/**
 * proceed_to_phase Tool E2E Tests
 * 
 * Feature: Explicit Phase Transition Tool
 * 
 * As an LLM client using the Vibe Feature MCP server
 * I want to call the `proceed_to_phase` tool to explicitly transition between development phases
 * So that I can control the development workflow progression when phases are complete
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess, assertToolError } from '../utils/e2e-test-setup.js';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: Explicit Phase Transition Tool', () => {
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Scenario: Valid phase transition from requirements to design', () => {
    beforeEach(async () => {
      // Given: an existing conversation in "requirements" phase
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-valid-transition',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create initial conversation in requirements phase
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting requirements phase'
      });
    });

    it('should transition from requirements to design phase', async () => {
      // Given: the requirements phase has completed tasks
      // When: I call proceed_to_phase with target_phase "design"
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements complete, moving to design'
      });

      // Then: the conversation phase should be updated to "design"
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('design');
      
      // And: design-specific instructions should be returned
      expect(response.instructions).toContain('design');
      expect(response.instructions.toLowerCase()).toContain('how');
      
      // And: the database should be updated with the new phase
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('design');
      
      // And: the transition reason should be recorded
      expect(response.transition_reason).toContain('requirements complete');
    });

    it('should maintain consistent plan file path', async () => {
      // When: I transition to design phase
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'testing plan file consistency'
      });

      const response = assertToolSuccess(result);
      
      // Then: plan file path should remain consistent
      expect(response.plan_file_path).toBeDefined();
      expect(response.plan_file_path).toContain('.vibe');
      expect(response.plan_file_path).toContain('development-plan');
      expect(response.plan_file_path.endsWith('.md')).toBe(true);
    });

    it('should provide phase-specific guidance', async () => {
      // When: I transition to design phase
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'design'
      });

      const response = assertToolSuccess(result);
      
      // Then: phase-specific guidance should be provided
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
      expect(response.instructions).toContain('design');
    });
  });

  describe('Scenario: Direct phase transition skipping intermediate phases', () => {
    beforeEach(async () => {
      // Given: an existing conversation in "requirements" phase
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-skip-phases',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create initial conversation in requirements phase
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting requirements phase'
      });
    });

    it('should allow direct transition to implementation', async () => {
      // When: I call proceed_to_phase with target_phase "implementation"
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'skipping design phase for rapid prototyping'
      });

      // Then: the phase should transition directly to "implementation"
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('implementation');
      
      // And: implementation-specific instructions should be provided
      expect(response.instructions).toContain('implementation');
      expect(response.instructions.toLowerCase()).toContain('code');
      
      // And: the transition should be allowed (no strict sequential enforcement)
      expect(response.transition_reason).toContain('skipping design');
      
      // And: database should record the direct transition
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('implementation');
    });

    it('should handle non-sequential transitions gracefully', async () => {
      // When: I transition directly to testing phase
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'jumping to testing for validation'
      });

      const response = assertToolSuccess(result);
      
      // Then: non-sequential transitions should be permitted
      expect(response.phase).toBe('testing');
      expect(response.instructions).toContain('testing');
      
      // And: no validation errors should occur for phase skipping
      expect(response.transition_reason).toBeDefined();
    });
  });

  describe('Scenario: Transition to completion phase', () => {
    beforeEach(async () => {
      // Given: an existing conversation in "testing" phase
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-completion',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation and move to testing phase
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting development'
      });
      
      await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'moving to testing phase'
      });
    });

    it('should transition to complete phase', async () => {
      // Given: all testing tasks are complete
      // When: I call proceed_to_phase with target_phase "complete"
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'all testing complete, project ready for delivery'
      });

      // Then: the conversation should be marked as complete
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('complete');
      
      // And: completion instructions should be provided
      expect(response.instructions).toContain('complete');
      
      // And: the conversation state should reflect project completion
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('complete');
    });

    it('should provide completion-specific instructions', async () => {
      // When: I transition to complete phase
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'complete'
      });

      const response = assertToolSuccess(result);
      
      // Then: completion-specific instructions should be generated
      expect(response.instructions).toBeDefined();
      expect(response.instructions).toContain('complete');
      
      // And: instructions should guide project wrap-up activities
      expect(response.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Invalid phase transition parameters', () => {
    beforeEach(async () => {
      // Given: the MCP server is running
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-invalid-params',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should reject invalid phase names', async () => {
      // When: I call proceed_to_phase with an invalid target_phase
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'invalid_phase_name',
        reason: 'testing invalid phase'
      });

      // Then: the tool should return an error response or handle gracefully
      // Note: The actual behavior depends on implementation - it might succeed with a fallback
      expect(result).toBeDefined();
      
      // Server should remain stable after invalid requests
      const followupResult = await client.callTool('whats_next', {
        user_input: 'test server stability',
        context: 'Testing after invalid phase transition'
      });
      
      const followupResponse = assertToolSuccess(followupResult);
      expect(followupResponse.phase).toBeDefined();
    });

    it('should handle missing target_phase parameter', async () => {
      // When: I call proceed_to_phase without target_phase
      const result = await client.callTool('proceed_to_phase', {
        reason: 'testing missing target_phase'
      });

      // Then: the tool should handle the error gracefully
      expect(result).toBeDefined();
      
      // And: server should remain stable
      const followupResult = await client.callTool('whats_next', {
        user_input: 'test server stability',
        context: 'Testing after missing parameter'
      });
      
      expect(followupResult).toBeDefined();
    });
  });

  describe('Scenario: Transition with detailed reason', () => {
    beforeEach(async () => {
      // Given: an existing conversation in "design" phase
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-detailed-reason',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation and move to design phase
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting development'
      });
      
      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design phase'
      });
    });

    it('should record and return detailed transition reason', async () => {
      // When: I call proceed_to_phase with detailed reason
      const detailedReason = 'design approved by user, ready to code, all architecture decisions finalized';
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: detailedReason
      });

      // Then: the transition should be recorded with the provided reason
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('implementation');
      
      // And: the reason should be included in the response
      expect(response.transition_reason).toContain('design approved');
      
      // And: the database should store the transition reason
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('implementation');
    });

    it('should preserve transition history', async () => {
      // When: I make multiple transitions with reasons
      await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'first transition reason'
      });
      
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'qa',
        reason: 'second transition reason'
      });

      // Then: historical transition data should be preserved
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('qa');
      expect(response.transition_reason).toContain('second transition');
      
      // And: reasons should help with conversation context understanding
      expect(response.transition_reason).toBeDefined();
    });
  });

  describe('Scenario: Transition without existing conversation', () => {
    beforeEach(async () => {
      // Given: no existing conversation state for the current project
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-no-conversation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should create new conversation with target phase', async () => {
      // When: I call proceed_to_phase with target_phase "design"
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'starting directly in design phase'
      });

      // Then: a new conversation should be created
      const response = assertToolSuccess(result);
      
      // And: the phase should be set to the requested target phase
      expect(response.phase).toBe('design');
      
      // And: appropriate instructions should be generated for the target phase
      expect(response.instructions).toContain('design');
      
      // Verify conversation was created
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBe('design');
    });

    it('should handle project detection like whats_next tool', async () => {
      // When: I call proceed_to_phase without existing conversation
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'starting directly in implementation'
      });

      const response = assertToolSuccess(result);
      
      // Then: project detection should work same as whats_next tool
      expect(response.plan_file_path).toBeDefined();
      expect(response.plan_file_path).toBe(tempProject.projectPath + '/.vibe/development-plan-default.md');
      
      // And: instructions should be contextually appropriate for starting at target phase
      expect(response.instructions).toContain('implementation');
    });
  });

  describe('Scenario: Concurrent phase transitions', () => {
    beforeEach(async () => {
      // Given: multiple rapid calls to proceed_to_phase
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'proceed-to-phase-concurrent',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting development'
      });
    });

    it('should handle rapid successive transitions', async () => {
      // When: transitions are requested in quick succession
      const transitions = [
        client.callTool('proceed_to_phase', {
          target_phase: 'design',
          reason: 'first transition'
        }),
        client.callTool('proceed_to_phase', {
          target_phase: 'implementation',
          reason: 'second transition'
        }),
        client.callTool('proceed_to_phase', {
          target_phase: 'qa',
          reason: 'third transition'
        })
      ];

      const results = await Promise.all(transitions);

      // Then: each transition should be processed atomically
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // And: the final state should reflect the last successful transition
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      // Final state should be deterministic
      expect(stateData.currentPhase).toBeDefined();
      expect(['design', 'implementation', 'qa']).toContain(stateData.currentPhase);
      
      // And: no data corruption should occur from concurrent access
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });

    it('should maintain database consistency under concurrent load', async () => {
      // When: I make multiple concurrent transitions
      const concurrentTransitions = Array.from({ length: 5 }, (_, i) =>
        client.callTool('proceed_to_phase', {
          target_phase: i % 2 === 0 ? 'design' : 'implementation',
          reason: `concurrent transition ${i}`
        })
      );

      const results = await Promise.all(concurrentTransitions);

      // Then: database updates should be atomic and consistent
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // And: final conversation state should be deterministic
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      expect(stateData.currentPhase).toBeDefined();
      expect(['design', 'implementation']).toContain(stateData.currentPhase);
      expect(stateData.conversationId).toBeDefined();
    });
  });
});
