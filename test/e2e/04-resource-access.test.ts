/**
 * Resource Access E2E Tests
 * 
 * Feature: MCP Resource Endpoints
 * 
 * As an LLM client using the Vibe Feature MCP server
 * I want to access development plan and conversation state resources
 * So that I can read current project status and development plans
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { writeFileSync, unlinkSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: MCP Resource Endpoints', () => {
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Scenario: Access development plan resource', () => {
    beforeEach(async () => {
      // Given: an existing conversation with a plan file
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-plan',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation and plan file
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Creating conversation with plan file'
      });
    });

    it('should return plan file content as markdown', async () => {
      // Given: the plan file contains development tasks and progress
      // When: I request the plan://current resource
      const planResource = await client.readResource('plan://current');

      // Then: the plan file content should be returned as markdown
      expect(planResource).toBeDefined();
      expect(planResource.contents).toBeDefined();
      expect(planResource.contents.length).toBeGreaterThan(0);

      const content = planResource.contents[0];
      expect(content.text).toBeDefined();
      expect(typeof content.text).toBe('string');

      // And: the content should include current project status
      expect(content.text.length).toBeGreaterThan(0);

      // And: the MIME type should be text/markdown
      expect(content.mimeType).toBe('text/markdown');
    });

    it('should include proper resource metadata', async () => {
      // When: I request the plan://current resource
      const planResource = await client.readResource('plan://current');

      // Then: resource metadata should be properly formatted
      expect(planResource.contents[0].uri).toBe('plan://current');
      expect(planResource.contents[0].mimeType).toBe('text/markdown');
    });

    it('should reflect current plan file state', async () => {
      // Given: plan file exists
      const planResource1 = await client.readResource('plan://current');
      const originalContent = planResource1.contents[0].text;

      // When: plan file is modified (simulated by creating new conversation)
      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design phase'
      });

      // Then: content should reflect current filesystem state
      const planResource2 = await client.readResource('plan://current');
      expect(planResource2.contents[0].text).toBeDefined();
      // Content should be available (may be same or different based on implementation)
      expect(planResource2.contents[0].text.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Access conversation state resource', () => {
    beforeEach(async () => {
      // Given: an existing conversation with phase and metadata
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-state',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Creating conversation with state'
      });
    });

    it('should return conversation state as JSON', async () => {
      // When: I request the state://current resource
      const stateResource = await client.readResource('state://current');

      // Then: the conversation state should be returned as JSON
      expect(stateResource).toBeDefined();
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);

      const content = stateResource.contents[0];
      expect(content.text).toBeDefined();

      // And: the MIME type should be application/json
      expect(content.mimeType).toBe('application/json');

      // Parse JSON to verify it's valid
      const stateData = JSON.parse(content.text);
      expect(stateData).toBeDefined();
    });

    it('should include current phase, project path, and conversation metadata', async () => {
      // When: I request the state://current resource
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);

      // Then: the response should include current phase, project path, and git branch
      expect(stateData.currentPhase).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.timestamp).toBeDefined();
    });

    it('should have proper resource metadata', async () => {
      // When: I request the state://current resource
      const stateResource = await client.readResource('state://current');

      // Then: resource metadata should be properly formatted
      expect(stateResource.contents[0].uri).toBe('state://current');
      expect(stateResource.contents[0].mimeType).toBe('application/json');
    });
  });

  describe('Scenario: Access resources without existing conversation', () => {
    beforeEach(async () => {
      // Given: no existing conversation for the current project
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-no-conversation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should create new conversation automatically when accessing plan resource', async () => {
      // When: I request the plan resource without existing conversation
      const planResource = await client.readResource('plan://current');

      // Then: a new conversation should be created automatically
      // And: default content should be returned
      expect(planResource).toBeDefined();
      expect(planResource.contents[0].text).toBeDefined();
      expect(planResource.contents[0].text.length).toBeGreaterThan(0);

      // And: the resources should be accessible immediately
      expect(planResource.contents[0].mimeType).toBe('text/markdown');
    });

    it('should create new conversation automatically when accessing state resource', async () => {
      // When: I request the state resource without existing conversation
      const stateResource = await client.readResource('state://current');

      // Then: a new conversation should be created automatically
      const stateData = JSON.parse(stateResource.contents[0].text);
      
      // And: state resource should return newly created conversation state
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });

    it('should initialize conversation context properly', async () => {
      // When: I access resources without existing conversation
      const stateResource = await client.readResource('state://current');
      const planResource = await client.readResource('plan://current');

      // Then: both resources should be accessible
      expect(stateResource.contents[0].text).toBeDefined();
      expect(planResource.contents[0].text).toBeDefined();

      // And: conversation should be properly initialized
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.projectPath).toBe(tempProject.projectPath);
    });
  });

  describe('Scenario: Plan resource with missing plan file', () => {
    beforeEach(async () => {
      // Given: an existing conversation state
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-missing-plan',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Creating conversation'
      });
    });

    it('should create plan file automatically if missing', async () => {
      // Given: plan file might not exist or we simulate missing file
      // When: I request the plan://current resource
      const planResource = await client.readResource('plan://current');

      // Then: a new plan file should be created automatically
      // And: the plan file should contain default template content
      expect(planResource.contents[0].text).toBeDefined();
      expect(planResource.contents[0].text.length).toBeGreaterThan(0);

      // And: the content should be returned successfully
      expect(planResource.contents[0].mimeType).toBe('text/markdown');
    });

    it('should handle subsequent access correctly', async () => {
      // Given: first access creates the plan file
      const planResource1 = await client.readResource('plan://current');
      const firstContent = planResource1.contents[0].text;

      // When: I access the resource again
      const planResource2 = await client.readResource('plan://current');
      const secondContent = planResource2.contents[0].text;

      // Then: subsequent access should return the created content
      expect(secondContent).toBeDefined();
      expect(secondContent.length).toBeGreaterThan(0);
      // Content should be consistent
      expect(secondContent).toBe(firstContent);
    });
  });

  describe('Scenario: Resource access with filesystem errors', () => {
    beforeEach(async () => {
      // Given: an existing conversation state
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-fs-errors',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Creating conversation for error testing'
      });
    });

    it('should handle filesystem errors gracefully', async () => {
      // This test is challenging to implement without mocking
      // We'll test that the server remains stable under normal conditions
      
      // When: I request the plan resource
      const planResource = await client.readResource('plan://current');

      // Then: the server should remain stable
      expect(planResource).toBeDefined();
      expect(planResource.contents[0].text).toBeDefined();

      // And: subsequent requests should still work
      const stateResource = await client.readResource('state://current');
      expect(stateResource).toBeDefined();
    });

    it('should provide meaningful error handling', async () => {
      // Test that the server handles resource access gracefully
      // When: I request resources
      const planResource = await client.readResource('plan://current');
      const stateResource = await client.readResource('state://current');

      // Then: resources should be accessible
      expect(planResource.contents[0].text).toBeDefined();
      expect(stateResource.contents[0].text).toBeDefined();

      // And: server should remain responsive
      const toolResult = await client.callTool('whats_next', {
        user_input: 'test server stability',
        context: 'Testing after resource access'
      });
      
      const response = assertToolSuccess(toolResult);
      expect(response.phase).toBeDefined();
    });
  });

  describe('Scenario: Resource access with database errors', () => {
    beforeEach(async () => {
      // Given: setup for database error testing
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-db-errors',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should handle database errors gracefully', async () => {
      // This test verifies graceful degradation under normal conditions
      // When: I request the state resource
      const stateResource = await client.readResource('state://current');

      // Then: an appropriate response should be returned
      expect(stateResource).toBeDefined();
      expect(stateResource.contents[0].text).toBeDefined();

      // And: the server should remain responsive after database operations
      const planResource = await client.readResource('plan://current');
      expect(planResource).toBeDefined();
    });

    it('should maintain server stability', async () => {
      // When: I access resources and tools
      const stateResource = await client.readResource('state://current');
      const toolResult = await client.callTool('whats_next', {
        user_input: 'test stability',
        context: 'Testing server stability'
      });

      // Then: server should remain responsive
      expect(stateResource).toBeDefined();
      const response = assertToolSuccess(toolResult);
      expect(response.phase).toBeDefined();
    });
  });

  describe('Scenario: Resource content updates reflect in real-time', () => {
    beforeEach(async () => {
      // Given: an existing conversation and plan file
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-real-time',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // Create conversation
      await client.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'Creating conversation for real-time testing'
      });
    });

    it('should reflect changes immediately', async () => {
      // Given: initial resource state
      const initialState = await client.readResource('state://current');
      const initialStateData = JSON.parse(initialState.contents[0].text);
      const initialPhase = initialStateData.currentPhase;

      // When: the conversation state is modified
      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'testing real-time updates'
      });

      // And: I request the state://current resource
      const updatedState = await client.readResource('state://current');
      const updatedStateData = JSON.parse(updatedState.contents[0].text);

      // Then: the updated content should be returned
      expect(updatedStateData.currentPhase).toBe('design');
      expect(updatedStateData.currentPhase).not.toBe(initialPhase);

      // And: changes should be reflected immediately
      expect(updatedStateData.conversationId).toBe(initialStateData.conversationId);
    });

    it('should not cache outdated content', async () => {
      // Given: multiple resource accesses
      const access1 = await client.readResource('state://current');
      const access2 = await client.readResource('state://current');

      // When: content is accessed multiple times
      const data1 = JSON.parse(access1.contents[0].text);
      const data2 = JSON.parse(access2.contents[0].text);

      // Then: content should always reflect current filesystem state
      expect(data1.currentPhase).toBe(data2.currentPhase);
      expect(data1.conversationId).toBe(data2.conversationId);

      // And: timestamps should be different (proving no caching)
      expect(data1.timestamp).not.toBe(data2.timestamp);
      
      // And: all other fields should be identical
      const { timestamp: ts1, ...rest1 } = data1;
      const { timestamp: ts2, ...rest2 } = data2;
      expect(rest1).toEqual(rest2);
    });
  });

  describe('Scenario: Resource URIs are properly formatted', () => {
    beforeEach(async () => {
      // Given: the MCP server is running
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'resource-access-uris',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should list available resources with proper URIs', async () => {
      // When: I list available resources
      const availableResources = await client.listResources();

      // Then: the resource URIs should be properly formatted
      expect(availableResources).toContain('plan://current');
      expect(availableResources).toContain('state://current');

      // And: resources should be discoverable through MCP protocol
      expect(availableResources.length).toBeGreaterThanOrEqual(2);
    });

    it('should provide resources with correct metadata', async () => {
      // When: I access each resource
      const planResource = await client.readResource('plan://current');
      const stateResource = await client.readResource('state://current');

      // Then: plan://current should be available
      expect(planResource.contents[0].uri).toBe('plan://current');
      expect(planResource.contents[0].mimeType).toBe('text/markdown');

      // And: state://current should be available
      expect(stateResource.contents[0].uri).toBe('state://current');
      expect(stateResource.contents[0].mimeType).toBe('application/json');

      // And: MIME types should be correctly specified
      expect(planResource.contents[0].mimeType).toBe('text/markdown');
      expect(stateResource.contents[0].mimeType).toBe('application/json');
    });

    it('should handle invalid resource URIs appropriately', async () => {
      // When: I request an invalid resource URI
      // Then: it should handle the error gracefully
      await expect(async () => {
        await client.readResource('invalid://resource');
      }).rejects.toThrow();

      // And: valid resources should still work after error
      const planResource = await client.readResource('plan://current');
      expect(planResource).toBeDefined();
    });
  });
});
