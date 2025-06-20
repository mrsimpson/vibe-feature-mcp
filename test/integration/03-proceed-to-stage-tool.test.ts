/**
 * proceed_to_phase Tool Integration Tests
 * 
 * Tests the proceed_to_phase tool functionality with real file system integration
 * focusing on component-level testing rather than full server spawning.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine, createTempProjectWithCustomStateMachine, CUSTOM_STATE_MACHINE_YAML } from '../utils/temp-files.js';

// Disable fs mocking for integration tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('proceed_to_phase Tool Integration Tests', () => {
  let tempProject: TempProject;

  afterEach(() => {
    if (tempProject) {
      tempProject.cleanup();
    }
  });

  describe('Scenario: Valid phase transitions with default state machine', () => {
    it('should transition from requirements to design', async () => {
      // Given: a project with default state machine
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I perform an explicit phase transition
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.handleExplicitTransition('requirements', 'design');
      
      // Then: the transition should be successful
      expect(result.newPhase).toBe('design');
      expect(result.instructions).toContain('design');
      expect(result.transitionReason).toContain('design');
      expect(result.isModeled).toBe(false); // Direct transitions are not modeled
    });

    it('should allow direct transition to implementation', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I skip intermediate phases
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.handleExplicitTransition('idle', 'implementation');
      
      // Then: the direct transition should work
      expect(result.newPhase).toBe('implementation');
      expect(result.instructions).toContain('implementation');
      expect(result.transitionReason).toContain('implementation');
    });

    it('should transition to complete phase', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I transition to completion
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.handleExplicitTransition('testing', 'complete');
      
      // Then: the completion transition should work
      expect(result.newPhase).toBe('complete');
      expect(result.instructions).toContain('complete');
      expect(result.transitionReason).toContain('complete');
    });
  });

  describe('Scenario: Invalid phase transition parameters', () => {
    it('should reject invalid phase names', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I try to transition to an invalid phase
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: it should throw an error
      expect(() => {
        transitionEngine.handleExplicitTransition('idle', 'invalid_phase');
      }).toThrow(/Invalid target phase/);
    });

    it('should handle transitions from any valid phase', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I transition from various phases
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: all valid transitions should work
      const phases = ['idle', 'requirements', 'design', 'implementation', 'qa', 'testing', 'complete'];
      
      for (const fromPhase of phases) {
        for (const toPhase of phases) {
          const result = transitionEngine.handleExplicitTransition(fromPhase, toPhase);
          expect(result.newPhase).toBe(toPhase);
          expect(result.instructions).toBeDefined();
          expect(result.transitionReason).toBeDefined();
        }
      }
    });
  });

  describe('Scenario: Custom state machine transitions', () => {
    it('should work with custom state machine phases', async () => {
      // Given: a project with custom state machine
      tempProject = createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML);
      
      // When: I perform transitions with custom phases
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.handleExplicitTransition('phase1', 'phase2');
      
      // Then: the custom transition should work
      expect(result.newPhase).toBe('phase2');
      expect(result.instructions).toBe('Direct to phase 2');
      expect(result.transitionReason).toBe('Direct transition to phase 2');
    });

    it('should reject invalid phases for custom state machine', async () => {
      // Given: a project with custom state machine
      tempProject = createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML);
      
      // When: I try to use default phases with custom state machine
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: it should reject default phases
      expect(() => {
        transitionEngine.handleExplicitTransition('phase1', 'requirements');
      }).toThrow(/Invalid target phase/);
      
      expect(() => {
        transitionEngine.handleExplicitTransition('idle', 'phase2');
      }).toThrow(/Invalid target phase/);
    });
  });

  describe('Scenario: Integration with state machine loader', () => {
    it('should integrate properly with state machine validation', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I use transition engine which depends on state machine loader
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const { StateMachineLoader } = await import('../../src/state-machine-loader.js');
      
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      const stateMachineLoader = new StateMachineLoader();
      
      // Then: they should work together for validation
      const stateMachine = stateMachineLoader.loadStateMachine(tempProject.projectPath);
      expect(Object.keys(stateMachine.states)).toContain('idle');
      expect(Object.keys(stateMachine.states)).toContain('requirements');
      
      // And: transition engine should respect state machine constraints
      const result = transitionEngine.handleExplicitTransition('idle', 'requirements');
      expect(result.newPhase).toBe('requirements');
    });

    it('should handle multiple rapid transitions correctly', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I perform multiple rapid transitions
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: each transition should be processed correctly
      const transition1 = transitionEngine.handleExplicitTransition('idle', 'design');
      expect(transition1.newPhase).toBe('design');
      
      const transition2 = transitionEngine.handleExplicitTransition('design', 'implementation');
      expect(transition2.newPhase).toBe('implementation');
      
      const transition3 = transitionEngine.handleExplicitTransition('implementation', 'complete');
      expect(transition3.newPhase).toBe('complete');
      
      // And: each should have proper instructions and reasons
      expect(transition1.instructions).toBeDefined();
      expect(transition2.instructions).toBeDefined();
      expect(transition3.instructions).toBeDefined();
    });
  });
});
