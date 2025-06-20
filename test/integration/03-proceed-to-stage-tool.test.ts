/**
 * proceed_to_phase Tool Integration Tests
 * 
 * Tests explicit phase transition tool via MCP protocol
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockFileSystem, mockSqlite, startTestServer, ServerTestContext } from '../utils/test-setup';

describe('proceed_to_phase Tool Integration Tests', () => {
  let serverContext: ServerTestContext;

  // Setup mocks before each test
  beforeEach(() => {
    // Setup mocks
    mockFileSystem();
    mockSqlite();
  });

  // Clean up after each test
  afterEach(async () => {
    // Clean up client and server
    if (serverContext) {
      await serverContext.cleanup();
    }
  });

  describe('Scenario: Valid phase transition from requirements to design', () => {
    it('should transition from requirements to design', async () => {
      // Given: an existing conversation in "requirements" phase
      serverContext = await startTestServer();
      
      // First, explicitly set the phase to requirements for this test
      await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'requirements',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with target_phase "design"
      const result = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'requirements gathering complete'
        }
      });

      // Then: the conversation phase should be updated to "design"
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('design');
      
      // And: design-specific instructions should be returned
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/design|architecture|technical/);
      
      // And: the transition reason should be recorded
      expect(response.transition_reason).toBe('requirements gathering complete');
    });
  });

  describe('Scenario: Direct phase transition skipping intermediate phases', () => {
    it('should allow direct transition to implementation', async () => {
      // Given: an existing conversation
      serverContext = await startTestServer();
      
      // First, explicitly set the phase to requirements for this test
      await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'requirements',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with target_phase "implementation" (skipping design)
      const result = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'implementation',
          reason: 'requirements and design already done offline'
        }
      });

      // Then: the phase should transition directly to "implementation"
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('implementation');
      
      // And: implementation-specific instructions should be provided
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/implement|code|build/);
      
      // And: the transition reason should be recorded
      expect(response.transition_reason).toBe('requirements and design already done offline');
    });
  });

  describe('Scenario: Transition to completion phase', () => {
    it('should transition to complete phase', async () => {
      // Given: an existing conversation in "testing" phase
      serverContext = await startTestServer();
      
      // First, explicitly set the phase to testing for this test
      await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'testing',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with target_phase "complete"
      const result = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'complete',
          reason: 'all testing completed successfully'
        }
      });

      // Then: the conversation should be marked as complete
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('complete');
      
      // And: completion instructions should be provided
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/complete|finish|done/);
    });
  });

  describe('Scenario: Invalid phase transition parameters', () => {
    it('should reject invalid phase names', async () => {
      // Given: the MCP server is running
      serverContext = await startTestServer();

      // When: I call proceed_to_phase with an invalid target_phase
      try {
        await serverContext.client.callTool({
          name: 'proceed_to_phase',
          arguments: {
            target_phase: 'invalid_phase'
          }
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Then: the tool should return an error response
        expect(error).toBeDefined();
        // The error should indicate invalid phase
        expect(error.message || error.toString()).toMatch(/invalid|error/i);
      }
    });

    it('should handle missing target_phase parameter', async () => {
      // Given: the MCP server is running
      serverContext = await startTestServer();

      // When: I call proceed_to_phase without target_phase
      try {
        await serverContext.client.callTool({
          name: 'proceed_to_phase',
          arguments: {
            reason: 'test reason'
          }
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Then: the tool should return an error response
        expect(error).toBeDefined();
        // The error should indicate missing required parameter
        expect(error.message || error.toString()).toMatch(/required|missing|target_phase/i);
      }
    });
  });

  describe('Scenario: Transition with detailed reason', () => {
    it('should record transition with provided reason', async () => {
      // Given: an existing conversation in "design" phase
      serverContext = await startTestServer();
      
      // First, explicitly set the phase to design for this test
      await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'setting up test'
        }
      });

      // When: I call proceed_to_phase with detailed reason
      const detailedReason = 'design approved by user, ready to code';
      const result = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'implementation',
          reason: detailedReason
        }
      });

      // Then: the transition should be recorded with the provided reason
      const response = JSON.parse(result.content[0].text!);
      expect(response.transition_reason).toBe(detailedReason);
      
      // And: the reason should be included in the response
      expect(response.transition_reason).toContain('approved');
      expect(response.transition_reason).toContain('ready to code');
    });
  });

  describe('Scenario: Transition without existing conversation', () => {
    it('should create new conversation with target phase', async () => {
      // Given: no existing conversation state for the current project
      serverContext = await startTestServer();

      // When: I call proceed_to_phase with target_phase "design"
      const result = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'starting directly with design'
        }
      });

      // Then: a new conversation should be created
      const response = JSON.parse(result.content[0].text!);
      expect(response.phase).toBe('design');
      
      // And: the phase should be set to the requested target phase
      expect(response.instructions).toBeDefined();
      expect(response.instructions.toLowerCase()).toMatch(/design|architecture/);
    });
  });

  describe('Scenario: Multiple rapid phase transitions', () => {
    it('should handle sequential transitions correctly', async () => {
      // Given: an existing conversation
      serverContext = await startTestServer();

      // When: transitions are requested in sequence
      const transition1 = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'design',
          reason: 'move to design'
        }
      });

      const transition2 = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'implementation',
          reason: 'move to implementation'
        }
      });

      const transition3 = await serverContext.client.callTool({
        name: 'proceed_to_phase',
        arguments: {
          target_phase: 'qa',
          reason: 'move to qa'
        }
      });

      // Then: each transition should be processed correctly
      const response1 = JSON.parse(transition1.content[0].text!);
      expect(response1.phase).toBe('design');

      const response2 = JSON.parse(transition2.content[0].text!);
      expect(response2.phase).toBe('implementation');

      const response3 = JSON.parse(transition3.content[0].text!);
      expect(response3.phase).toBe('qa');
    });
  });
});
