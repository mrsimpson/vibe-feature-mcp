/**
 * Shared Test Setup Utilities
 * 
 * Provides common mocking and server setup functions for integration tests
 */

import { vi } from 'vitest';
import { join } from 'path';

// Default minimal state machine YAML
const defaultStateMachineYamlString = `
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

/**
 * Mock the fs module with configurable behavior
 * @param options Configuration options for the mock
 * @returns The mocked fs module for assertions
 */
export function mockFileSystem(options: {
  existingPaths?: string[],
  stateMachineYaml?: string,
  fileContents?: Record<string, string> // Map of file paths to their contents
} = {}) {
  // Create mock implementations
  const existsSyncMock = vi.fn((path) => {
    // Check fileContents map first
    if (options.fileContents && path in options.fileContents) {
      return true;
    }

    // Default paths that should exist
    if (path.includes('.vibe')) return true;
    if (path.includes('state-machine.yaml')) return true;
    if (path.includes('.git')) return true;
    if (path.includes('.sqlite')) return true;

    // Check custom paths if provided
    if (options.existingPaths && options.existingPaths.some(p => path.includes(p))) {
      return true;
    }

    return false;
  });

  const readFileSyncMock = vi.fn((path, opts) => {
    // Check fileContents map first
    if (options.fileContents && path in options.fileContents) {
      return options.fileContents[path];
    }

    // Default state machine handling
    if (path.includes('state-machine.yaml')) {
      return options.stateMachineYaml || defaultStateMachineYamlString;
    }

    return '';
  });

  const writeFileSyncMock = vi.fn();
  const mkdirSyncMock = vi.fn();
  const rmSyncMock = vi.fn();

  // Create the mock module
  const fsMock = {
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock,
    mkdirSync: mkdirSyncMock,
    rmSync: rmSyncMock
  };

  // Setup fs mock
  vi.mock('fs', () => fsMock);

  // Return the mock functions for assertions
  return fsMock;
}

/**
 * Mock logger for tests
 */
export function mockLogger() {
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
}

/**
 * Mock the sqlite3 module
 */
export function mockSqlite() {
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
}

/**
 * Server test context
 */
export interface ServerTestContext {
  client: any;
  transport: any;
  cleanup: () => Promise<void>;
}

/**
 * Start a test server instance
 * @param options Server configuration options
 * @returns Server test context with client and cleanup function
 */
export async function startTestServer(options: {
  projectPath?: string;
  logLevel?: string;
} = {}): Promise<ServerTestContext> {
  const serverPath = join(process.cwd(), 'src', 'index.ts');
  const tempDir = options.projectPath || '/mock/project/path';

  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', serverPath],
    env: {
      ...process.env,
      VIBE_FEATURE_LOG_LEVEL: options.logLevel || 'DEBUG',
      VIBE_FEATURE_PROJECT_PATH: tempDir,
      NODE_ENV: 'test'
    }
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);

  return {
    client,
    transport,
    cleanup: async () => {
      if (client) {
        await client.close();
      }
    }
  };
}
