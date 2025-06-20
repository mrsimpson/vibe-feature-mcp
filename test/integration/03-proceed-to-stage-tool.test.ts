/**
 * proceed_to_phase Tool E2E Integration Tests
 * 
 * Tests the proceed_to_phase tool functionality using the E2E methodology
 * with DirectServerInterface for consumer perspective testing without process spawning.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine, createTempProjectWithCustomStateMachine, CUSTOM_STATE_MACHINE_YAML } from '../utils/temp-files.js';
import { createSuiteIsolatedE2EScenario, DirectServerInterface, assertToolSuccess, TestSuiteIsolation } from '../utils/e2e-test-setup.js';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('proceed_to_phase Tool E2E Integration Tests', () => {
  const SUITE_NAME = 'proceed-to-stage-tool';
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
    if (tempProject) {
      tempProject.cleanup();
    }
  });

  afterAll(async () => {
    // Clean up the entire suite
    await TestSuiteIsolation.cleanupSuite(SUITE_NAME);
  });

  describe('Scenario: Valid phase transitions with default state machine', () => {
    it('should transition from requirements to design', async () => {
      // Given: a project with default state machine and existing conversation
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation in requirements phase
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting new feature development'
      });
      
      // When: I perform an explicit phase transition to design
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements complete'
      });
      
      // Then: the transition should be successful
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('design');
      expect(response.instructions).toContain('design');
      expect(response.transition_reason).toContain('requirements complete');
      expect(response.plan_file_path).toBeDefined();
    });

    it('should allow direct transition to implementation', async () => {
      // Given: a project setup with initial conversation
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      // When: I skip intermediate phases and go directly to implementation
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'skipping to implementation'
      });
      
      // Then: the direct transition should work
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('implementation');
      expect(response.instructions).toContain('implementation');
      expect(response.transition_reason).toContain('skipping to implementation');
    });

    it('should transition to complete phase', async () => {
      // Given: a project setup with conversation in testing phase
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation and progress to testing
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'ready for testing'
      });
      
      // When: I transition to completion
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'testing finished'
      });
      
      // Then: the completion transition should work
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('complete');
      expect(response.instructions).toContain('complete');
      expect(response.transition_reason).toContain('testing finished');
    });
  });

  describe('Scenario: Invalid phase transition parameters', () => {
    it('should reject invalid phase names', async () => {
      // Given: a project setup with existing conversation
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      // When: I try to transition to an invalid phase
      // Then: it should return an error response
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'invalid_phase',
        reason: 'testing invalid transition'
      });
      
      // The result should contain an error
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Invalid target phase');
    });

    it('should handle missing required parameters', async () => {
      // Given: a project setup with existing conversation
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      // When: I call proceed_to_phase without required target_phase parameter
      // Then: it should return an error response
      const result = await client.callTool('proceed_to_phase', {
        reason: 'testing missing parameter'
      });
      
      // The result should contain an error
      expect(result).toHaveProperty('error');
    });

    it('should handle transitions from any valid phase', async () => {
      // Given: a project setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      // When: I transition through various phases
      const phases = ['requirements', 'design', 'implementation', 'qa', 'testing', 'complete'];
      
      for (const toPhase of phases) {
        const result = await client.callTool('proceed_to_phase', {
          target_phase: toPhase,
          reason: `transitioning to ${toPhase}`
        });
        
        // Then: all valid transitions should work
        const response = assertToolSuccess(result);
        expect(response.phase).toBe(toPhase);
        expect(response.instructions).toBeDefined();
        expect(response.transition_reason).toBeDefined();
      }
    });
  });

  describe('Scenario: Custom state machine transitions', () => {
    it('should work with custom state machine phases', async () => {
      // Given: a project with custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'start custom workflow',
        context: 'Using custom state machine'
      });
      
      // When: I perform transitions with custom phases
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'phase2',
        reason: 'moving to phase 2'
      });
      
      // Then: the custom transition should work
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('phase2');
      expect(response.instructions).toBe('Direct to phase 2');
      expect(response.transition_reason).toContain('phase 2');
    });

    it('should reject invalid phases for custom state machine', async () => {
      // Given: a project with custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'start custom workflow',
        context: 'Using custom state machine'
      });
      
      // When: I try to use default phases with custom state machine
      // Then: it should reject default phases
      const result1 = await client.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'trying default phase'
      });
      
      expect(result1).toHaveProperty('error');
      expect(result1.error).toContain('Invalid target phase');
      
      const result2 = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'trying another default phase'
      });
      
      expect(result2).toHaveProperty('error');
      expect(result2.error).toContain('Invalid target phase');
    });
  });

  describe('Scenario: Integration with conversation state management', () => {
    it('should update conversation state after transitions', async () => {
      // Given: a project setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      // When: I perform a phase transition
      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design'
      });
      
      // Then: the conversation state should be updated
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      expect(stateData.currentPhase).toBe('design');
      expect(stateData.conversationId).toBeDefined();
      // Note: The project path in the state might be different from tempProject.projectPath
      // because the conversation manager might be using the actual project path for git branch detection
      expect(stateData.projectPath).toBeDefined();
    });

    it('should handle multiple rapid transitions correctly', async () => {
      // Given: a project setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement feature',
        context: 'Starting development'
      });
      
      // When: I perform multiple rapid transitions
      const transition1 = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design'
      });
      
      const transition2 = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'moving to implementation'
      });
      
      const transition3 = await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'completing feature'
      });
      
      // Then: each transition should be processed correctly
      const response1 = assertToolSuccess(transition1);
      const response2 = assertToolSuccess(transition2);
      const response3 = assertToolSuccess(transition3);
      
      expect(response1.phase).toBe('design');
      expect(response2.phase).toBe('implementation');
      expect(response3.phase).toBe('complete');
      
      // And: each should have proper instructions and reasons
      expect(response1.instructions).toBeDefined();
      expect(response2.instructions).toBeDefined();
      expect(response3.instructions).toBeDefined();
      
      // And: final state should reflect the last transition
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('complete');
    });
  });

  describe('Scenario: Plan file integration', () => {
    it('should provide plan file path in transition response', async () => {
      // Given: a project setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement authentication',
        context: 'Starting auth feature'
      });
      
      // When: I perform a phase transition
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements complete'
      });
      
      // Then: the response should include plan file path
      const response = assertToolSuccess(result);
      expect(response.plan_file_path).toBeDefined();
      expect(response.plan_file_path).toContain('.md');
      
      // And: the plan file should be accessible via resource
      const planResource = await client.readResource('plan://current');
      expect(planResource.contents[0].text).toBeDefined();
    });
  });
});
