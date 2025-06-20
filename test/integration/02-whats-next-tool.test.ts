/**
 * whats_next Tool End-to-End Integration Tests
 * 
 * Tests the whats_next tool functionality from a consumer's perspective
 * using the refactored server architecture for in-process testing.
 */

import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { 
  createSuiteIsolatedE2EScenario, 
  assertToolSuccess, 
  parseToolResponse, TestSuiteIsolation,
  TestSuiteIsolation
} from '../utils/e2e-test-setup.js';
import { 
  createTempProjectWithDefaultStateMachine, 
  createTempProjectWithCustomStateMachine,
  CUSTOM_STATE_MACHINE_YAML 
} from '../utils/temp-files.js';

describe('whats_next Tool E2E Integration Tests', () => {
  const SUITE_NAME = 'whats-next-tool';
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  afterAll(async () => {
    // Clean up the entire suite
    await TestSuiteIsolation.cleanupSuite(SUITE_NAME);
  });

  describe('Scenario: First call to whats_next creates new conversation', () => {
    it('should create new conversation for first whats_next call', async () => {
      // Given: a clean server environment with default state machine
      const { client, cleanup: testCleanup } = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      cleanup = testCleanup;
      
      // When: I call whats_next for the first time
      const result = await client.callTool('whats_next', {
        user_input: 'I want to implement user authentication',
        context: 'new feature request'
      });
      
      // Then: a new conversation should be created
      const response = assertToolSuccess(result);
      
      // And: the phase should be a valid development phase
      expect(response.phase).toBeDefined();
      expect(['idle', 'requirements', 'design', 'implementation', 'qa', 'testing', 'complete'])
        .toContain(response.phase);
      
      // And: instructions should be provided
      expect(response.instructions).toBeDefined();
      expect(typeof response.instructions).toBe('string');
      expect(response.instructions.length).toBeGreaterThan(0);
      
      // And: a plan file path should be provided
      expect(response.plan_file_path).toBeDefined();
      expect(typeof response.plan_file_path).toBe('string');
      
      // And: a transition reason should be provided
      expect(response.transition_reason).toBeDefined();
      expect(typeof response.transition_reason).toBe('string');
    });
  });

  describe('Scenario: Continuing existing conversation', () => {
    it('should continue conversation and transition phases appropriately', async () => {
      // Given: a server with an existing conversation
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ tempProject });
      cleanup = testCleanup;
      
      // Create initial conversation state
      const initialResult = await client.callTool('whats_next', {
        user_input: 'hello',
        context: 'initial greeting'
      });
      
      const initialResponse = assertToolSuccess(initialResult);
      expect(initialResponse.phase).toBeDefined();

      // When: I continue the conversation with a feature request
      const result = await client.callTool('whats_next', {
        user_input: 'I want to build a todo app',
        context: 'feature request in existing conversation',
        conversation_summary: 'User greeted initially, now requesting todo app feature'
      });
      
      // Then: the conversation should continue appropriately
      const response = assertToolSuccess(result);
      
      // And: should transition to requirements or stay in current phase
      expect(['idle', 'requirements']).toContain(response.phase);
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
    });
  });

  describe('Scenario: Handling malformed or missing parameters', () => {
    it('should handle missing project context gracefully', async () => {
      // Given: a server environment
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ tempProject });
      cleanup = testCleanup;
      
      // When: I call whats_next with minimal parameters
      const result = await client.callTool('whats_next', {
        user_input: 'help me'
      });
      
      // Then: the server should handle it gracefully
      const response = parseToolResponse(result);
      
      // Should not be an error
      expect(response.error).toBeUndefined();
      
      // And: return meaningful response
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
    });

    it('should work with minimal parameters', async () => {
      // Given: a server environment
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ tempProject });
      cleanup = testCleanup;
      
      // When: I call whats_next with only user_input
      const result = await client.callTool('whats_next', {
        user_input: 'create a web application'
      });
      
      // Then: it should still provide guidance
      const response = assertToolSuccess(result);
      
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
      expect(response.transition_reason).toBeDefined();
    });
  });

  describe('Scenario: Resource integration', () => {
    it('should provide access to conversation state resource', async () => {
      // Given: a server with active conversation
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ 
        tempProject,
        serverConfig: { projectPath: tempProject.projectPath } // Use temp project path
      });
      cleanup = testCleanup;
      
      // Create some conversation state
      await client.callTool('whats_next', {
        user_input: 'implement authentication',
        context: 'new feature'
      });
      
      // When: I read the state resource
      const stateResult = await client.readResource('state://current');
      
      // Then: it should provide current state information
      expect(stateResult.contents).toBeDefined();
      expect(stateResult.contents.length).toBeGreaterThan(0);
      
      const stateData = JSON.parse(stateResult.contents[0].text);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });

    it('should provide access to development plan resource', async () => {
      // Given: a server with active conversation
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ 
        tempProject,
        serverConfig: { projectPath: tempProject.projectPath } // Use temp project path
      });
      cleanup = testCleanup;
      
      // Create some conversation state
      await client.callTool('whats_next', {
        user_input: 'implement authentication',
        context: 'new feature'
      });
      
      // When: I read the plan resource
      const planResult = await client.readResource('plan://current');
      
      // Then: it should provide plan information
      expect(planResult.contents).toBeDefined();
      expect(planResult.contents.length).toBeGreaterThan(0);
      expect(planResult.contents[0].mimeType).toBe('text/markdown');
      expect(planResult.contents[0].text).toBeDefined();
    });
  });

  describe('Scenario: End-to-end workflow simulation', () => {
    it('should handle a complete development workflow from requirements to implementation', async () => {
      // Given: a fresh server environment
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({
        tempProject,
        serverConfig: { projectPath: tempProject.projectPath }
      });
      cleanup = testCleanup;

      // When: Starting with a feature request
      const step1 = await client.callTool('whats_next', {
        user_input: 'I want to build a user authentication system',
        context: 'new feature request'
      });

      const response1 = assertToolSuccess(step1);
      expect(response1.phase).toBe('requirements');
      expect(response1.instructions).toContain('requirements');

      // And: Continuing with requirements gathering
      const step2 = await client.callTool('whats_next', {
        user_input: 'I need login, registration, and password reset functionality',
        context: 'providing requirements details',
        conversation_summary: 'User wants authentication system, provided initial requirements'
      });

      const response2 = assertToolSuccess(step2);
      expect(response2.phase).toBe('requirements');

      // And: Moving to design phase when requirements are complete
      const step3 = await client.callTool('whats_next', {
        user_input: 'That covers all my requirements. Let\'s design the solution.',
        context: 'requirements complete, ready for design',
        conversation_summary: 'User provided complete authentication requirements: login, registration, password reset'
      });

      const response3 = assertToolSuccess(step3);
      // Should either stay in requirements or move to design based on transition logic
      expect(['requirements', 'design']).toContain(response3.phase);

      // Then: All responses should have consistent structure
      [response1, response2, response3].forEach(response => {
        expect(response.phase).toBeDefined();
        expect(response.instructions).toBeDefined();
        expect(response.plan_file_path).toBeDefined();
        expect(response.transition_reason).toBeDefined();
        expect(response.plan_file_path).toContain(tempProject.projectPath);
      });
    });

    it('should maintain conversation state across multiple interactions', async () => {
      // Given: a server with ongoing conversation
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ 
        tempProject,
        serverConfig: { projectPath: tempProject.projectPath }
      });
      cleanup = testCleanup;
      
      // When: Having multiple interactions
      const interactions = [
        { input: 'create a todo app', context: 'initial request' },
        { input: 'add task management features', context: 'expanding requirements' },
        { input: 'include user accounts', context: 'additional requirements' }
      ];
      
      const responses = [];
      for (const interaction of interactions) {
        const result = await client.callTool('whats_next', {
          user_input: interaction.input,
          context: interaction.context,
          conversation_summary: `Building todo app. Previous interactions: ${responses.length}`
        });
        responses.push(assertToolSuccess(result));
      }
      
      // Then: All responses should reference the same conversation
      const planPaths = responses.map(r => r.plan_file_path);
      expect(new Set(planPaths).size).toBe(1); // All should have same plan file path
      
      // And: State should be maintained
      responses.forEach(response => {
        expect(response.phase).toBeDefined();
        expect(response.instructions).toBeDefined();
      });
    });

    it('should handle error conditions gracefully', async () => {
      // Given: a server environment
      const tempProject = createTempProjectWithDefaultStateMachine();
      const { client, cleanup: testCleanup } = await createE2EScenario({ 
        tempProject,
        serverConfig: { projectPath: tempProject.projectPath }
      });
      cleanup = testCleanup;
      
      // When: Calling with empty parameters
      const result1 = await client.callTool('whats_next', {});
      const response1 = parseToolResponse(result1);
      
      // Then: Should handle gracefully without errors
      expect(response1.error).toBeUndefined();
      expect(response1.phase).toBeDefined();
      
      // When: Calling with malformed context
      const result2 = await client.callTool('whats_next', {
        user_input: 'test',
        recent_messages: 'not an array' // Should be array
      });
      const response2 = parseToolResponse, TestSuiteIsolation(result2);
      
      // Then: Should still work (server should handle type coercion)
      expect(response2.phase).toBeDefined();
    });
  });
});
