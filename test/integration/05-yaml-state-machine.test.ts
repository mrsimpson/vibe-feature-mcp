/**
 * Integration tests for YAML-based state machine loading
 * 
 * Tests the loading of custom state machines from project directories
 * and fallback to default state machine when no custom one exists.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransitionEngine } from '../../src/transition-engine.js';
import { mockFileSystem, mockSqlite, mockLogger } from '../utils/test-setup';

// Define a simple custom state machine for testing
const customStateMachineYaml = `
name: "Custom Test State Machine"
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

// Define default state machine for testing
const defaultStateMachineYaml = `
name: "Default State Machine"
description: "Default state machine for testing"
initial_state: "idle"
states:
  idle:
    description: "Idle state"
    transitions:
      - trigger: "new_feature_request"
        target: "requirements"
        is_modeled: true
        side_effects:
          instructions: "Start requirements analysis"
          transition_reason: "New feature request detected"
  requirements:
    description: "Requirements state"
    transitions: []
direct_transitions:
  - state: "idle"
    instructions: "Direct to idle"
    transition_reason: "Direct transition to idle"
  - state: "requirements"
    instructions: "Direct to requirements"
    transition_reason: "Direct transition to requirements"
`;

describe('YAML State Machine Integration Tests', () => {
  let fsMock;
  
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
      const customStateMachinePath = `${projectPath}/.vibe/state-machine.yaml`;
      
      // Mock file system with custom state machine
      fsMock = mockFileSystem({
        fileContents: {
          [customStateMachinePath]: customStateMachineYaml,
          // Also mock the default state machine path to avoid fallback errors
          'resources/state-machine.yaml': defaultStateMachineYaml
        }
      });
      
      // When: the transition engine is initialized
      const transitionEngine = new TransitionEngine(projectPath);
      
      // Then: it should check for the custom state machine
      expect(fsMock.existsSync).toHaveBeenCalledWith(customStateMachinePath);
      
      // And: it should load the custom state machine
      expect(fsMock.readFileSync).toHaveBeenCalledWith(customStateMachinePath, 'utf8');
      
      // And: the state machine should be loaded and used
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'phase1',
        userInput: 'move to phase 2',
        context: 'Testing phase transition',
        conversationSummary: 'Testing custom state machine transition'
      });
      
      // Then: transitions should follow the custom state machine rules
      expect(result.newPhase).toBe('phase2');
      expect(result.instructions).toBe('Moving to phase 2');
      expect(result.transitionReason).toBe('Transition to phase 2 triggered');
      expect(result.isModeled).toBe(true);
    });
  });

  describe('Scenario: Falling back to default state machine', () => {
    it('should use default state machine when no custom one exists', () => {
      // Given: a project without a custom state machine
      const projectPath = 'default-project';
      const customYamlPath = `${projectPath}/.vibe/state-machine.yaml`;
      const customYmlPath = `${projectPath}/.vibe/state-machine.yml`;
      
      // Mock file system with only default state machine
      fsMock = mockFileSystem({
        fileContents: {
          // Only mock the default state machine path
          'resources/state-machine.yaml': defaultStateMachineYaml
        }
      });
      
      // When: the transition engine is initialized
      const transitionEngine = new TransitionEngine(projectPath);
      
      // Then: it should check for the custom state machine
      expect(fsMock.existsSync).toHaveBeenCalledWith(customYamlPath);
      
      // And: the default state machine should be used
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'implement a new feature',
        context: 'Testing phase transition',
        conversationSummary: 'Testing default state machine transition'
      });
      
      // Then: transitions should follow the default state machine rules
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toBe('Start requirements analysis');
      expect(result.transitionReason).toBe('New feature request detected');
      expect(result.isModeled).toBe(true);
    });
  });

  describe('Scenario: Handling custom state machine with alternate file extension', () => {
    it('should load and use custom state machine with .yml extension', () => {
      // Given: a project with a custom state machine using .yml extension
      const projectPath = 'yml-project';
      const yamlPath = `${projectPath}/.vibe/state-machine.yaml`;
      const ymlPath = `${projectPath}/.vibe/state-machine.yml`;
      
      // Mock file system with custom state machine using .yml extension
      fsMock = mockFileSystem({
        fileContents: {
          // Mock .yml file but not .yaml file
          [ymlPath]: customStateMachineYaml,
          // Also mock the default state machine path to avoid fallback errors
          'resources/state-machine.yaml': defaultStateMachineYaml
        }
      });
      
      // When: the transition engine is initialized
      const transitionEngine = new TransitionEngine(projectPath);
      
      // Then: it should check for both extensions
      expect(fsMock.existsSync).toHaveBeenCalledWith(yamlPath);
      expect(fsMock.existsSync).toHaveBeenCalledWith(ymlPath);
      
      // And: it should load the .yml file
      expect(fsMock.readFileSync).toHaveBeenCalledWith(ymlPath, 'utf8');
      
      // And: the state machine behavior should match the custom definition
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'phase1',
        userInput: 'move to phase 2',
        context: 'Testing phase transition',
        conversationSummary: 'Testing custom state machine transition with yml extension'
      });
      
      // Then: transitions should follow the custom state machine rules
      expect(result.newPhase).toBe('phase2');
      expect(result.instructions).toBe('Moving to phase 2');
      expect(result.transitionReason).toBe('Transition to phase 2 triggered');
      expect(result.isModeled).toBe(true);
    });
  });
});
