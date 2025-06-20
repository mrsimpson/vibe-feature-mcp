/**
 * Server Initialization Integration Tests
 * 
 * Tests server startup, database initialization, and component integration
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
    transitions: []
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

describe('Server Initialization Integration Tests', () => {
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

  describe('Scenario: Server starts successfully with clean state', () => {
    it('should initialize server with all components', async () => {
      // Given: a clean environment
      
      // When: I start the server
      const client = await startServer();
      
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
      expect(stateData.currentPhase).toBeDefined();
      expect(stateData.projectPath).toBeDefined();
    });
  });
});
