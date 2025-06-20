/**
 * proceed_to_phase Tool Integration Tests
 * 
 * Tests explicit phase transition tool via MCP protocol
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';

// Mock fs module
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn().mockImplementation((path) => {
      if (path.includes('.vibe')) return true;
      if (path.includes('state-machine.yaml')) return true;
      if (path.includes('.git')) return true;
      if (path.includes('.sqlite')) return true;
      return false;
    }),
    readFileSync: vi.fn().mockImplementation((path, options) => {
      if (path.includes('state-machine.yaml')) {
        return `
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
          instructions: "Start requirements analysis"
          transition_reason: "New feature request detected"
  requirements:
    description: "Gathering requirements"
    transitions:
      - trigger: "requirements_complete"
        target: "design"
        is_modeled: true
        side_effects:
          instructions: "Start design phase"
          transition_reason: "Requirements gathering complete"
  design:
    description: "Designing solution"
    transitions:
      - trigger: "design_complete"
        target: "implementation"
        is_modeled: true
        side_effects:
          instructions: "Start implementation phase"
          transition_reason: "Design phase complete"
  implementation:
    description: "Implementing solution"
    transitions:
      - trigger: "implementation_complete"
        target: "qa"
        is_modeled: true
        side_effects:
          instructions: "Start QA phase"
          transition_reason: "Implementation phase complete"
  qa:
    description: "Quality assurance"
    transitions:
      - trigger: "qa_complete"
        target: "testing"
        is_modeled: true
        side_effects:
          instructions: "Start testing phase"
          transition_reason: "QA phase complete"
  testing:
    description: "Testing solution"
    transitions:
      - trigger: "testing_complete"
        target: "complete"
        is_modeled: true
        side_effects:
          instructions: "Feature development complete"
          transition_reason: "Testing phase complete"
  complete:
    description: "Feature complete"
    transitions: []

direct_transitions:
  - state: "idle"
    instructions: "Returned to idle state"
    transition_reason: "Direct transition to idle state"
  - state: "requirements"
    instructions: "Starting requirements analysis"
    transition_reason: "Direct transition to requirements phase"
  - state: "design"
    instructions: "Starting design phase"
    transition_reason: "Direct transition to design phase"
  - state: "implementation"
    instructions: "Starting implementation phase"
    transition_reason: "Direct transition to implementation phase"
  - state: "qa"
    instructions: "Starting QA phase"
    transition_reason: "Direct transition to QA phase"
  - state: "testing"
    instructions: "Starting testing phase"
    transition_reason: "Direct transition to testing phase"
  - state: "complete"
    instructions: "Feature development complete"
    transition_reason: "Direct transition to complete phase"
`;
      }
      return '';
    }),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn()
  };
});

// Mock sqlite3 module
vi.mock('sqlite3', () => {
  return {
    Database: vi.fn().mockImplementation(() => {
      return {
        run: vi.fn().mockImplementation((sql, params, callback) => {
          if (callback) callback(null);
        }),
        get: vi.fn().mockImplementation((sql, params, callback) => {
          if (callback) callback(null, null);
        }),
        all: vi.fn().mockImplementation((sql, params, callback) => {
          if (callback) callback(null, []);
        }),
        close: vi.fn().mockImplementation((callback) => {
          if (callback) callback(null);
        })
      };
    })
  };
});

describe('proceed_to_phase Tool Integration Tests', () => {
  const serverPath = join(process.cwd(), 'src', 'index.ts');
  const tempDir = '/mock/project/path';
  let client;
  let transport;

  afterEach(async () => {
    // Clean up client and server
    if (client) {
      await client.close();
    }
  });

  async function startServer() {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', serverPath],
      env: {
        ...process.env,
        VIBE_FEATURE_LOG_LEVEL: 'DEBUG',
        VIBE_FEATURE_PROJECT_PATH: tempDir,
        NODE_ENV: 'test'
      }
    });
    
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    await client.connect(transport);
    return client;
  }

  describe('Scenario: Valid phase transition from requirements to design', () => {
    it('should transition from requirements to design', async () => {
      // Given: an existing conversation in "requirements" phase
      const client = await startServer();
      
      // First, explicitly set the phase to requirements for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'requirements',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with target_phase "design"
      const result = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'requirements gathering complete'
        }
      });

      // Then: the conversation phase should be updated to "design"
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('design');
      
      // And: design-specific instructions should be returned
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/design|architecture|technical/);
      
      // And: the transition reason should be recorded
      expect(response.transition_reason).toBe('requirements gathering complete');
    });
  });

  describe('Scenario: Direct phase transition skipping intermediate phases', () => {
    it('should allow direct transition to implementation', async () => {
      // Given: an existing conversation
      const client = await startServer();
      
      // First, explicitly set the phase to requirements for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'requirements',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with target_phase "implementation" (skipping design)
      const result = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'implementation',
          reason: 'requirements and design already done offline'
        }
      });

      // Then: the phase should transition directly to "implementation"
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('implementation');
      
      // And: implementation-specific instructions should be provided
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/implement|code|build/);
      
      // And: the transition reason should be recorded
      expect(response.transition_reason).toBe('requirements and design already done offline');
    });
  });

  describe('Scenario: Transition to completion phase', () => {
    it('should transition to complete phase', async () => {
      // Given: an existing conversation in "testing" phase
      const client = await startServer();
      
      // First, explicitly set the phase to testing for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'testing',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with target_phase "complete"
      const result = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'complete',
          reason: 'all testing completed successfully'
        }
      });

      // Then: the conversation should be marked as complete
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('complete');
      
      // And: completion instructions should be provided
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/complete|finish|done/);
    });
  });

  describe('Scenario: Invalid phase transition parameters', () => {
    it('should reject invalid phase names', async () => {
      // Given: the MCP server is running
      const client = await startServer();

      // When: I call proceed_to_phase with an invalid target_phase
      try {
        await client.callTool({
          name: 'proceed_to_phase',
          arguments: {
            target_phase: 'invalid_phase'
          }
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Then: the tool should return an error response
        expect(error).toBeDefined();
        // The error should indicate invalid phase
        expect(error.message || error.toString()).toMatch(/invalid|error/i);
      }
    });

    it('should handle missing target_phase parameter', async () => {
      // Given: the MCP server is running
      const client = await startServer();

      // When: I call proceed_to_phase without target_phase
      try {
        await client.callTool({
          name: 'proceed_to_phase',
          arguments: {
            reason: 'test reason'
          }
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Then: the tool should return an error response
        expect(error).toBeDefined();
        // The error should indicate missing required parameter
        expect(error.message || error.toString()).toMatch(/required|missing|target_phase/i);
      }
    });
  });

  describe('Scenario: Transition with detailed reason', () => {
    it('should record transition with provided reason', async () => {
      // Given: an existing conversation in "design" phase
      const client = await startServer();
      
      // First, explicitly set the phase to design for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with detailed reason
      const detailedReason = 'design approved by user, ready to code';
      const result = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'implementation',
          reason: detailedReason
        }
      });

      // Then: the transition should be recorded with the provided reason
      const response = JSON.parse(result.content[0].text!);
      expect(response.transition_reason).toBe(detailedReason);
      
      // And: the reason should be included in the response
      expect(response.transition_reason).toContain('approved');
      expect(response.transition_reason).toContain('ready to code');
    });
  });

  describe('Scenario: Transition without existing conversation', () => {
    it('should create new conversation with target phase', async () => {
      // Given: no existing conversation state for the current project
      const client = await startServer();

      // When: I call proceed_to_phase with target_phase "design"
      const result = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'starting directly with design'
        }
      });

      // Then: a new conversation should be created
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('design');
      
      // And: the phase should be set to the requested target phase
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/design|architecture/);
    });
  });

  describe('Scenario: Multiple rapid phase transitions', () => {
    it('should handle sequential transitions correctly', async () => {
      // Given: an existing conversation
      const client = await startServer();

      // When: transitions are requested in sequence
      const transition1 = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'move to design'
        }
      });

      const transition2 = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'implementation',
          reason: 'move to implementation'
        }
      });

      const transition3 = await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'qa',
          reason: 'move to qa'
        }
      });

      // Then: each transition should be processed correctly
      const response1 = JSON.parse(transition1.content[0].text!);
      expect(response1.phase).toBe('design');

      const response2 = JSON.parse(transition2.content[0].text!);
      expect(response2.phase).toBe('implementation');

      const response3 = JSON.parse(transition3.content[0].text!);
      expect(response3.phase).toBe('qa');
    });
  });
});
