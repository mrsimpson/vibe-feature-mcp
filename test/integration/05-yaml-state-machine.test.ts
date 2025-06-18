/**
 * Integration tests for YAML-based state machine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { StateMachineLoader } from '../../src/state-machine-loader.js';
import { TransitionEngine } from '../../src/transition-engine.js';
import { YamlStateMachine } from '../../src/state-machine-types.js';

// Mock fs and path modules
vi.mock('fs');
vi.mock('path');

// Mock logger
vi.mock('../../src/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
  })
}));

describe('YAML State Machine Integration', () => {
  // Sample valid state machine for testing
  const validStateMachine: YamlStateMachine = {
    name: 'Test State Machine',
    description: 'Test state machine for integration tests',
    initial_state: 'idle',
    states: {
      idle: {
        description: 'Idle state',
        transitions: [
          {
            trigger: 'new_feature_request',
            target: 'requirements',
            is_modeled: true,
            side_effects: {
              instructions: 'Start requirements analysis',
              transition_reason: 'New feature request detected'
            }
          }
        ]
      },
      requirements: {
        description: 'Requirements state',
        transitions: [
          {
            trigger: 'refine_requirements',
            target: 'requirements',
            is_modeled: true,
            side_effects: {
              instructions: 'Continue refining requirements',
              transition_reason: 'Requirements need refinement'
            }
          },
          {
            trigger: 'requirements_complete',
            target: 'design',
            is_modeled: true,
            side_effects: {
              instructions: 'Start design phase',
              transition_reason: 'Requirements complete'
            }
          }
        ]
      },
      design: {
        description: 'Design state',
        transitions: [
          {
            trigger: 'design_complete',
            target: 'implementation',
            is_modeled: true,
            side_effects: {
              instructions: 'Start implementation phase',
              transition_reason: 'Design complete'
            }
          }
        ]
      },
      implementation: {
        description: 'Implementation state',
        transitions: []
      }
    },
    direct_transitions: [
      {
        state: 'idle',
        instructions: 'Direct to idle',
        transition_reason: 'Direct transition to idle'
      },
      {
        state: 'requirements',
        instructions: 'Direct to requirements',
        transition_reason: 'Direct transition to requirements'
      },
      {
        state: 'design',
        instructions: 'Direct to design',
        transition_reason: 'Direct transition to design'
      },
      {
        state: 'implementation',
        instructions: 'Direct to implementation',
        transition_reason: 'Direct transition to implementation'
      }
    ]
  };

  // Convert state machine to YAML
  const validYamlContent = yaml.dump(validStateMachine);
  
  let transitionEngine: TransitionEngine;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock path.resolve to return the input path
    vi.mocked(path.resolve).mockImplementation((p) => p);
    
    // Mock path.join to join paths with a slash
    vi.mocked(path.join).mockImplementation((...paths) => paths.join('/'));
    
    // Mock fs.existsSync to return true for custom file
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === 'project/.vibe/state-machine.yaml';
    });
    
    // Mock fs.readFileSync to return valid YAML content
    vi.mocked(fs.readFileSync).mockReturnValue(validYamlContent);
    
    // Create a new TransitionEngine instance
    transitionEngine = new TransitionEngine('project');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TransitionEngine with YAML state machine', () => {
    it('should analyze phase transition from idle to requirements', () => {
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'I want to implement a new feature',
        context: 'User wants to implement a feature',
        conversationSummary: 'User is requesting a new feature implementation'
      });
      
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toBe('Start requirements analysis');
      expect(result.transitionReason).toBe('New feature request detected');
      expect(result.isModeled).toBe(true);
    });
    
    it('should continue in the same phase when no transition is detected', () => {
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'requirements',
        userInput: 'I need to refine the requirements',
        context: 'User wants to refine requirements',
        conversationSummary: 'User is refining requirements'
      });
      
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toBe('Continue refining requirements');
      expect(result.isModeled).toBe(true);
    });
    
    it('should transition from requirements to design when requirements are complete', () => {
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'requirements',
        userInput: 'The requirements are complete, let\'s move to design',
        context: 'User indicates requirements are complete',
        conversationSummary: 'User has completed requirements and wants to start design'
      });
      
      expect(result.newPhase).toBe('design');
      expect(result.instructions).toBe('Start design phase');
      expect(result.transitionReason).toBe('Requirements complete');
      expect(result.isModeled).toBe(true);
    });
  });

  describe('TransitionEngine explicit transitions', () => {
    it('should handle explicit transition to any phase', () => {
      const result = transitionEngine.handleExplicitTransition(
        'idle',
        'implementation',
        'User wants to skip to implementation'
      );
      
      expect(result.newPhase).toBe('implementation');
      expect(result.instructions).toBe('Direct to implementation');
      expect(result.transitionReason).toBe('User wants to skip to implementation');
      expect(result.isModeled).toBe(false);
    });
    
    it('should use default transition reason if none provided', () => {
      const result = transitionEngine.handleExplicitTransition(
        'idle',
        'design'
      );
      
      expect(result.newPhase).toBe('design');
      expect(result.instructions).toBe('Direct to design');
      expect(result.transitionReason).toBe('Direct transition to design');
      expect(result.isModeled).toBe(false);
    });
  });

  describe('TransitionEngine with custom state machine file', () => {
    it('should load custom state machine file', () => {
      // Verify that the custom file was checked
      expect(fs.existsSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml');
      
      // Verify that the file was read
      expect(fs.readFileSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml', 'utf8');
      
      // Test a transition to verify the state machine was loaded correctly
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'I want to implement a new feature'
      });
      
      expect(result.newPhase).toBe('requirements');
    });
    
    it('should fall back to default state machine if custom file does not exist', () => {
      // Reset mocks
      vi.resetAllMocks();
      
      // Mock fs.existsSync to return false for all files
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      // Mock path.join for default file path
      vi.mocked(path.join).mockImplementation((...paths) => {
        if (paths[0] === '__dirname') {
          return 'src/../resources/state-machine.yaml';
        }
        return paths.join('/');
      });
      
      // Mock fs.readFileSync to return valid YAML content
      vi.mocked(fs.readFileSync).mockReturnValue(validYamlContent);
      
      // Create a new TransitionEngine instance
      const newTransitionEngine = new TransitionEngine('project');
      
      // Test a transition to verify the state machine was loaded correctly
      const result = newTransitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'I want to implement a new feature'
      });
      
      expect(result.newPhase).toBe('requirements');
    });
  });
});
