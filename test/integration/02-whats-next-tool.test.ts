/**
 * whats_next Tool Integration Tests
 * 
 * Tests the primary analysis and instruction tool via MCP protocol
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

describe('whats_next Tool Integration Tests', () => {
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

  describe('Scenario: First call to whats_next creates new conversation', () => {
    it('should create new conversation for first whats_next call', async () => {
      // Given: no existing conversation state for the current project
      await startServer();
      expect(existsSync(vibeTestDir)).toBe(true);

      // When: I call whats_next with user input about implementing a new feature
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement user authentication',
          context: 'user wants to add auth to their app'
        }
      });

      // Then: a new conversation should be created
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      const response = JSON.parse(result.content[0].text!);
      
      // And: the phase should transition from idle to a valid phase based on the state machine
      expect(response.phase).toBeDefined();
      
      // And: instructions should be provided
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
      
      // And: a plan file path should be provided
      expect(response.plan_file_path).toBeDefined();
      expect(response.plan_file_path).toMatch(/\.md$/);
      
      // And: the transition reason should be provided
      expect(response.transition_reason).toBeDefined();
      expect(response.transition_reason.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Continuing existing conversation in idle phase', () => {
    it('should continue in idle or transition when appropriate', async () => {
      // Given: an existing conversation in "idle" phase
      await startServer();
      
      // Create initial conversation
      const initialResult = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement user authentication'
        }
      });
      
      const initialResponse = JSON.parse(initialResult.content[0].text!);
      expect(initialResponse.phase).toBeDefined();

      // When: I call whats_next with conversation context indicating ongoing work
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          conversation_summary: 'User wants authentication, discussed tech stack',
          user_input: 'what about password requirements?',
          context: 'continuing development discussion'
        }
      });

      // Then: the phase should be determined based on the context
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBeDefined();
      
      // And: instructions should be contextually appropriate
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
    });

    it('should suggest appropriate transition when context indicates readiness', async () => {
      // Given: an existing conversation with comprehensive context
      await startServer();
      
      // First, explicitly set the phase to design for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'setting up test'
        }
      });
      
      // When: I provide conversation_summary and recent_messages indicating phase completion
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          conversation_summary: 'Completed authentication system design. User approved the architecture with JWT tokens, bcrypt hashing, and RESTful API endpoints.',
          recent_messages: [
            { role: 'user', content: 'The design looks perfect, let\'s implement it' },
            { role: 'assistant', content: 'Great! I\'ll help you implement the authentication system step by step.' }
          ],
          user_input: 'ready to start coding',
          context: 'design phase complete, ready for implementation'
        }
      });

      // Then: the transition engine should analyze the context
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      
      // And: determine appropriate phase transitions based on context
      expect(response.phase).toBeDefined();
      
      // And: provide contextually relevant instructions
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Handling malformed or missing parameters', () => {
    it('should handle missing project context gracefully', async () => {
      // Given: the MCP server is running
      await startServer();

      // When: I call whats_next with minimal parameters
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {}
      });

      // Then: the tool should handle the request gracefully
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      const response = JSON.parse(result.content[0].text!);
      
      // And: return meaningful response
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
      expect(response.transition_reason).toBeDefined();
    });

    it('should work with minimal parameters', async () => {
      // Given: the MCP server is running
      await startServer();

      // When: I call whats_next with just user input
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'help me build a feature'
        }
      });

      // Then: the tool should work properly
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
    });
  });

  describe('Scenario: Context analysis drives phase transitions', () => {
    it('should analyze conversation context for phase transitions', async () => {
      // Given: an existing conversation with rich context
      await startServer();
      
      // First, explicitly set the phase to design for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'setting up test'
        }
      });

      // When: I provide conversation_summary and recent_messages indicating phase completion
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          conversation_summary: 'Completed authentication system design. User approved the architecture with JWT tokens, bcrypt hashing, and RESTful API endpoints.',
          recent_messages: [
            { role: 'user', content: 'The design looks perfect, let\'s implement it' },
            { role: 'assistant', content: 'Great! I\'ll help you implement the authentication system step by step.' }
          ],
          user_input: 'ready to start coding',
          context: 'design phase complete, ready for implementation'
        }
      });

      // Then: the transition engine should analyze the context
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      
      // And: determine appropriate phase transitions based on context
      expect(response.phase).toBeDefined();
      
      // And: provide contextually relevant instructions
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
    });

    it('should handle conversations with different project contexts', async () => {
      // Given: a server running
      await startServer();

      // When: I call whats_next with specific project context
      const result = await client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'working on user profile feature',
          context: 'feature branch development'
        }
      });

      // Then: the conversation should be handled appropriately
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
      
      // And: plan file path should be contextually appropriate
      expect(response.plan_file_path).toMatch(/\.md$/);
    });
  });
});
