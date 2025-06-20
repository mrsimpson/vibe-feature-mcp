import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { promises as fs } from 'fs';
import path from 'path';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: YAML-based State Machine Configuration', () => {
  describe('Scenario: Using custom state machine from project directory', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'declarative-custom-sm',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should load and use custom state machine with two phases', async () => {
      // Given: a project with a simple custom state machine YAML file at `.vibe/state-machine.yaml`
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      // And: the custom state machine defines only two phases: "phase1" and "phase2"
      const customStateMachine = `
name: "Simple Two Phase State Machine"
description: "A simple two-phase state machine for testing"
initial_state: "phase1"
states:
  phase1:
    description: "First phase of development"
    transitions:
      - trigger: "phase1_complete"
        target: "phase2"
        is_modeled: true
        side_effects:
          instructions: "Working on phase 1 tasks"
          transition_reason: "Phase 1 complete, moving to phase 2"
  phase2:
    description: "Second phase of development"
    transitions: []
direct_transitions:
  - state: "phase1"
    instructions: "Working on phase 1 tasks"
    transition_reason: "Direct transition to phase 1"
  - state: "phase2"
    instructions: "Working on phase 2 tasks"
    transition_reason: "Direct transition to phase 2"
`;

      const customStateMachinePath = path.join(vibeDir, 'state-machine.yaml');
      await fs.writeFile(customStateMachinePath, customStateMachine, 'utf-8');

      // When: the transition engine is initialized for this project
      const result = await client.callTool('whats_next', {
        context: 'testing custom state machine',
        user_input: 'start working with custom state machine'
      });

      // Then: it should load and use the custom state machine
      const response = assertToolSuccess(result);
      
      // And: the initial phase should be "phase1" as defined in the custom state machine
      expect(response.phase).toBe('phase1');
      
      // And: transitions should follow the rules defined in the custom state machine
      expect(response.instructions).toContain('phase 1');
    });

    it('should detect and load custom state machine file', async () => {
      // Create custom state machine
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      const customStateMachine = `
name: "Custom Test State Machine"
description: "A custom state machine for testing detection"
initial_state: "start"
states:
  start:
    description: "Starting state"
    transitions:
      - trigger: "ready_to_end"
        target: "end"
        is_modeled: true
        side_effects:
          instructions: "Custom state machine is working"
          transition_reason: "Ready to end"
  end:
    description: "Ending state"
    transitions: []
direct_transitions:
  - state: "start"
    instructions: "Custom state machine is working"
    transition_reason: "Direct transition to start"
  - state: "end"
    instructions: "Custom state machine completed"
    transition_reason: "Direct transition to end"
`;

      const customStateMachinePath = path.join(vibeDir, 'state-machine.yaml');
      await fs.writeFile(customStateMachinePath, customStateMachine, 'utf-8');

      // Test that custom state machine is used
      const result = await client.callTool('whats_next', {
        context: 'testing custom state machine detection',
        user_input: 'using custom state machine'
      });

      const response = assertToolSuccess(result);
      
      // Should use custom state machine's initial state
      expect(response.phase).toBe('start');
      expect(response.instructions).toContain('Custom state machine is working');
    });

    it('should follow custom state machine transition rules', async () => {
      // Create custom state machine with specific transition rules
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      const customStateMachine = `
name: "Transition Test State Machine"
description: "A state machine for testing transitions"
initial_state: "alpha"
states:
  alpha:
    description: "Alpha state"
    transitions:
      - trigger: "alpha_complete"
        target: "beta"
        is_modeled: true
        side_effects:
          instructions: "In alpha state"
          transition_reason: "Alpha complete"
  beta:
    description: "Beta state"
    transitions:
      - trigger: "beta_complete"
        target: "gamma"
        is_modeled: true
        side_effects:
          instructions: "In beta state"
          transition_reason: "Beta complete"
  gamma:
    description: "Gamma state"
    transitions: []
direct_transitions:
  - state: "alpha"
    instructions: "In alpha state"
    transition_reason: "Direct transition to alpha"
  - state: "beta"
    instructions: "In beta state"
    transition_reason: "Direct transition to beta"
  - state: "gamma"
    instructions: "In gamma state"
    transition_reason: "Direct transition to gamma"
`;

      const customStateMachinePath = path.join(vibeDir, 'state-machine.yaml');
      await fs.writeFile(customStateMachinePath, customStateMachine, 'utf-8');

      // Test initial state
      const initialResult = await client.callTool('whats_next', {
        context: 'testing custom transitions',
        user_input: 'start with custom state machine'
      });

      const initialResponse = assertToolSuccess(initialResult);
      expect(initialResponse.phase).toBe('alpha');

      // Test transition to beta
      const betaResult = await client.callTool('proceed_to_phase', {
        target_phase: 'beta',
        reason: 'transitioning to beta state'
      });

      const betaResponse = assertToolSuccess(betaResult);
      expect(betaResponse.phase).toBe('beta');
      expect(betaResponse.instructions).toContain('beta state');

      // Test transition to gamma
      const gammaResult = await client.callTool('proceed_to_phase', {
        target_phase: 'gamma',
        reason: 'transitioning to gamma state'
      });

      const gammaResponse = assertToolSuccess(gammaResult);
      expect(gammaResponse.phase).toBe('gamma');
      expect(gammaResponse.instructions).toContain('gamma state');
    });
  });
  describe('Scenario: Fallback to default state machine when no custom configuration exists', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'declarative-default-fallback',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should use default state machine when no custom configuration exists', async () => {
      // Given: a project directory without any custom state machine configuration
      // (no .vibe/state-machine.yaml file exists)
      
      // When: the transition engine is initialized
      const result = await client.callTool('whats_next', {
        context: 'testing default state machine fallback',
        user_input: 'start working without custom state machine'
      });

      // Then: it should fall back to the default built-in state machine
      const response = assertToolSuccess(result);
      
      // And: the initial phase should be "idle" (default state machine's initial state)
      expect(response.phase).toBe('idle');
      
      // And: transitions should follow the default state machine rules
      expect(response.instructions).toContain('idle');
    });

    it('should use default phases when no custom state machine is found', async () => {
      // Test that default state machine phases are available
      const result = await client.callTool('whats_next', {
        context: 'testing default phases',
        user_input: 'I want to implement a new feature'
      });

      const response = assertToolSuccess(result);
      
      // Should transition to requirements phase (default behavior)
      expect(['idle', 'requirements']).toContain(response.phase);
    });

    it('should handle transitions through default state machine phases', async () => {
      // Test progression through default phases
      const initialResult = await client.callTool('whats_next', {
        context: 'starting new feature',
        user_input: 'implement user authentication'
      });

      const initialResponse = assertToolSuccess(initialResult);
      
      // Should start with requirements or idle
      expect(['idle', 'requirements']).toContain(initialResponse.phase);

      // Test explicit transition to requirements
      const reqResult = await client.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'starting requirements analysis'
      });

      const reqResponse = assertToolSuccess(reqResult);
      expect(reqResponse.phase).toBe('requirements');

      // Test transition to design
      const designResult = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements complete'
      });

      const designResponse = assertToolSuccess(designResult);
      expect(designResponse.phase).toBe('design');
    });

    it('should provide default instructions for each phase', async () => {
      // Test that default state machine provides proper instructions
      const phases = ['requirements', 'design', 'implementation', 'qa', 'testing'];
      
      for (const phase of phases) {
        const result = await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `testing ${phase} phase`
        });

        const response = assertToolSuccess(result);
        expect(response.phase).toBe(phase);
        expect(response.instructions).toBeTruthy();
        expect(response.instructions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Scenario: Support for alternate file extensions and locations', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'declarative-alt-extensions',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should support .yml extension for state machine files', async () => {
      // Given: a project with a state machine file using .yml extension
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      const customStateMachine = `
name: "YML Extension Test"
description: "Testing YML extension support"
initial_state: "yml_test"
states:
  yml_test:
    description: "Testing YML extension"
    transitions: []
direct_transitions:
  - state: "yml_test"
    instructions: "YML extension is working"
    transition_reason: "Direct transition to yml_test"
`;

      const ymlStateMachinePath = path.join(vibeDir, 'state-machine.yml');
      await fs.writeFile(ymlStateMachinePath, customStateMachine, 'utf-8');

      // When: the transition engine is initialized
      const result = await client.callTool('whats_next', {
        context: 'testing yml extension',
        user_input: 'using yml extension'
      });

      // Then: it should load and use the .yml state machine file
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('yml_test');
      expect(response.instructions).toContain('YML extension is working');
    });

    it('should prioritize .yaml over .yml when both exist', async () => {
      // Given: a project with both .yaml and .yml state machine files
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      const yamlStateMachine = `
name: "YAML Priority Test"
description: "YAML file takes priority over YML"
initial_state: "yaml_priority"
states:
  yaml_priority:
    description: "YAML file takes priority"
    transitions: []
direct_transitions:
  - state: "yaml_priority"
    instructions: "YAML file was loaded"
    transition_reason: "Direct transition to yaml_priority"
`;

      const ymlStateMachine = `
name: "YML Secondary Test"
description: "YML file is secondary to YAML"
initial_state: "yml_secondary"
states:
  yml_secondary:
    description: "YML file is secondary"
    transitions: []
direct_transitions:
  - state: "yml_secondary"
    instructions: "YML file was loaded"
    transition_reason: "Direct transition to yml_secondary"
`;

      const yamlPath = path.join(vibeDir, 'state-machine.yaml');
      const ymlPath = path.join(vibeDir, 'state-machine.yml');
      
      await fs.writeFile(yamlPath, yamlStateMachine, 'utf-8');
      await fs.writeFile(ymlPath, ymlStateMachine, 'utf-8');

      // When: the transition engine is initialized
      const result = await client.callTool('whats_next', {
        context: 'testing file priority',
        user_input: 'testing yaml vs yml priority'
      });

      // Then: it should load the .yaml file (higher priority)
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('yaml_priority');
      expect(response.instructions).toContain('YAML file was loaded');
    });

    it('should handle malformed YAML gracefully and fall back to default', async () => {
      // Given: a project with a malformed state machine YAML file
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      const malformedYaml = `
name: "Malformed YAML Test"
initial_state: "test"
states:
  test:
    description: "This YAML is malformed
    instructions: "Missing closing quote
    transitions: []
  invalid_yaml_structure
`;

      const malformedPath = path.join(vibeDir, 'state-machine.yaml');
      await fs.writeFile(malformedPath, malformedYaml, 'utf-8');

      // When: the transition engine is initialized
      const result = await client.callTool('whats_next', {
        context: 'testing malformed yaml handling',
        user_input: 'using malformed yaml file'
      });

      // Then: it should fall back to the default state machine
      const response = assertToolSuccess(result);
      
      // Should use default state machine (idle phase)
      expect(response.phase).toBe('idle');
    });

    it('should validate state machine structure and fall back on invalid structure', async () => {
      // Given: a project with a structurally invalid state machine file
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });
      
      const invalidStructure = `
name: "Invalid Structure Test"
description: "Testing invalid structure handling"
# Missing initial_state
states:
  test_state:
    description: "Test state with missing required fields"
    # Missing transitions array
`;

      const invalidPath = path.join(vibeDir, 'state-machine.yaml');
      await fs.writeFile(invalidPath, invalidStructure, 'utf-8');

      // When: the transition engine is initialized
      const result = await client.callTool('whats_next', {
        context: 'testing invalid structure handling',
        user_input: 'using invalid structure file'
      });

      // Then: it should fall back to the default state machine
      const response = assertToolSuccess(result);
      
      // Should use default state machine
      expect(response.phase).toBe('idle');
    });
  });
});
