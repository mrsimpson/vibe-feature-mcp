/**
 * proceed_to_phase Tool Integration Tests
 * 
 * Tests explicit phase transition tool via MCP protocol
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

// Read the actual state machine YAML content
const stateMachineYamlPath = path.join(process.cwd(), 'resources', 'state-machine.yaml');
let actualStateMachineYaml = '';

try {
  // Try to read the actual state machine YAML content
  actualStateMachineYaml = readFileSync(stateMachineYamlPath, 'utf8');
} catch (error) {
  console.error('Failed to load state machine YAML:', error);
}

// Mock modules
vi.mock('fs', () => {
  const actualFs = vi.importActual('fs');
  return {
    default: {
      ...actualFs,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      rmSync: vi.fn()
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn()
  };
});

describe('proceed_to_phase Tool Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;
  const tempDir = '/mock/project/path';
  const vibeTestDir = join(tempDir, '.vibe');

  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Delete any existing database file
    try {
      const actualFs = await import('fs');
      const dbPath = join(process.cwd(), '.vibe', 'conversation-state.sqlite');
      if (actualFs.existsSync(dbPath)) {
        actualFs.rmSync(dbPath);
        console.log(`Deleted existing database file: ${dbPath}`);
      }
    } catch (error) {
      console.error('Error deleting database file:', error);
    }
    
    // Mock fs.existsSync to return true for directories and state machine file
    vi.mocked(existsSync).mockImplementation((path: string) => {
      if (path === vibeTestDir) return true;
      if (path.includes('state-machine.yaml')) return true;
      return false;
    });
    
    // Mock fs.readFileSync to return the actual state machine YAML for state machine files
    vi.mocked(readFileSync).mockImplementation((path: string, options?: any) => {
      if (path.includes('state-machine.yaml')) {
        return actualStateMachineYaml;
      }
      return '';
    });
    
    // Mock fs.mkdirSync to do nothing
    vi.mocked(mkdirSync).mockImplementation(() => undefined);
    
    // Mock fs.rmSync to do nothing
    vi.mocked(rmSync).mockImplementation(() => undefined);
  });

  afterEach(async () => {
    // Clean up client and server
    if (client) {
      await client.close();
    }
  });

  async function startServer() {
    const serverPath = join(process.cwd(), 'src', 'index.ts');
    
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', serverPath],
      env: {
        ...process.env,
        VIBE_FEATURE_LOG_LEVEL: 'DEBUG',
        VIBE_FEATURE_PROJECT_PATH: tempDir, // Use the mocked directory as the project path
        NODE_ENV: 'test' // Ensure we're in test mode
      }
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
  }

  describe('Scenario: Valid phase transition from requirements to design', () => {
    it('should transition from requirements to design', async () => {
      // Given: an existing conversation in "requirements" phase
      await startServer();
      
      // Create initial conversation in requirements phase (by providing feature request)
      const initialResult = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
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
      await startServer();
      
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
      await startServer();
      
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
      await startServer();

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
      await startServer();

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
      await startServer();
      
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
      await startServer();

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
      await startServer();

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
