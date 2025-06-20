/**
 * Server Initialization E2E Integration Tests
 * 
 * Tests server startup, database initialization, and component integration
 * using the E2E methodology with DirectServerInterface for consumer perspective testing.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine, createTempProjectWithCustomStateMachine, CUSTOM_STATE_MACHINE_YAML } from '../utils/temp-files.js';
import { createSuiteIsolatedE2EScenario, DirectServerInterface, assertToolSuccess, TestSuiteIsolation } from '../utils/e2e-test-setup.js';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Server Initialization E2E Integration Tests', () => {
  const SUITE_NAME = 'server-initialization';
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  afterAll(async () => {
    // Clean up the entire suite
    await TestSuiteIsolation.cleanupSuite(SUITE_NAME);
  });

  describe('Scenario: Server starts successfully with clean state', () => {
    it('should initialize server components and expose tools and resources', async () => {
      // Given: a clean project directory with default state machine
      // When: the MCP server is initialized via E2E scenario
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
      
      // Then: the server should expose the expected tools
      const availableTools = await client.listTools();
      expect(availableTools).toContain('whats_next');
      expect(availableTools).toContain('proceed_to_phase');
      
      // And: the server should expose the expected resources
      const availableResources = await client.listResources();
      expect(availableResources).toContain('state://current');
      expect(availableResources).toContain('plan://current');
      
      // And: tools should be functional
      const result = await client.callTool('whats_next', {
        user_input: 'test server initialization',
        context: 'Testing server startup'
      });
      
      const response = assertToolSuccess(result);
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
    });

    it('should handle conversation state creation on first tool call', async () => {
      // Given: a clean project setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
      
      // When: I make the first tool call
      const result = await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'First interaction with server'
      });
      
      // Then: a new conversation should be created
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('requirements'); // New feature starts in requirements
      expect(response.instructions).toContain('requirements');
      expect(response.transition_reason).toContain('New feature request detected');
      
      // And: conversation state should be accessible
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBe('requirements');
      expect(stateData.projectPath).toBe(tempProject.projectPath);
      expect(stateData.timestamp).toBeDefined();
    });

    it('should initialize with custom state machine when present', async () => {
      // Given: a project with custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
      
      // When: I make the first tool call
      const result = await client.callTool('whats_next', {
        user_input: 'start custom workflow',
        context: 'Testing custom state machine initialization'
      });
      
      // Then: the custom state machine should be used
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('phase1'); // Custom initial state
      expect(response.instructions).toContain('phase 1');
      
      // And: custom phases should be available for transitions
      const transitionResult = await client.callTool('proceed_to_phase', {
        target_phase: 'phase2',
        reason: 'testing custom phase transition'
      });
      
      const transitionResponse = assertToolSuccess(transitionResult);
      expect(transitionResponse.phase).toBe('phase2');
    });
  });

  describe('Scenario: Server handles multiple project contexts', () => {
    it('should isolate conversations between different projects', async () => {
      // Given: two different project setups in the same suite
      const scenario1 = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      const scenario2 = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      
      try {
        // When: I create conversations in both projects
        const result1 = await scenario1.client.callTool('whats_next', {
          user_input: 'implement auth in project 1',
          context: 'Project 1 development'
        });
        
        const result2 = await scenario2.client.callTool('whats_next', {
          user_input: 'implement dashboard in project 2',
          context: 'Project 2 development'
        });
        
        // Then: conversations should be isolated
        const response1 = assertToolSuccess(result1);
        const response2 = assertToolSuccess(result2);
        
        // Get conversation states
        const state1Resource = await scenario1.client.readResource('state://current');
        const state2Resource = await scenario2.client.readResource('state://current');
        
        const state1Data = JSON.parse(state1Resource.contents[0].text);
        const state2Data = JSON.parse(state2Resource.contents[0].text);
        
        // Conversation IDs should be different
        expect(state1Data.conversationId).not.toBe(state2Data.conversationId);
        expect(state1Data.projectPath).toBe(scenario1.tempProject.projectPath);
        expect(state2Data.projectPath).toBe(scenario2.tempProject.projectPath);
        
        // Clean up both scenarios
        await scenario1.cleanup();
        await scenario2.cleanup();
      } finally {
        // Cleanup is handled by suite isolation
      }
    });

    it('should handle rapid initialization and cleanup cycles', async () => {
      // Given: multiple initialization cycles
      const cleanupFunctions: (() => Promise<void>)[] = [];
      
      try {
        // When: I create and destroy multiple server instances rapidly
        for (let i = 0; i < 3; i++) {
          const scenario = await createSuiteIsolatedE2EScenario({ 
            suiteName: SUITE_NAME,
            tempProjectFactory: createTempProjectWithDefaultStateMachine
          });
          cleanupFunctions.push(scenario.cleanup);
          
          // Test that each instance works
          const result = await scenario.client.callTool('whats_next', {
            user_input: `test instance ${i}`,
            context: `Testing rapid initialization cycle ${i}`
          });
          
          const response = assertToolSuccess(result);
          expect(response.phase).toBeDefined();
          expect(response.instructions).toBeDefined();
        }
        
        // Then: all instances should have worked correctly
        expect(projects).toHaveLength(3);
        expect(cleanupFunctions).toHaveLength(3);
      } finally {
        // Clean up all instances
        for (const cleanupFn of cleanupFunctions) {
          await cleanupFn();
        }
        // Cleanup is handled by suite isolation
      }
    });
  });

  describe('Scenario: Server resources are accessible', () => {
    it('should provide access to conversation state resource', async () => {
      // Given: a server with existing conversation
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
      
      // Create initial conversation state
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Testing state resource access'
      });
      
      // When: I request the conversation state resource
      const stateResource = await client.readResource('state://current');
      
      // Then: the resource should be accessible and contain valid data
      expect(stateResource).toBeDefined();
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);
      
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
      expect(stateData.timestamp).toBeDefined();
      
      // And: the resource should have correct metadata
      expect(stateResource.contents[0].uri).toBe('state://current');
      expect(stateResource.contents[0].mimeType).toBe('application/json');
    });

    it('should provide access to development plan resource', async () => {
      // Given: a server with existing conversation
      tempProject = createTempProjectWithDefaultStateMachine();
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create initial conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Testing plan resource access'
      });
      
      // When: I request the development plan resource
      const planResource = await client.readResource('plan://current');
      
      // Then: the resource should be accessible
      expect(planResource).toBeDefined();
      expect(planResource.contents).toBeDefined();
      expect(planResource.contents.length).toBeGreaterThan(0);
      
      const planContent = planResource.contents[0].text;
      expect(planContent).toBeDefined();
      expect(typeof planContent).toBe('string');
      
      // And: the resource should have correct metadata
      expect(planResource.contents[0].uri).toBe('plan://current');
      expect(planResource.contents[0].mimeType).toBe('text/markdown');
      
      // And: plan content should be meaningful (either actual plan or placeholder)
      expect(planContent.length).toBeGreaterThan(0);
    });

    it('should handle resource access errors gracefully', async () => {
      // Given: a server setup
      tempProject = createTempProjectWithDefaultStateMachine();
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I request an invalid resource URI
      // Then: it should handle the error gracefully
      await expect(async () => {
        await client.readResource('invalid://resource');
      }).rejects.toThrow('Unknown resource URI');
      
      // And: valid resources should still work
      await client.callTool('whats_next', {
        user_input: 'test after error',
        context: 'Testing error recovery'
      });
      
      const stateResource = await client.readResource('state://current');
      expect(stateResource).toBeDefined();
    });
  });

  describe('Scenario: Server error handling and resilience', () => {
    it('should handle malformed tool parameters gracefully', async () => {
      // Given: a server setup
      tempProject = createTempProjectWithDefaultStateMachine();
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I call tools with malformed parameters
      const result1 = await client.callTool('whats_next', {
        // Missing user_input and other expected parameters
        invalid_param: 'test'
      });
      
      // Then: the server should handle it gracefully
      // (Either return a meaningful response or a proper error)
      expect(result1).toBeDefined();
      
      // And: subsequent valid calls should still work
      const result2 = await client.callTool('whats_next', {
        user_input: 'valid call after error',
        context: 'Testing error recovery'
      });
      
      const response2 = assertToolSuccess(result2);
      expect(response2.phase).toBeDefined();
    });

    it('should handle unknown tool calls gracefully', async () => {
      // Given: a server setup
      tempProject = createTempProjectWithDefaultStateMachine();
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I call an unknown tool
      // Then: it should throw an appropriate error
      await expect(async () => {
        await client.callTool('unknown_tool', {
          param: 'test'
        });
      }).rejects.toThrow('Unknown tool');
      
      // And: valid tools should still work
      const result = await client.callTool('whats_next', {
        user_input: 'test after unknown tool error',
        context: 'Testing error recovery'
      });
      
      const response = assertToolSuccess(result);
      expect(response.phase).toBeDefined();
    });
  });

  describe('Scenario: Component integration verification', () => {
    it('should verify all core components work together', async () => {
      // Given: a server with all components initialized
      tempProject = createTempProjectWithDefaultStateMachine();
      const scenario = await createE2EScenario({ tempProject });
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I perform a complete workflow cycle
      // 1. Start conversation (ConversationManager + TransitionEngine)
      const startResult = await client.callTool('whats_next', {
        user_input: 'implement user authentication system',
        context: 'Testing complete component integration'
      });
      
      const startResponse = assertToolSuccess(startResult);
      expect(startResponse.phase).toBe('requirements');
      
      // 2. Explicit phase transition (TransitionEngine + StateMachineLoader)
      const transitionResult = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements complete'
      });
      
      const transitionResponse = assertToolSuccess(transitionResult);
      expect(transitionResponse.phase).toBe('design');
      
      // 3. Continue conversation (all components working together)
      const continueResult = await client.callTool('whats_next', {
        user_input: 'design the authentication API',
        context: 'Continuing in design phase',
        conversation_summary: 'Working on authentication system, moved to design phase'
      });
      
      const continueResponse = assertToolSuccess(continueResult);
      expect(continueResponse.phase).toBe('design'); // Should stay in design
      expect(continueResponse.instructions).toContain('design');
      
      // 4. Verify resources reflect the workflow state
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('design');
      
      const planResource = await client.readResource('plan://current');
      expect(planResource.contents[0].text).toBeDefined();
      
      // Then: all components should have worked together seamlessly
      expect(startResponse.plan_file_path).toBeDefined();
      expect(transitionResponse.plan_file_path).toBeDefined();
      expect(continueResponse.plan_file_path).toBeDefined();
    });
  });
});
