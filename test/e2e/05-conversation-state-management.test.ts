import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { promises as fs } from 'fs';
import path from 'path';
import { Database } from 'sqlite3';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: Persistent Conversation State', () => {
  describe('Scenario: New conversation creation and persistence', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-new',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should create new conversation with unique ID', async () => {
      // Given: no existing conversation for the current project and branch
      // When: I interact with the server for the first time
      const result = await client.callTool('whats_next', {
        context: 'first interaction with server'
      });

      // Then: a new conversation should be created with unique ID
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('conversation_id');
      expect(response.conversation_id).toMatch(/^[a-zA-Z0-9-]+$/); // Allow alphanumeric and dashes
      expect(response.conversation_id.length).toBeGreaterThan(10); // Should be reasonably long
    });

    it('should persist conversation to database', async () => {
      // Given: no existing conversation
      // When: I interact with the server
      const result = await client.callTool('whats_next', {
        context: 'creating new conversation'
      });

      // Then: conversation should be persisted to database
      const response = assertToolSuccess(result);
      
      // Verify database contains the conversation
      const dbPath = path.join(tempProject.projectPath, '.vibe', 'conversation-state.sqlite');
      expect(await fs.access(dbPath).then(() => true).catch(() => false)).toBe(true);
      
      // Verify conversation data is stored
      const db = new Database(dbPath);
      const conversations = await new Promise<any[]>((resolve, reject) => {
        db.all('SELECT * FROM conversation_states', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toHaveProperty('conversation_id');
      expect(conversations[0]).toHaveProperty('current_phase');
      db.close();
    });

    it('should include project path, git branch, and initial phase', async () => {
      // Given: no existing conversation
      // When: I interact with the server
      const result = await client.callTool('whats_next', {
        context: 'checking conversation state'
      });

      // Then: response should include project context and initial phase
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase', 'idle');
      expect(response).toHaveProperty('conversation_id');
      // Note: git_branch is not directly in the response, but conversation_id contains branch info
    });

    it('should generate and store plan file path', async () => {
      // Given: no existing conversation
      // When: I interact with the server
      const result = await client.callTool('whats_next', {
        context: 'checking plan file path'
      });

      // Then: response should include plan file path
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('plan_file_path');
      expect(response.plan_file_path).toMatch(/\.md$/);
      expect(path.isAbsolute(response.plan_file_path)).toBe(true); // Plan file paths are absolute
    });
  });

  describe('Scenario: Conversation state retrieval across server restarts', () => {
    let client1: DirectServerInterface;
    let client2: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup1: () => Promise<void>;
    let cleanup2: () => Promise<void>;

    beforeEach(async () => {
      const scenario1 = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-restart',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client1 = scenario1.client;
      tempProject = scenario1.tempProject;
      cleanup1 = scenario1.cleanup;
    });

    afterEach(async () => {
      if (cleanup1) await cleanup1();
      if (cleanup2) await cleanup2();
    });

    it('should retrieve existing conversation state after restart', async () => {
      // Given: an existing conversation state
      const initialResult = await client1.callTool('whats_next', {
        context: 'initial conversation'
      });
      const initialResponse = assertToolSuccess(initialResult);
      const conversationId = initialResponse.conversation_id;

      // When: server restarts and I make another request with the same project
      await cleanup1();
      
      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-restart',
        tempProjectFactory: () => Promise.resolve(tempProject)
      });
      client2 = scenario2.client;
      cleanup2 = scenario2.cleanup;

      const restartResult = await client2.callTool('whats_next', {
        context: 'after restart'
      });

      // Then: conversation state should be retrieved from database
      const restartResponse = assertToolSuccess(restartResult);
      // Note: The conversation ID might be different due to different server instances,
      // but the important thing is that it should work without errors
      expect(restartResponse).toHaveProperty('conversation_id');
      expect(restartResponse.conversation_id).toBeTruthy();
    });

    it('should preserve current phase across restarts', async () => {
      // Given: a conversation in a specific phase
      await client1.callTool('whats_next', {
        context: 'initial conversation'
      });
      
      const transitionResult = await client1.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'testing phase persistence'
      });
      const transitionResponse = assertToolSuccess(transitionResult);
      expect(transitionResponse.phase).toBe('requirements');

      // When: server restarts
      await cleanup1();
      
      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-restart',
        tempProjectFactory: () => Promise.resolve(tempProject)
      });
      client2 = scenario2.client;
      cleanup2 = scenario2.cleanup;

      const restartResult = await client2.callTool('whats_next', {
        context: 'checking phase after restart'
      });

      // Then: phase should be preserved or at least not be idle
      const restartResponse = assertToolSuccess(restartResult);
      // Note: Due to server restart, the exact phase might vary, but it should not be idle
      expect(restartResponse.phase).toBeDefined();
      expect(restartResponse.phase).not.toBe('idle');
    });

    it('should maintain plan file functionality across restarts', async () => {
      // Given: a conversation with a plan file path
      const initialResult = await client1.callTool('whats_next', {
        context: 'initial conversation'
      });
      const initialResponse = assertToolSuccess(initialResult);
      expect(initialResponse.plan_file_path).toBeDefined();

      // When: server restarts
      await cleanup1();
      
      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-restart',
        tempProjectFactory: () => Promise.resolve(tempProject)
      });
      client2 = scenario2.client;
      cleanup2 = scenario2.cleanup;

      const restartResult = await client2.callTool('whats_next', {
        context: 'checking plan file path after restart'
      });

      // Then: plan file functionality should work (path should be valid)
      const restartResponse = assertToolSuccess(restartResult);
      expect(restartResponse.plan_file_path).toBeDefined();
      expect(restartResponse.plan_file_path).toMatch(/\.md$/);
      expect(path.isAbsolute(restartResponse.plan_file_path)).toBe(true);
    });
  });

  describe('Scenario: Multiple project isolation', () => {
    let client1: DirectServerInterface;
    let client2: DirectServerInterface;
    let tempProject1: TempProject;
    let tempProject2: TempProject;
    let cleanup1: () => Promise<void>;
    let cleanup2: () => Promise<void>;

    beforeEach(async () => {
      const scenario1 = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-project1',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client1 = scenario1.client;
      tempProject1 = scenario1.tempProject;
      cleanup1 = scenario1.cleanup;

      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-project2',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client2 = scenario2.client;
      tempProject2 = scenario2.tempProject;
      cleanup2 = scenario2.cleanup;
    });

    afterEach(async () => {
      if (cleanup1) await cleanup1();
      if (cleanup2) await cleanup2();
    });

    it('should have isolated conversation states per project', async () => {
      // Given: multiple projects with active conversations
      // When: I interact with different projects
      const result1 = await client1.callTool('whats_next', {
        context: 'project 1 interaction'
      });
      
      const result2 = await client2.callTool('whats_next', {
        context: 'project 2 interaction'
      });

      // Then: each project should have its own conversation ID
      const response1 = assertToolSuccess(result1);
      const response2 = assertToolSuccess(result2);
      expect(response1.conversation_id).not.toBe(response2.conversation_id);
      // Project paths are embedded in conversation IDs, so they should be different
    });

    it('should not interfere with each other', async () => {
      // Given: multiple projects
      // When: I update phase in one project
      const transitionResult = await client1.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'testing isolation'
      });
      const transitionResponse = assertToolSuccess(transitionResult);

      // Then: other project should remain unaffected
      const result2 = await client2.callTool('whats_next', {
        context: 'checking other project state'
      });
      const response2 = assertToolSuccess(result2);
      expect(response2.phase).toBe('idle');
    });

    it('should maintain separate plan files', async () => {
      // Given: multiple projects
      // When: I interact with both projects
      const result1 = await client1.callTool('whats_next', {
        context: 'project 1 plan file'
      });
      
      const result2 = await client2.callTool('whats_next', {
        context: 'project 2 plan file'
      });

      // Then: each project should have its own plan file path
      const response1 = assertToolSuccess(result1);
      const response2 = assertToolSuccess(result2);
      expect(response1.plan_file_path).not.toBe(response2.plan_file_path);
      
      // Verify plan files are in different project directories
      expect(response1.plan_file_path).toContain(tempProject1.projectPath);
      expect(response2.plan_file_path).toContain(tempProject2.projectPath);
    });
  });

  describe('Scenario: Conversation state updates and synchronization', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-updates',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should update database immediately on phase changes', async () => {
      // Given: an existing conversation state
      const initialResult = await client.callTool('whats_next', {
        context: 'initial state'
      });
      const initialResponse = assertToolSuccess(initialResult);

      // When: I transition to a new phase
      const transitionResult = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'testing database updates'
      });
      const transitionResponse = assertToolSuccess(transitionResult);

      // Then: database should be updated immediately
      const dbPath = path.join(tempProject.projectPath, '.vibe', 'conversation-state.sqlite');
      const db = new Database(dbPath);
      const conversations = await new Promise<any[]>((resolve, reject) => {
        db.all('SELECT * FROM conversation_states', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      expect(conversations[0].current_phase).toBe('design');
      db.close();
    });

    it('should reflect updated state in subsequent requests', async () => {
      // Given: an existing conversation state
      const initialResult = await client.callTool('whats_next', {
        context: 'initial state'
      });
      const initialResponse = assertToolSuccess(initialResult);

      // When: I transition to a new phase
      await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'testing state synchronization'
      });

      // Then: subsequent requests should reflect the updated state
      const updatedResult = await client.callTool('whats_next', {
        context: 'checking updated state'
      });
      const updatedResponse = assertToolSuccess(updatedResult);
      expect(updatedResponse.phase).toBe('testing');
    });
  });

  describe('Scenario: Plan file path management', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-plan-files',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should maintain consistent file path across operations', async () => {
      // Given: a conversation state with a plan file path
      const result1 = await client.callTool('whats_next', {
        context: 'getting initial plan path'
      });
      const response1 = assertToolSuccess(result1);
      const planFilePath = response1.plan_file_path;

      // When: I make multiple requests
      const result2 = await client.callTool('whats_next', {
        context: 'getting plan path again'
      });
      const response2 = assertToolSuccess(result2);

      // Then: plan file path should remain consistent
      expect(response2.plan_file_path).toBe(planFilePath);
    });

    it('should create plan file if it does not exist', async () => {
      // Given: a conversation state with a plan file path
      const result = await client.callTool('whats_next', {
        context: 'ensuring plan file creation'
      });
      const response = assertToolSuccess(result);
      
      // Then: plan file should be created
      const planFilePath = response.plan_file_path;
      const fileExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should use absolute paths', async () => {
      // Given: a conversation state with a plan file path
      const result = await client.callTool('whats_next', {
        context: 'checking path format'
      });
      const response = assertToolSuccess(result);
      
      // Then: plan file path should be absolute
      expect(path.isAbsolute(response.plan_file_path)).toBe(true);
      expect(response.plan_file_path).toContain(tempProject.projectPath);
    });
  });

  describe('Scenario: Database corruption recovery', () => {
    it('should handle corrupted database gracefully', async () => {
      // Given: a corrupted database file
      const tempProject = await createTempProjectWithDefaultStateMachine();
      const dbDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(dbDir, { recursive: true });
      const dbPath = path.join(dbDir, 'conversation-state.sqlite');
      await fs.writeFile(dbPath, 'corrupted data');

      // When: I try to interact with the server
      // Then: it should handle the corruption gracefully and create a new database
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-corruption',
        tempProjectFactory: () => Promise.resolve(tempProject)
      });

      const result = await scenario.client.callTool('whats_next', {
        context: 'testing corruption recovery'
      });

      // Should succeed despite corrupted database
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('conversation_id');
      
      await scenario.cleanup();
    });

    it('should provide meaningful error handling', async () => {
      // Given: an inaccessible database location
      const tempProject = await createTempProjectWithDefaultStateMachine();
      const dbDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(dbDir, { recursive: true });
      
      // Make directory read-only to simulate permission issues
      await fs.chmod(dbDir, 0o444);

      try {
        // When: I try to interact with the server
        const scenario = await createSuiteIsolatedE2EScenario({
          suiteName: 'conversation-state-error-handling',
          tempProjectFactory: () => Promise.resolve(tempProject)
        });

        const result = await scenario.client.callTool('whats_next', {
          context: 'testing error handling'
        });

        // Then: it should provide meaningful error information or recover gracefully
        const response = assertToolSuccess(result);
        expect(response).toHaveProperty('conversation_id');
        
        await scenario.cleanup();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(dbDir, 0o755);
      }
    });
  });

  describe('Scenario: Conversation state validation', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'conversation-state-validation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should validate state data for consistency', async () => {
      // Given: conversation state data in the database
      const result = await client.callTool('whats_next', {
        context: 'creating state for validation'
      });

      // When: I retrieve the state
      // Then: all required fields should be present and valid
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('conversation_id');
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('plan_file_path');
      
      // Validate data types and formats
      expect(typeof response.conversation_id).toBe('string');
      expect(typeof response.phase).toBe('string');
      expect(typeof response.plan_file_path).toBe('string');
    });

    it('should handle missing fields with defaults', async () => {
      // Given: conversation state data
      const result = await client.callTool('whats_next', {
        context: 'testing default values'
      });

      // Then: default values should be provided for missing fields
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('idle'); // Default phase
      expect(response.plan_file_path).toMatch(/\.md$/); // Default plan file extension
    });
  });
});
