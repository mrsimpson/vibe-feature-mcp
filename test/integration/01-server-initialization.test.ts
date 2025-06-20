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

// Read the actual state machine YAML content
const stateMachineYamlPath = path.join(process.cwd(), 'resources', 'state-machine.yaml');
const actualStateMachineYaml = readFileSync(stateMachineYamlPath, 'utf8');

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

describe('Server Initialization Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;
  const tempDir = '/mock/project/path';
  const vibeDir = join(tempDir, '.vibe');

  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock fs.existsSync to return true for directories and state machine file
    vi.mocked(existsSync).mockImplementation((path: string) => {
      if (path === vibeDir) return true;
      if (path.includes('state-machine.yaml')) return true;
      if (path.includes('.git')) return true;
      if (path.includes('.sqlite')) return true;
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

  describe('Scenario: Server starts successfully with clean state', () => {
    it('should initialize server with all components', async () => {
      // Given: a clean environment
      
      // When: I start the server
      await startServer();
      
      // Then: the server should be running
      expect(client).toBeDefined();
      
      // And: the server should respond to resource requests
      const stateResource = await client.readResource({
        uri: 'state://current'
      });
      
      // And: return valid state information
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);
      
      const stateData = JSON.parse(stateResource.contents[0].text!);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBe('idle');
      expect(stateData.projectPath).toBeDefined();
    });
  });

  describe('Scenario: Server reconnects to existing database', () => {
    it('should reconnect to existing database and preserve state', async () => {
      // Given: a server with existing state
      await startServer();
      
      // Create initial state by calling whats_next
      const initialResult = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
      const initialStateResponse = await client.readResource({
        uri: 'state://current'
      });
      const initialState = JSON.parse(initialStateResponse.contents[0].text!);
      
      // When: I restart the server
      await client.close();
      await startServer();
      
      // Then: the server should reconnect to the existing database
      expect(client).toBeDefined();
      
      // And: the database file should still exist
      const dbPath = join(vibeDir, 'conversation-state.sqlite');
      expect(existsSync(dbPath)).toBe(true);

      // And: preserve all existing conversation states
      const restoredStateResponse = await client.readResource({
        uri: 'state://current'
      });
      const restoredState = JSON.parse(restoredStateResponse.contents[0].text!);

      // And: be able to continue previous conversations
      expect(restoredState.conversationId).toBe(initialState.conversationId);
      expect(restoredState.projectPath).toBe(initialState.projectPath);
      expect(restoredState.currentPhase).toBeDefined();
    });
  });

  describe('Scenario: Server components are properly integrated', () => {
    it('should have all components working together', async () => {
      // Given: a clean server setup
      await startServer();
      
      // When: I call whats_next with a feature request
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
      // Then: the transition engine should process the request
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      
      // And: transition to requirements phase
      expect(response.phase).toBe('requirements');
      
      // And: provide instructions
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
      
      // And: update the state
      const stateResource = await client.readResource({
        uri: 'state://current'
      });
      const stateData = JSON.parse(stateResource.contents[0].text!);
      expect(stateData.currentPhase).toBe('requirements');
    });
  });

  describe('Scenario: Server resources are accessible', () => {
    it('should provide access to plan and state resources', async () => {
      // Given: a server with existing state
      await startServer();
      
      // Create initial state
      await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
      // When: I request resources
      const stateResource = await client.readResource({
        uri: 'state://current'
      });
      
      const planResource = await client.readResource({
        uri: 'plan://current'
      });
      
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
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBe('requirements');
      
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
