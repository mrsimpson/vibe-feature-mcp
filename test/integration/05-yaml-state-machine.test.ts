/**
 * Integration tests for YAML-based state machine loading
 * 
 * Tests the loading of custom state machines from project directories
 * and fallback to default state machine when no custom one exists.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransitionEngine } from '../../src/transition-engine.js';
import { StateMachineLoader } from '../../src/state-machine-loader.js';
import { mockFileSystem, mockLogger, mockSqlite } from '../utils/test-setup';

// Define a simple custom state machine for testing
const customStateMachineYaml = `
name: "Overridden State Machine"
description: "Simple two-phase state machine for testing"
initial_state: "phase1"
states:
  phase1:
    description: "First test phase"
    transitions:
      - trigger: "move_to_phase2"
        target: "phase2"
        is_modeled: true
        side_effects:
          instructions: "Moving to phase 2"
          transition_reason: "Transition to phase 2 triggered"
  phase2:
    description: "Second test phase"
    transitions: []
direct_transitions:
  - state: "phase1"
    instructions: "Direct to phase 1"
    transition_reason: "Direct transition to phase 1"
  - state: "phase2"
    instructions: "Direct to phase 2"
    transition_reason: "Direct transition to phase 2"
`;

// Define default state machine for testing - using the actual default state machine structure
const defaultStateMachineYaml = `
name: "Development Workflow"
description: "State machine for guiding feature development workflow"
initial_state: "idle"
states:
  idle:
    description: "Waiting for feature requests"
    transitions:
      - trigger: "new_feature_request"
        target: "requirements"
        is_modeled: true
        side_effects:
          instructions: "Start requirements analysis by asking the user clarifying questions about WHAT they need. Focus on understanding their goals, scope, and constraints. Break down their needs into specific, actionable tasks and document them in the plan file. Mark completed requirements tasks as you progress."
          transition_reason: "New feature request detected, starting requirements analysis"
  requirements:
    description: "Gathering requirements"
    transitions: []
direct_transitions:
  - state: "idle"
    instructions: "Returned to idle state"
    transition_reason: "Direct transition to idle state"
  - state: "requirements"
    instructions: "Starting requirements analysis"
    transition_reason: "Direct transition to requirements phase"
`;

describe('YAML State Machine Integration Tests', () => {
  // Setup mocks before each test
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock logger and sqlite
    mockLogger();
    mockSqlite();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Scenario: Using custom state machine from project directory', () => {
    it('should load and use custom state machine from project directory', () => {
      // Given: a project with a custom state machine
      const projectPath = 'custom-project';
      
      // Setup mock filesystem with custom state machine
      const mockFs = mockFileSystem({
        fileContents: {
          [`${projectPath}/.vibe/state-machine.yaml`]: customStateMachineYaml
        }
      });
      
      // When: the transition engine is initialized with the custom state machine
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(projectPath);
      
      // Then: the custom state machine should be loaded
      expect(stateMachine.name).toBe('Custom Test State Machine');
      expect(stateMachine.initial_state).toBe('phase1');
      expect(Object.keys(stateMachine.states)).toContain('phase1');
      expect(Object.keys(stateMachine.states)).toContain('phase2');
      
      // And: we can use the custom state machine for transitions
      const transitionEngine = new TransitionEngine(projectPath);
      const result = transitionEngine.handleExplicitTransition('phase1', 'phase2');
      
      // Then: transitions should follow the custom state machine rules
      expect(result.newPhase).toBe('phase2');
      expect(result.instructions).toBe('Direct to phase 2');
      expect(result.transitionReason).toBe('Direct transition to phase 2');
    });
  });

  describe('Scenario: Falling back to default state machine', () => {
    it('should use default state machine when no custom one exists', () => {
      // Given: a project without a custom state machine
      const projectPath = 'default-project';
      
      // Setup mock filesystem with default state machine
      const mockFs = mockFileSystem({
        fileContents: {
          'resources/state-machine.yaml': defaultStateMachineYaml
        }
      });
      
      // When: the transition engine is initialized
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(projectPath);
      
      // Then: the default state machine should be loaded
      expect(stateMachine.name).toBe('Development Workflow');
      expect(stateMachine.initial_state).toBe('idle');
      expect(Object.keys(stateMachine.states)).toContain('idle');
      expect(Object.keys(stateMachine.states)).toContain('requirements');
      
      // And: the default state machine should be used for transitions
      const transitionEngine = new TransitionEngine(projectPath);
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'implement a new feature',
        context: 'Testing phase transition',
        conversationSummary: 'Testing default state machine transition'
      });
      
      // Then: transitions should follow the default state machine rules
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toContain('Start requirements analysis');
      expect(result.transitionReason).toContain('New feature request detected');
      expect(result.isModeled).toBe(true);
    });
  });

  describe('Scenario: Handling custom state machine with alternate file extension', () => {
    it('should load and use custom state machine with .yml extension', () => {
      // Given: a project with a custom state machine using .yml extension
      const projectPath = 'yml-project';
      
      // Setup mock filesystem with custom state machine using .yml extension
      const mockFs = mockFileSystem({
        fileContents: {
          [`${projectPath}/.vibe/state-machine.yml`]: customStateMachineYaml
        }
      });
      
      // When: the transition engine is initialized with the custom state machine
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(projectPath);
      
      // Then: the custom state machine should be loaded
      expect(stateMachine.name).toBe('Custom Test State Machine');
      expect(stateMachine.initial_state).toBe('phase1');
      expect(Object.keys(stateMachine.states)).toContain('phase1');
      expect(Object.keys(stateMachine.states)).toContain('phase2');
      
      // And: we can use the custom state machine for transitions
      const transitionEngine = new TransitionEngine(projectPath);
      const result = transitionEngine.handleExplicitTransition('phase1', 'phase2');
      
      // Then: transitions should follow the custom state machine rules
      expect(result.newPhase).toBe('phase2');
      expect(result.instructions).toBe('Direct to phase 2');
      expect(result.transitionReason).toBe('Direct transition to phase 2');
    });
  });
});
