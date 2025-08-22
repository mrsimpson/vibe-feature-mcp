/**
 * Temporary File Management for Integration Tests
 *
 * Provides utilities for creating and managing real temporary files
 * for integration tests that spawn server processes.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Temporary test project configuration
 */
export interface TempProjectOptions {
  /** Custom state machine YAML content */
  customStateMachine?: string;
  /** Project name (used for directory name) */
  projectName?: string;
  /** Git branch name */
  gitBranch?: string;
  /** Additional files to create */
  additionalFiles?: Record<string, string>;
  /** Base directory for the project (defaults to OS temp dir) */
  baseDirectory?: string;
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
        to: "requirements"
        instructions: "Start requirements analysis by asking the user clarifying questions about WHAT they need. Focus on understanding their goals, scope, and constraints. Break down their needs into specific, actionable tasks and document them in the plan file. Mark completed requirements tasks as you progress."
        transition_reason: "New feature request detected, starting requirements analysis"
  requirements:
    description: "Gathering requirements"
    transitions:
      - trigger: "requirements_complete"
        to: "design"
        instructions: "Help the user design the technical solution. Ask about quality goals, technology preferences, and architectural decisions. Document the design decisions and update the plan file. Mark completed requirements tasks as done."
        transition_reason: "Requirements gathering complete, starting design phase"
  design:
    description: "Designing solution"
    transitions:
      - trigger: "design_complete"
        to: "implementation"
        instructions: "Guide the user through implementing the solution. Follow coding best practices, provide structure guidance, and track implementation progress. Update the plan file and mark completed design tasks."
        transition_reason: "Design phase complete, starting implementation"
  implementation:
    description: "Implementing solution"
    transitions:
      - trigger: "implementation_complete"
        to: "qa"
        instructions: "Guide code review and quality validation. Ensure requirements are properly met, help with testing and documentation. Update the plan file and mark completed implementation tasks."
        transition_reason: "Implementation phase complete, starting QA"
  qa:
    description: "Quality assurance"
    transitions:
      - trigger: "qa_complete"
        to: "testing"
        instructions: "Guide comprehensive testing strategies. Help create and execute test plans, validate feature completeness. Update the plan file and mark completed QA tasks."
        transition_reason: "QA phase complete, starting testing"
  testing:
    description: "Testing solution"
    transitions:
      - trigger: "testing_complete"
        to: "complete"
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
 * Custom state machine YAML for testing
 */
export const CUSTOM_STATE_MACHINE_YAML = `
name: "Custom Test State Machine"
description: "Simple two-phase state machine for testing"
initial_state: "phase1"
states:
  phase1:
    description: "First test phase"
    transitions:
      - trigger: "move_to_phase2"
        to: "phase2"
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
 * Temporary project manager
 */
export class TempProject {
  public readonly projectPath: string;
  private readonly cleanupPaths: string[] = [];

  constructor(options: TempProjectOptions = {}) {
    const {
      projectName = `test-project-${Date.now()}`,
      gitBranch = 'main',
      customStateMachine,
      additionalFiles = {},
      baseDirectory = tmpdir(),
    } = options;

    // Create temporary project directory
    this.projectPath = join(
      baseDirectory,
      'responsible-vibe-tests',
      projectName
    );
    this.cleanupPaths.push(this.projectPath);

    // Create directory structure
    mkdirSync(this.projectPath, { recursive: true });
    mkdirSync(join(this.projectPath, '.vibe'), { recursive: true });
    mkdirSync(join(this.projectPath, '.git'), { recursive: true });

    // Create basic project files
    writeFileSync(
      join(this.projectPath, 'package.json'),
      JSON.stringify(
        {
          name: projectName,
          version: '1.0.0',
        },
        null,
        2
      )
    );

    // Create git branch file
    writeFileSync(
      join(this.projectPath, '.git', 'HEAD'),
      `ref: refs/heads/${gitBranch}`
    );

    // Create custom state machine if provided
    if (customStateMachine) {
      writeFileSync(
        join(this.projectPath, '.vibe', 'workflow.yaml'),
        customStateMachine
      );
    }

    // Create additional files
    for (const [filePath, content] of Object.entries(additionalFiles)) {
      const fullPath = join(this.projectPath, filePath);
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, content);
    }
  }

  /**
   * Add a file to the project
   */
  addFile(relativePath: string, content: string): void {
    const fullPath = join(this.projectPath, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content);
  }

  /**
   * Check if a file exists in the project
   */
  hasFile(relativePath: string): boolean {
    return existsSync(join(this.projectPath, relativePath));
  }

  /**
   * Add mock project documents to satisfy artifact checking
   */
  addMockProjectDocs(): void {
    this.addFile(
      '.vibe/docs/architecture.md',
      '# Architecture\n\nMock architecture document for testing.'
    );
    this.addFile(
      '.vibe/docs/requirements.md',
      '# Requirements\n\nMock requirements document for testing.'
    );
    this.addFile(
      '.vibe/docs/design.md',
      '# Design\n\nMock design document for testing.'
    );
  }

  /**
   * Clean up the temporary project
   */
  cleanup(): void {
    for (const path of this.cleanupPaths) {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    }
  }
}

/**
 * Create a temporary project with custom state machine
 */
export function createTempProjectWithCustomStateMachine(
  customStateMachine: string = CUSTOM_STATE_MACHINE_YAML,
  baseDirectory?: string
): TempProject {
  const project = new TempProject({
    customStateMachine,
    projectName: `custom-sm-${Date.now()}`,
    baseDirectory,
  });

  // Add mock project documents to satisfy artifact checking
  project.addMockProjectDocs();

  return project;
}

/**
 * Create a temporary project with default state machine (no custom one)
 */
export function createTempProjectWithDefaultStateMachine(
  baseDirectory?: string
): TempProject {
  const project = new TempProject({
    projectName: `default-sm-${Date.now()}`,
    baseDirectory,
  });

  // Add mock project documents to satisfy artifact checking
  project.addMockProjectDocs();

  return project;
}

/**
 * Helper to safely parse JSON responses from server, handling error cases
 */
export function safeParseServerResponse(
  content: Array<{ text?: string }>
): unknown {
  if (!content || content.length === 0) {
    throw new Error('No content in server response');
  }

  const text = content[0].text;
  if (!text) {
    throw new Error('No text content in server response');
  }

  // If the response starts with "Error:", it's an error message, not JSON
  if (typeof text === 'string' && text.startsWith('Error:')) {
    throw new Error(`Server error: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Failed to parse server response as JSON: ${text.substring(0, 100)}...`
    );
  }
}
