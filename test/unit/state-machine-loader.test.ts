/**
 * Unit tests for StateMachineLoader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateMachineLoader } from '../../src/state-machine-loader.js';

// Mock global URL constructor
global.URL = vi.fn().mockImplementation(() => ({
  pathname: '/mock/src/state-machine-loader.ts'
})) as any;

// Mock import.meta.url
vi.stubGlobal('import.meta', { url: 'file:///mock/src/state-machine-loader.ts' });

// Create a mock state machine object
const mockStateMachine = {
  name: 'Test State Machine',
  description: 'Test state machine for unit tests',
  initial_state: 'idle',
  states: {
    idle: {
      description: 'Idle state',
      transitions: [
        {
          trigger: 'new_feature_request',
          to: 'requirements',
          instructions: 'Start requirements analysis',
          transition_reason: 'New feature request detected'
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
};

// Mock modules
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn()
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  };
});

vi.mock('path', () => {
  return {
    default: {
      resolve: vi.fn(p => p),
      join: vi.fn((...paths) => paths.join('/')),
      dirname: vi.fn(p => {
        if (!p) return '';
        const lastSlash = p.lastIndexOf('/');
        return lastSlash >= 0 ? p.substring(0, lastSlash) : p;
      })
    },
    resolve: vi.fn(p => p),
    join: vi.fn((...paths) => paths.join('/')),
    dirname: vi.fn(p => {
      if (!p) return '';
      const lastSlash = p.lastIndexOf('/');
      return lastSlash >= 0 ? p.substring(0, lastSlash) : p;
    })
  };
});

// Properly mock js-yaml with a default export
vi.mock('js-yaml', () => {
  return {
    default: {
      load: vi.fn(() => mockStateMachine),
      dump: vi.fn(() => 'mocked yaml content')
    },
    load: vi.fn(() => mockStateMachine),
    dump: vi.fn(() => 'mocked yaml content')
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

// Import mocked modules
import fs from 'fs';

describe('StateMachineLoader', () => {
  let stateMachineLoader: StateMachineLoader;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create a new instance for each test
    stateMachineLoader = new StateMachineLoader();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadStateMachine', () => {
    it('should load custom state machine file if it exists', () => {
      // Mock fs.existsSync to return true for custom file
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return String(p) === 'project/.vibe/state-machine.yaml';
      });
      
      // Mock fs.readFileSync to return valid YAML content
      vi.mocked(fs.readFileSync).mockReturnValue('valid yaml content' as any);
      
      const result = stateMachineLoader.loadStateMachine('project');
      
      expect(fs.existsSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml');
      expect(fs.readFileSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml', 'utf8');
      expect(result).toBeDefined();
      expect(result.name).toBe('Test State Machine');
    });

    it('should load default state machine file if custom file does not exist', () => {
      // Mock fs.existsSync to return false for all paths
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      // Mock fs.readFileSync to return valid YAML content
      vi.mocked(fs.readFileSync).mockReturnValue('valid yaml content' as any);
      
      const result = stateMachineLoader.loadStateMachine('project');
      
      expect(fs.existsSync).toHaveBeenCalledWith('project/.vibe/state-machine.yaml');
      expect(fs.existsSync).toHaveBeenCalledWith('project/.vibe/state-machine.yml');
      
      // The path might be absolute or relative depending on the environment
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(vi.mocked(fs.readFileSync).mock.calls[0][0]).toMatch(/.*resources\/state-machine\.yaml$/);
      expect(vi.mocked(fs.readFileSync).mock.calls[0][1]).toBe('utf8');
      expect(result).toBeDefined();
      expect(result.name).toBe('Test State Machine');
    });
  });

  describe('loadFromFile', () => {
    it('should load and validate state machine from file', () => {
      // Mock fs.readFileSync to return valid YAML content
      vi.mocked(fs.readFileSync).mockReturnValue('valid yaml content' as any);
      
      const result = stateMachineLoader.loadFromFile('test-file.yaml');
      
      expect(fs.readFileSync).toHaveBeenCalledWith('test-file.yaml', 'utf8');
      expect(result).toBeDefined();
      expect(result.name).toBe('Test State Machine');
    });

    it('should throw error if file cannot be loaded', () => {
      // Mock fs.readFileSync to throw error
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });
      
      expect(() => stateMachineLoader.loadFromFile('invalid-file.yaml')).toThrow('Failed to load state machine: File not found');
    });
  });

  describe('getTransitionInstructions', () => {
    beforeEach(() => {
      // Load state machine
      vi.mocked(fs.readFileSync).mockReturnValue('valid yaml content' as any);
      stateMachineLoader.loadFromFile('test-file.yaml');
    });

    it('should return transition instructions for modeled transition', () => {
      const result = stateMachineLoader.getTransitionInstructions('idle', 'requirements', 'new_feature_request');
      
      expect(result).toEqual({
        instructions: 'Start requirements analysis',
        transitionReason: 'New feature request detected',
        isModeled: true
      });
    });

    it('should return direct transition instructions when no modeled transition exists', () => {
      const result = stateMachineLoader.getTransitionInstructions('requirements', 'idle');
      
      expect(result).toEqual({
        instructions: 'Direct to idle',
        transitionReason: 'Direct transition to idle',
        isModeled: false
      });
    });

    it('should throw error if no transition found', () => {
      expect(() => stateMachineLoader.getTransitionInstructions('requirements', 'unknown')).toThrow('No transition found from "requirements" to "unknown"');
    });
  });
});
