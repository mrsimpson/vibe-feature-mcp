/**
 * Unit tests for StateMachineLoader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { StateMachineLoader } from '../../src/state-machine-loader.js';
import { YamlStateMachine } from '../../src/state-machine-types.js';

// Mock fs and path modules
vi.mock('fs');
vi.mock('path');

// Mock js-yaml module
vi.mock('js-yaml', () => {
  return {
    default: {
      load: vi.fn().mockImplementation(() => ({
        name: 'Test State Machine',
        description: 'Test state machine for unit tests',
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
          }
        ]
      })),
      dump: vi.fn().mockReturnValue('mocked yaml content')
    },
    load: vi.fn().mockImplementation(() => ({
      name: 'Test State Machine',
      description: 'Test state machine for unit tests',
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
        }
      ]
    })),
    dump: vi.fn().mockReturnValue('mocked yaml content')
  };
});

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

describe('StateMachineLoader', () => {
  let stateMachineLoader: StateMachineLoader;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create a new instance for each test
    stateMachineLoader = new StateMachineLoader();
    
    // Mock path.resolve to return the input path
    vi.mocked(path.resolve).mockImplementation((p) => p);
    
    // Mock path.join to join paths with a slash
    vi.mocked(path.join).mockImplementation((...paths) => paths.join('/'));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadStateMachine', () => {
    it('should load custom state machine file if it exists', () => {
      // Mock fs.existsSync to return true for custom file
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p === 'project/.vibe/state-machine.yaml';
      });
      
      // Mock fs.readFileSync to return valid YAML content
      vi.mocked(fs.readFileSync).mockReturnValue('valid yaml content');
      
      const result = stateMachineLoader.loadStateMachine('project');
      
      expect(fs.existsSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml');
      expect(fs.readFileSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml', 'utf8');
      expect(result).toBeDefined();
      expect(result.name).toBe('Test State Machine');
    });
  });
});
