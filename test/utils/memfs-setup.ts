/**
 * Memfs Setup Utilities
 * 
 * Provides DRY utilities for setting up in-memory file system for tests
 * following Vitest best practices with memfs
 */

import { vi } from 'vitest';
import { vol } from 'memfs';
import { join } from 'path';

/**
 * File system mock configuration options
 */
export interface MockFileSystemOptions {
  /** Map of file paths to their contents */
  files?: Record<string, string>;
  /** Project root directory (defaults to /test/project) */
  projectRoot?: string;
  /** Current working directory (defaults to projectRoot) */
  cwd?: string;
  /** Git branch name (defaults to 'main') */
  gitBranch?: string;
}

/**
 * Default state machine YAML for testing
 */
export const DEFAULT_STATE_MACHINE_YAML = `
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
          instructions: "Start requirements analysis by asking the user clarifying questions about WHAT they need. Focus on understanding their goals, scope, and constraints. Break down their needs into specific, actionable tasks and document them in the plan file. Mark completed requirements tasks as you progress."
          transition_reason: "New feature request detected, starting requirements analysis"
  requirements:
    description: "Gathering requirements"
    transitions:
      - trigger: "requirements_complete"
        target: "design"
        is_modeled: true
        side_effects:
          instructions: "Help the user design the technical solution. Ask about quality goals, technology preferences, and architectural decisions. Document the design decisions and update the plan file. Mark completed requirements tasks as done."
          transition_reason: "Requirements gathering complete, starting design phase"
  design:
    description: "Designing solution"
    transitions:
      - trigger: "design_complete"
        target: "implementation"
        is_modeled: true
        side_effects:
          instructions: "Guide the user through implementing the solution. Follow coding best practices, provide structure guidance, and track implementation progress. Update the plan file and mark completed design tasks."
          transition_reason: "Design phase complete, starting implementation"
  implementation:
    description: "Implementing solution"
    transitions:
      - trigger: "implementation_complete"
        target: "qa"
        is_modeled: true
        side_effects:
          instructions: "Guide code review and quality validation. Ensure requirements are properly met, help with testing and documentation. Update the plan file and mark completed implementation tasks."
          transition_reason: "Implementation phase complete, starting QA"
  qa:
    description: "Quality assurance"
    transitions:
      - trigger: "qa_complete"
        target: "testing"
        is_modeled: true
        side_effects:
          instructions: "Guide comprehensive testing strategies. Help create and execute test plans, validate feature completeness. Update the plan file and mark completed QA tasks."
          transition_reason: "QA phase complete, starting testing"
  testing:
    description: "Testing solution"
    transitions:
      - trigger: "testing_complete"
        target: "complete"
        is_modeled: true
        side_effects:
          instructions: "Feature development is complete! All phases have been finished successfully. The feature is ready for delivery."
          transition_reason: "Testing phase complete, feature development finished"
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
 * Custom state machine YAML for testing custom state machine loading
 */
export const CUSTOM_STATE_MACHINE_YAML = `
name: "Overridden State Machine"
description: "Simple two-phase state machine for testing"
initial_state: "phase1"
states:
  phase1:
    description: "First test phase"
    transitions:
      - trigger: "move_to_phase2"
        target: "phase2"
        is_modeled: true
        side_effects:
          instructions: "Moving to phase 2"
          transition_reason: "Transition to phase 2 triggered"
  phase2:
    description: "Second test phase"
    transitions: []
direct_transitions:
  - state: "phase1"
    instructions: "Direct to phase 1"
    transition_reason: "Direct transition to phase 1"
  - state: "phase2"
    instructions: "Direct to phase 2"
    transition_reason: "Direct transition to phase 2"
`;

/**
 * Setup in-memory file system using memfs
 * This function should be called in beforeEach() hooks
 */
export function setupMemfs(options: MockFileSystemOptions = {}) {
  const {
    files = {},
    projectRoot = '/test/project',
    cwd = projectRoot,
    gitBranch = 'main'
  } = options;

  // Enable fs mocking
  vi.mock('fs');
  vi.mock('fs/promises');

  // Reset the in-memory file system
  vol.reset();

  // Create basic directory structure
  const directories = [
    projectRoot,
    join(projectRoot, '.vibe'),
    join(projectRoot, '.git'),
    '/Users/oliverjaegle/projects/privat/mcp-server/vibe-feature/resources'
  ];

  // Create directories
  directories.forEach(dir => {
    vol.mkdirSync(dir, { recursive: true });
  });

  // Set up default files
  const defaultFiles: Record<string, string> = {
    // Default state machine (fallback)
    '/Users/oliverjaegle/projects/privat/mcp-server/vibe-feature/resources/state-machine.yaml': DEFAULT_STATE_MACHINE_YAML,
    // Git branch file
    [join(projectRoot, '.git', 'HEAD')]: `ref: refs/heads/${gitBranch}`,
    // Basic project structure
    [join(projectRoot, 'package.json')]: '{"name": "test-project"}',
    ...files
  };

  // Write all files to memfs
  Object.entries(defaultFiles).forEach(([filePath, content]) => {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    vol.mkdirSync(dir, { recursive: true });
    vol.writeFileSync(filePath, content);
  });

  // Mock process.cwd() to return our test directory
  vi.spyOn(process, 'cwd').mockReturnValue(cwd);

  return {
    vol,
    projectRoot,
    cwd,
    gitBranch,
    // Helper to add files after setup
    addFile: (path: string, content: string) => {
      const dir = path.substring(0, path.lastIndexOf('/'));
      vol.mkdirSync(dir, { recursive: true });
      vol.writeFileSync(path, content);
    },
    // Helper to check if file exists
    hasFile: (path: string) => vol.existsSync(path),
    // Helper to get file content
    getFile: (path: string) => vol.readFileSync(path, 'utf8'),
    // Helper to list all files (for debugging)
    listFiles: () => Object.keys(vol.toJSON())
  };
}

/**
 * Setup custom state machine for testing
 */
export function setupCustomStateMachine(projectPath: string, stateMachineYaml: string = CUSTOM_STATE_MACHINE_YAML) {
  return setupMemfs({
    files: {
      [`${projectPath}/.vibe/state-machine.yaml`]: stateMachineYaml
    },
    projectRoot: projectPath
  });
}

/**
 * Setup default state machine scenario
 */
export function setupDefaultStateMachine(projectPath: string = '/test/project') {
  return setupMemfs({
    projectRoot: projectPath
  });
}

/**
 * Mock logger for tests (prevents console spam)
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
 * Mock SQLite database for tests
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
 * Complete test setup - call this in beforeEach for most tests
 */
export function setupTestEnvironment(options: MockFileSystemOptions = {}) {
  mockLogger();
  mockSqlite();
  return setupMemfs(options);
}

/**
 * Cleanup function - call this in afterEach
 */
export function cleanupTestEnvironment() {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vol.reset();
}
