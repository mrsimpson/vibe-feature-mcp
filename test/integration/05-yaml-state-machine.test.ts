/**
 * Integration tests for YAML-based state machine loading
 * 
 * These tests verify that the state machine loading works with real files
 * in integration with other components (without spawning server processes).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransitionEngine } from '../../src/transition-engine.js';
import { StateMachineLoader } from '../../src/state-machine-loader.js';
import { 
  TempProject, 
  createTempProjectWithCustomStateMachine, 
  createTempProjectWithDefaultStateMachine,
  CUSTOM_STATE_MACHINE_YAML 
} from '../utils/temp-files.js';

// Disable fs mocking for integration tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('YAML State Machine Integration Tests', () => {
  let tempProject: TempProject;

  afterEach(() => {
    if (tempProject) {
      tempProject.cleanup();
    }
  });

  describe('Scenario: Loading custom state machine from real files', () => {
    it('should load and use custom state machine from project directory', () => {
      // Given: a real project directory with a custom state machine file
      tempProject = createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML);
      
      // When: the state machine loader loads from the real file
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(tempProject.projectPath);
      
      // Then: the custom state machine should be loaded correctly
      expect(stateMachine.name).toBe('Custom Test State Machine');
      expect(stateMachine.initial_state).toBe('phase1');
      expect(Object.keys(stateMachine.states)).toContain('phase1');
      expect(Object.keys(stateMachine.states)).toContain('phase2');
      
      // And: the transition engine should work with the custom state machine
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      const result = transitionEngine.handleExplicitTransition('phase1', 'phase2');
      
      // Then: transitions should follow the custom state machine rules
      expect(result.newPhase).toBe('phase2');
      expect(result.instructions).toBe('Moving to phase 2'); // This comes from the modeled transition
      expect(result.transitionReason).toBe('Transition to phase 2 triggered');
    });

    it('should handle .yml extension for custom state machine', () => {
      // Given: a project with a custom state machine using .yml extension
      tempProject = new TempProject({
        projectName: 'yml-test-project',
        additionalFiles: {
          '.vibe/state-machine.yml': CUSTOM_STATE_MACHINE_YAML
        }
      });
      
      // When: the state machine loader loads from the .yml file
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(tempProject.projectPath);
      
      // Then: the custom state machine should be loaded correctly
      expect(stateMachine.name).toBe('Custom Test State Machine');
      expect(stateMachine.initial_state).toBe('phase1');
    });
  });

  describe('Scenario: Falling back to default state machine', () => {
    it('should use default state machine when no custom one exists', () => {
      // Given: a project directory without a custom state machine
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: the state machine loader attempts to load
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(tempProject.projectPath);
      
      // Then: the default state machine should be loaded
      expect(stateMachine.name).toBe('Development Workflow');
      expect(stateMachine.initial_state).toBe('idle');
      expect(Object.keys(stateMachine.states)).toContain('idle');
      expect(Object.keys(stateMachine.states)).toContain('requirements');
      expect(Object.keys(stateMachine.states)).toContain('design');
      expect(Object.keys(stateMachine.states)).toContain('implementation');
      expect(Object.keys(stateMachine.states)).toContain('qa');
      expect(Object.keys(stateMachine.states)).toContain('testing');
      expect(Object.keys(stateMachine.states)).toContain('complete');
      
      // And: the transition engine should work with the default state machine
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'implement a new feature',
        context: 'Testing default state machine integration',
        conversationSummary: 'Testing default state machine transition'
      });
      
      // Then: transitions should follow the default state machine rules
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toContain('Start requirements analysis');
      expect(result.transitionReason).toContain('New feature request detected');
      expect(result.isModeled).toBe(true);
    });
  });

  describe('Scenario: Integration with TransitionEngine', () => {
    it('should integrate properly with TransitionEngine for custom phases', () => {
      // Given: a project with custom state machine
      tempProject = createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML);
      
      // When: TransitionEngine is used with custom phases
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: it should handle custom phase transitions
      expect(() => {
        transitionEngine.handleExplicitTransition('phase1', 'phase2');
      }).not.toThrow();
      
      // And: it should reject invalid phases
      expect(() => {
        transitionEngine.handleExplicitTransition('phase1', 'invalid_phase');
      }).toThrow(/Invalid target phase/);
    });
  });
});
