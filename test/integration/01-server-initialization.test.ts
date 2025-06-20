/**
 * Server Initialization Integration Tests
 * 
 * Tests server startup, database initialization, and component integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockFileSystem, mockSqlite, startTestServer, ServerTestContext } from '../utils/test-setup';

describe('Server Initialization Integration Tests', () => {
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

  describe('Scenario: Server starts successfully with clean state', () => {
    it('should initialize server with all components', async () => {
      // Given: a clean environment
      
      // When: I start the server
      serverContext = await startTestServer();
      
      // Then: the server should be running
      expect(serverContext.client).toBeDefined();
      
      // And: the server should respond to resource requests
      const stateResource = await serverContext.client.readResource({
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

  describe('Scenario: Server reconnects to existing database', () => {
    it('should reconnect to existing database and preserve state', async () => {
      // Given: a server with existing state
      serverContext = await startTestServer();
      
      // Create initial state by calling whats_next
      const initialResult = await serverContext.client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement authentication feature'
        }
      });
      
      const initialStateResponse = await serverContext.client.readResource({
        uri: 'state://current'
      });
      const initialState = JSON.parse(initialStateResponse.contents[0].text!);
      
      // When: I restart the server
      await serverContext.cleanup();
      serverContext = await startTestServer();
      
      // Then: the server should reconnect to the existing database
      expect(serverContext.client).toBeDefined();
      
      // And: preserve all existing conversation states
      const restoredStateResponse = await serverContext.client.readResource({
        uri: 'state://current'
      });
      const restoredState = JSON.parse(restoredStateResponse.contents[0].text!);

      // And: be able to continue previous conversations
      expect(restoredState.conversationId).toBe(initialState.conversationId);
      expect(restoredState.projectPath).toBe(initialState.projectPath);
    });
  });

  describe('Scenario: Server components are properly integrated', () => {
    it('should have all components working together', async () => {
      // Given: a clean server setup
      serverContext = await startTestServer();
      
      // When: I call whats_next with a feature request
      const result = await serverContext.client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement user authentication',
          context: 'new feature request'
        }
      });
      
      // Then: the transition engine should process the request
      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text!);
      
      // And: transition to requirements phase
      expect(response.phase).toBeDefined();
      
      // And: provide instructions
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(0);
      
      // And: update the state
      const stateResource = await serverContext.client.readResource({
        uri: 'state://current'
      });
      const stateData = JSON.parse(stateResource.contents[0].text!);
      expect(stateData.currentPhase).toBeDefined();
    });
  });

  describe('Scenario: Server resources are accessible', () => {
    it('should provide access to plan and state resources', async () => {
      // Given: a server with existing state
      serverContext = await startTestServer();
      
      // Create initial state
      await serverContext.client.callTool({
        name: 'whats_next',
        arguments: {
          user_input: 'implement user authentication'
        }
      });
      
      // When: I request resources
      const stateResource = await serverContext.client.readResource({
        uri: 'state://current'
      });
      
      const planResource = await serverContext.client.readResource({
        uri: 'plan://current'
      });
      
      const systemPromptResource = await serverContext.client.readResource({
        uri: 'prompt://system'
      });
      
      // Then: all resources should be accessible
      expect(stateResource).toBeDefined();
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);
      
      expect(planResource).toBeDefined();
      expect(planResource.contents).toBeDefined();
      
      expect(systemPromptResource).toBeDefined();
      expect(systemPromptResource.contents).toBeDefined();
      
      // And: contain valid data
      const stateData = JSON.parse(stateResource.contents[0].text!);
      expect(stateData.conversationId).toBeDefined();
      expect(stateData.currentPhase).toBeDefined();
      
      expect(planResource.contents[0].text).toBeDefined();
      expect(systemPromptResource.contents[0].text).toBeDefined();
    });
  });
});
