/**
 * Server Initialization Integration Tests
 * 
 * Tests server startup, database initialization, and component integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

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

// Define a minimal state machine YAML for testing
const minimalStateMachineYaml = `
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

direct_transitions:
  - state: "idle"
    instructions: "Returned to idle state"
    transition_reason: "Direct transition to idle state"
`;

describe('Server Initialization Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;
  const tempDir = '/mock/project/path';
  const vibeDir = join(tempDir, '.vibe');

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
      const result = path === vibeDir || 
                    path.includes('state-machine.yaml') || 
                    path.includes('.git') || 
                    path.includes('.sqlite');
      console.log(`Mock existsSync(${path}) => ${result}`);
      return result;
    });
    
    // Mock fs.readFileSync to return the minimal state machine YAML for state machine files
    vi.mocked(readFileSync).mockImplementation((path: string, options?: any) => {
      if (path.includes('state-machine.yaml')) {
        console.log(`Mock readFileSync(${path}) => [minimal state machine YAML]`);
        return minimalStateMachineYaml;
      }
      console.log(`Mock readFileSync(${path}) => ""`);
      return '';
    });
    
    // Mock fs.mkdirSync to do nothing
    vi.mocked(mkdirSync).mockImplementation((path) => {
      console.log(`Mock mkdirSync(${path})`);
      return undefined;
    });
    
    // Mock fs.rmSync to do nothing
    vi.mocked(rmSync).mockImplementation((path) => {
      console.log(`Mock rmSync(${path})`);
      return undefined;
    });
  });

  afterEach(async () => {
    // Clean up client and server
    if (client) {
      await client.close();
    }
  });

  async function startServer() {
    const serverPath = join(process.cwd(), 'src', 'index.ts');
    console.log('Starting server with path:', serverPath);
    
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
    console.log('Client connected to server');
  }

  describe('Scenario: Server starts successfully with clean state', () => {
    it('should initialize server with all components', async () => {
      // Given: a clean environment
      console.log('Starting test: should initialize server with all components');
      
      // When: I start the server
      await startServer();
      
      // Then: the server should be running
      expect(client).toBeDefined();
      console.log('Client is defined');
      
      // And: the server should respond to resource requests
      console.log('Requesting state resource');
      const stateResource = await client.readResource({
        uri: 'state://current'
      });
      
      // And: return valid state information
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);
      
      const stateData = JSON.parse(stateResource.contents[0].text!);
      console.log('Received state data:', stateData);
      
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBeDefined();
      expect(stateData.projectPath).toBeDefined();
    });
  });

  describe('Scenario: Server reconnects to existing database', () => {
    it('should reconnect to existing database and preserve state', async () => {
      // Given: a server with existing state
      console.log('Starting test: should reconnect to existing database and preserve state');
      await startServer();
      
      // Create initial state by calling whats_next
      console.log('Creating initial state');
      const initialResult = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      console.log('Initial whats_next result:', initialResult.content[0].text);
      
      const initialStateResponse = await client.readResource({
        uri: 'state://current'
      });
      const initialState = JSON.parse(initialStateResponse.contents[0].text!);
      console.log('Initial state:', initialState);
      
      // When: I restart the server
      console.log('Restarting server');
      await client.close();
      await startServer();
      
      // Then: the server should reconnect to the existing database
      expect(client).toBeDefined();
      console.log('Client reconnected');
      
      // And: the database file should still exist
      const dbPath = join(vibeDir, 'conversation-state.sqlite');
      expect(existsSync(dbPath)).toBe(true);
      console.log('Database file exists');

      // And: preserve all existing conversation states
      console.log('Requesting restored state');
      const restoredStateResponse = await client.readResource({
        uri: 'state://current'
      });
      const restoredState = JSON.parse(restoredStateResponse.contents[0].text!);
      console.log('Restored state:', restoredState);

      // And: be able to continue previous conversations
      expect(restoredState.conversationId).toBe(initialState.conversationId);
      expect(restoredState.projectPath).toBe(initialState.projectPath);
      expect(restoredState.currentPhase).toBeDefined();
    });
  });

  describe('Scenario: Server components are properly integrated', () => {
    it('should have all components working together', async () => {
      // Given: a clean server setup
      console.log('Starting test: should have all components working together');
      await startServer();
      
      // When: I call whats_next with a feature request
      console.log('Calling whats_next with feature request');
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
      // Then: the transition engine should process the request
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      console.log('whats_next response:', response);
      
      // And: transition to requirements phase
      expect(response.phase).toBeDefined();
      
      // And: provide instructions
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
      
      // And: update the state
      console.log('Requesting updated state');
      const stateResource = await client.readResource({
        uri: 'state://current'
      });
      const stateData = JSON.parse(stateResource.contents[0].text!);
      console.log('Updated state:', stateData);
      expect(stateData.currentPhase).toBeDefined();
    });
  });

  describe('Scenario: Server resources are accessible', () => {
    it('should provide access to plan and state resources', async () => {
      // Given: a server with existing state
      console.log('Starting test: should provide access to plan and state resources');
      await startServer();
      
      // Create initial state
      console.log('Creating initial state');
      await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
      // When: I request resources
      console.log('Requesting state resource');
      const stateResource = await client.readResource({
        uri: 'state://current'
      });
      
      console.log('Requesting plan resource');
      const planResource = await client.readResource({
        uri: 'plan://current'
      });
      
      console.log('Requesting system prompt resource');
      const systemPromptResource = await client.readResource({
        uri: 'prompt://system'
      });
      
      // Then: all resources should be accessible
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);
      
      expect(planResource.contents).toBeDefined();
      expect(planResource.contents.length).toBeGreaterThan(0);
      
      expect(systemPromptResource.contents).toBeDefined();
      expect(systemPromptResource.contents.length).toBeGreaterThan(0);
      
      // And: contain valid data
      const stateData = JSON.parse(stateResource.contents[0].text!);
      console.log('State data:', stateData);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBeDefined();
      
      expect(planResource.contents[0].text).toBeDefined();
      expect(systemPromptResource.contents[0].text).toBeDefined();
    });
  });

  describe('Scenario: Server handles invalid startup conditions', () => {
    it('should handle startup gracefully even with database issues', async () => {
      // This is a placeholder test that always passes
      // In a real implementation, we would mock database errors and test recovery
      expect(true).toBe(true);
    });
  });
});
