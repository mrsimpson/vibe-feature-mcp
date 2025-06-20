/**
 * YAML State Machine E2E Integration Tests
 * 
 * Tests YAML-based state machine loading using the E2E methodology
 * with DirectServerInterface for consumer perspective testing without process spawning.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { 
  TempProject, 
  createTempProjectWithCustomStateMachine, 
  createTempProjectWithDefaultStateMachine,
  CUSTOM_STATE_MACHINE_YAML 
} from '../utils/temp-files';
import {
  createSuiteIsolatedE2EScenario,
  DirectServerInterface,
  assertToolSuccess,
  TestSuiteIsolation,
  createE2EScenario
} from '../utils/e2e-test-setup';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('YAML State Machine E2E Integration Tests', () => {
  const SUITE_NAME = 'yaml-state-machine';
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

  describe('Scenario: Loading custom state machine from real files', () => {
    it('should load and use custom state machine from project directory', async () => {
      // Given: a real project directory with a custom state machine file
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I start a conversation (which loads the state machine)
      const initialResult = await client.callTool('whats_next', {
        user_input: 'start custom workflow',
        context: 'Testing custom state machine loading'
      });
      
      // Then: the custom state machine should be loaded and used
      const response = assertToolSuccess(initialResult);
      expect(response.phase).toBe('phase1'); // Custom initial state
      expect(response.instructions).toContain('phase 1'); // Custom instructions
      
      // And: the transition engine should work with the custom state machine
      const transitionResult = await client.callTool('proceed_to_phase', {
        target_phase: 'phase2',
        reason: 'testing custom transition'
      });
      
      // Then: transitions should follow the custom state machine rules
      const transitionResponse = assertToolSuccess(transitionResult);
      expect(transitionResponse.phase).toBe('phase2');
      expect(transitionResponse.instructions).toBe('Direct to phase 2');
      expect(transitionResponse.transition_reason).toContain('phase 2');
    });

    it('should handle .yml extension for custom state machine', async () => {
      // Given: a project with a custom state machine using .yml extension
      tempProject = new TempProject({
        projectName: 'yml-test-project',
        additionalFiles: {
          '.vibe/state-machine.yml': CUSTOM_STATE_MACHINE_YAML
        }
      });
      
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I start a conversation (which loads the .yml state machine)
      const result = await client.callTool('whats_next', {
        user_input: 'start workflow with yml extension',
        context: 'Testing .yml extension support'
      });
      
      // Then: the custom state machine should be loaded correctly
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('phase1'); // Custom initial state from .yml file
      expect(response.instructions).toContain('phase 1');
    });

    it('should validate custom state machine phases in transitions', async () => {
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
        context: 'Testing custom state machine validation'
      });
      
      // When: I try to transition to an invalid phase
      const invalidResult = await client.callTool('proceed_to_phase', {
        target_phase: 'invalid_phase',
        reason: 'testing validation'
      });
      
      // Then: it should reject invalid phases
      expect(invalidResult).toHaveProperty('error');
      expect(invalidResult.error).toContain('Invalid target phase');
      
      // But: valid custom phases should work
      const validResult = await client.callTool('proceed_to_phase', {
        target_phase: 'phase2',
        reason: 'testing valid custom phase'
      });
      
      const validResponse = assertToolSuccess(validResult);
      expect(validResponse.phase).toBe('phase2');
    });
  });

  describe('Scenario: Falling back to default state machine', () => {
    it('should use default state machine when no custom one exists', async () => {
      // Given: a project directory without a custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I start a conversation (which loads the default state machine)
      const result = await client.callTool('whats_next', {
        user_input: 'implement a new feature',
        context: 'Testing default state machine fallback'
      });
      
      // Then: the default state machine should be loaded and used
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('requirements'); // Default transition from idle
      expect(response.instructions).toContain('requirements analysis');
      expect(response.transition_reason).toContain('New feature request detected');
      
      // And: all default phases should be available for transitions
      const phases = ['idle', 'requirements', 'design', 'implementation', 'qa', 'testing', 'complete'];
      
      for (const phase of phases) {
        const transitionResult = await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `testing transition to ${phase}`
        });
        
        const transitionResponse = assertToolSuccess(transitionResult);
        expect(transitionResponse.phase).toBe(phase);
        expect(transitionResponse.instructions).toBeDefined();
      }
    });

    it('should handle modeled vs direct transitions correctly', async () => {
      // Given: a project with default state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I trigger a modeled transition (via whats_next analysis)
      const modeledResult = await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Testing modeled transition',
        conversation_summary: 'User wants to implement authentication feature'
      });
      
      // Then: it should be marked as a modeled transition
      const modeledResponse = assertToolSuccess(modeledResult);
      expect(modeledResponse.phase).toBe('requirements');
      expect(modeledResponse.is_modeled_transition).toBe(true);
      
      // When: I trigger a direct transition (via proceed_to_phase)
      const directResult = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'explicit transition to design'
      });
      
      // Then: it should be a direct transition
      const directResponse = assertToolSuccess(directResult);
      expect(directResponse.phase).toBe('design');
      // Direct transitions don't have is_modeled_transition flag (it's implicit)
    });
  });

  describe('Scenario: State machine integration with conversation state', () => {
    it('should persist state machine context in conversation state', async () => {
      // Given: a project with custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I start a conversation and perform transitions
      await client.callTool('whats_next', {
        user_input: 'start custom workflow',
        context: 'Testing state persistence'
      });
      
      await client.callTool('proceed_to_phase', {
        target_phase: 'phase2',
        reason: 'moving to phase 2'
      });
      
      // Then: the conversation state should reflect the custom state machine context
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      expect(stateData.currentPhase).toBe('phase2');
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });

    it('should handle state machine loading errors gracefully', async () => {
      // Given: a project with malformed state machine file
      const malformedYaml = `
name: Broken State Machine
initial_state: nonexistent_state
states:
  phase1:
    description: "Phase 1"
    # Missing required fields
`;
      
      tempProject = new TempProject({
        projectName: 'broken-state-machine-project',
        additionalFiles: {
          '.vibe/state-machine.yaml': malformedYaml
        }
      });
      
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I try to start a conversation with broken state machine
      const result = await client.callTool('whats_next', {
        user_input: 'test with broken state machine',
        context: 'Testing error handling'
      });
      
      // Then: it should fall back to default state machine or handle error gracefully
      // (The exact behavior depends on implementation - it should not crash)
      expect(result).toBeDefined();
      // Either it falls back to default behavior or returns a meaningful error
      if (result.error) {
        expect(result.error).toContain('state machine');
      } else {
        // If it falls back, it should work with default phases
        const response = assertToolSuccess(result);
        expect(response.phase).toBeDefined();
      }
    });
  });

  describe('Scenario: Complex custom state machine workflows', () => {
    it('should handle multi-step custom workflows', async () => {
      // Given: a project with a more complex custom state machine
      const complexStateMachine = `
name: Complex Custom Workflow
description: A multi-step custom development workflow
initial_state: planning

states:
  planning:
    description: "Initial planning phase"
    direct_transitions:
      - state: research
        instructions: "Move to research phase"
      - state: prototyping
        instructions: "Skip to prototyping"

  research:
    description: "Research and analysis phase"
    direct_transitions:
      - state: prototyping
        instructions: "Begin prototyping"
      - state: planning
        instructions: "Return to planning"

  prototyping:
    description: "Prototype development phase"
    direct_transitions:
      - state: testing
        instructions: "Move to testing"
      - state: research
        instructions: "Return to research"

  testing:
    description: "Testing and validation phase"
    direct_transitions:
      - state: deployment
        instructions: "Deploy prototype"
      - state: prototyping
        instructions: "Return to prototyping"

  deployment:
    description: "Deployment and completion phase"
    direct_transitions:
      - state: planning
        instructions: "Start new cycle"

transitions:
  - from: planning
    to: research
    trigger: "research needed"
    instructions: "Start research phase based on planning requirements"
    reason: "Research phase triggered from planning"
`;

      tempProject = new TempProject({
        projectName: 'complex-workflow-project',
        additionalFiles: {
          '.vibe/state-machine.yaml': complexStateMachine
        }
      });
      
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I work through the complex workflow
      const initialResult = await client.callTool('whats_next', {
        user_input: 'start complex project',
        context: 'Testing complex custom workflow'
      });
      
      // Then: it should start in the custom initial state
      const initialResponse = assertToolSuccess(initialResult);
      expect(initialResponse.phase).toBe('planning');
      
      // When: I progress through the workflow
      const researchResult = await client.callTool('proceed_to_phase', {
        target_phase: 'research',
        reason: 'need to research the solution'
      });
      
      const prototypingResult = await client.callTool('proceed_to_phase', {
        target_phase: 'prototyping',
        reason: 'research complete, ready to prototype'
      });
      
      const testingResult = await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'prototype ready for testing'
      });
      
      // Then: each transition should work correctly
      expect(assertToolSuccess(researchResult).phase).toBe('research');
      expect(assertToolSuccess(prototypingResult).phase).toBe('prototyping');
      expect(assertToolSuccess(testingResult).phase).toBe('testing');
      
      // And: the final state should be accessible via resource
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('testing');
    });
  });
});
