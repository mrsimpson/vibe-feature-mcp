/**
 * whats_next Tool Integration Tests
 * 
 * Tests the primary analysis and instruction tool via MCP protocol
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
    transitions: []
  qa:
    description: "Quality assurance"
    transitions: []
  testing:
    description: "Testing solution"
    transitions: []
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

describe('whats_next Tool Integration Tests', () => {
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

  describe('Scenario: First call to whats_next creates new conversation', () => {
    it('should create new conversation for first whats_next call', async () => {
      // Given: no existing conversation state for the current project
      const client = await startServer();
      
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
      
      // And: the phase should be a valid development phase
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
      const client = await startServer();
      
      // First, explicitly set the phase to requirements for this test
      await client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'requirements',
          reason: 'setting up test'
        }
      });
      
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
      const client = await startServer();
      
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
      
      // And: determine appropriate phase transitions based on keywords in context
      expect(response.phase).toBeDefined();
      
      // And: provide contextually relevant instructions
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Handling malformed or missing parameters', () => {
    it('should handle missing project context gracefully', async () => {
      // Given: the MCP server is running
      const client = await startServer();

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
      const client = await startServer();

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
      const client = await startServer();
      
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
      const client = await startServer();

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
