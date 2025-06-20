/**
 * System Prompt Resource E2E Integration Tests
 * 
 * Tests the system prompt resource functionality using the E2E methodology
 * with DirectServerInterface for consumer perspective testing without process spawning.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine, createTempProjectWithCustomStateMachine, CUSTOM_STATE_MACHINE_YAML } from '../utils/temp-files.js';
import { createSuiteIsolatedE2EScenario, DirectServerInterface, assertToolSuccess, TestSuiteIsolation } from '../utils/e2e-test-setup.js';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('System Prompt Resource E2E Integration Tests', () => {
  const SUITE_NAME = 'system-prompt-resource';
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
    if (tempProject) {
      tempProject.cleanup();
    }
  });

  afterAll(async () => {
    // Clean up the entire suite
    await TestSuiteIsolation.cleanupSuite(SUITE_NAME);
  });

  describe('Scenario: System prompt resource availability with default state machine', () => {
    it('should provide system prompt resource with default state machine content', async () => {
      // Given: a server with default state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I check available resources
      const availableResources = await client.listResources();
      
      // Then: system prompt resource should be available
      expect(availableResources).toContain('prompt://system');
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      
      // Then: the system prompt should be generated and returned
      expect(promptResource).toBeDefined();
      expect(promptResource.description).toContain('system prompt');
      expect(promptResource.messages).toBeDefined();
      expect(promptResource.messages.length).toBeGreaterThan(0);
      
      const promptMessage = promptResource.messages[0];
      expect(promptMessage.role).toBe('user');
      expect(promptMessage.content.type).toBe('text');
      
      const promptText = promptMessage.content.text;
      expect(promptText).toContain('whats_next()');
      expect(promptText).toContain('proceed_to_phase');
      expect(promptText).toContain('Development Phases');
    });

    it('should include all default development phases in system prompt', async () => {
      // Given: a server with default state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should include all default development phases
      const defaultPhases = ['idle', 'requirements', 'design', 'implementation', 'qa', 'testing', 'complete'];
      
      for (const phase of defaultPhases) {
        expect(promptText).toContain(phase);
      }
      
      // And: it should include phase-specific guidance
      expect(promptText).toContain('requirements analysis');
      expect(promptText).toContain('design phase');
      expect(promptText).toContain('implementation phase');
      expect(promptText).toContain('quality assurance');
      expect(promptText).toContain('testing phase');
    });

    it('should include comprehensive tool usage instructions', async () => {
      // Given: a server setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should include comprehensive tool usage instructions
      expect(promptText).toContain('whats_next({');
      expect(promptText).toContain('context:');
      expect(promptText).toContain('user_input:');
      expect(promptText).toContain('conversation_summary:');
      expect(promptText).toContain('recent_messages:');
      
      // And: it should include proceed_to_phase instructions
      expect(promptText).toContain('proceed_to_phase({');
      expect(promptText).toContain('target_phase:');
      expect(promptText).toContain('reason:');
      
      // And: it should explain when to use each tool
      expect(promptText).toContain('after each user interaction');
      expect(promptText).toContain('phase is complete');
    });

    it('should include plan file management instructions', async () => {
      // Given: a server setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should include plan file management instructions
      expect(promptText).toContain('plan file');
      expect(promptText).toContain('mark tasks complete');
      expect(promptText).toContain('[x]');
      expect(promptText).toContain('update the plan');
      
      // And: it should explain the plan file structure
      expect(promptText).toContain('markdown');
      expect(promptText).toContain('tasks');
      expect(promptText).toContain('progress');
    });
  });

  describe('Scenario: System prompt resource with custom state machine', () => {
    it('should adapt system prompt to custom state machine phases', async () => {
      // Given: a server with custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should include custom phases instead of default ones
      expect(promptText).toContain('phase1');
      expect(promptText).toContain('phase2');
      
      // And: it should not include default phases that aren't in the custom state machine
      expect(promptText).not.toContain('requirements');
      expect(promptText).not.toContain('design');
      expect(promptText).not.toContain('implementation');
      
      // But: it should still include general tool usage instructions
      expect(promptText).toContain('whats_next');
      expect(promptText).toContain('proceed_to_phase');
    });

    it('should include custom state machine specific instructions', async () => {
      // Given: a server with custom state machine
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: (baseDir) => createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML, baseDir)
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should reference the custom state machine name
      expect(promptText).toContain('Custom Test State Machine');
      
      // And: it should include available custom phases for transitions
      expect(promptText).toContain('phase1');
      expect(promptText).toContain('phase2');
      
      // And: it should still provide general guidance
      expect(promptText).toContain('conversation context');
      expect(promptText).toContain('phase transitions');
    });
  });

  describe('Scenario: System prompt integration with conversation state', () => {
    it('should provide contextually relevant system prompt', async () => {
      // Given: a server with an active conversation
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // Create an active conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Starting new feature development'
      });
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: the system prompt should be comprehensive and contextual
      expect(promptText).toBeDefined();
      expect(promptText.length).toBeGreaterThan(1000);
      
      // And: it should include current project context guidance
      expect(promptText).toContain('conversation context');
      expect(promptText).toContain('project memory');
      
      // And: it should explain the stateless approach
      expect(promptText).toContain('conversation_summary');
      expect(promptText).toContain('recent_messages');
    });

    it('should handle system prompt generation errors gracefully', async () => {
      // Given: a server setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I request system prompt with invalid parameters
      const promptResource = await client.getPrompt('system', {
        invalid_param: 'test'
      });
      
      // Then: it should still return a valid system prompt
      expect(promptResource).toBeDefined();
      expect(promptResource.messages).toBeDefined();
      expect(promptResource.messages.length).toBeGreaterThan(0);
      
      const promptText = promptResource.messages[0].content.text;
      expect(promptText).toContain('whats_next');
      expect(promptText).toContain('proceed_to_phase');
    });
  });

  describe('Scenario: System prompt content validation', () => {
    it('should include essential workflow guidance', async () => {
      // Given: a server setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should include essential workflow guidance
      const essentialElements = [
        'whats_next()',
        'proceed_to_phase',
        'conversation context',
        'plan file',
        'phase transitions',
        'development phases',
        'conversation_summary',
        'recent_messages',
        'user_input',
        'context'
      ];
      
      for (const element of essentialElements) {
        expect(promptText).toContain(element);
      }
      
      // And: it should be structured and readable
      expect(promptText).toContain('#'); // Should have markdown headers
      expect(promptText).toContain('```'); // Should have code examples
    });

    it('should provide clear examples of tool usage', async () => {
      // Given: a server setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I read the system prompt resource
      const promptResource = await client.getPrompt('system', {});
      const promptText = promptResource.messages[0].content.text;
      
      // Then: it should provide clear examples of tool usage
      expect(promptText).toContain('whats_next({');
      expect(promptText).toContain('proceed_to_phase({');
      
      // And: examples should be properly formatted
      expect(promptText).toContain('"');
      expect(promptText).toContain('}');
      
      // And: it should explain the parameters
      expect(promptText).toContain('context:');
      expect(promptText).toContain('user_input:');
      expect(promptText).toContain('target_phase:');
      expect(promptText).toContain('reason:');
    });
  });

  describe('Scenario: System prompt resource error handling', () => {
    it('should handle unknown prompt names gracefully', async () => {
      // Given: a server setup
      const scenario = await createSuiteIsolatedE2EScenario({ 
        suiteName: SUITE_NAME,
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      tempProject = scenario.tempProject;
      client = scenario.client;
      cleanup = scenario.cleanup;
      
      // When: I request an unknown prompt
      const promptResource = await client.getPrompt('unknown_prompt', {});
      
      // Then: it should return a placeholder or handle gracefully
      expect(promptResource).toBeDefined();
      expect(promptResource.description).toContain('unknown_prompt');
      expect(promptResource.messages).toBeDefined();
      
      // And: valid prompts should still work
      const systemPrompt = await client.getPrompt('system', {});
      expect(systemPrompt.messages[0].content.text).toContain('whats_next');
    });
  });
});
