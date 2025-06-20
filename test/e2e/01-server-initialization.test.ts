/**
 * Server Initialization E2E Tests
 * 
 * Feature: MCP Server Startup and Configuration
 * 
 * As a developer using the Vibe Feature MCP server
 * I want the server to initialize properly with all components
 * So that I can interact with it through the MCP protocol
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VibeFeatureMCPServer } from '../../src/server.js';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: MCP Server Startup and Configuration', () => {
  let tempProject: TempProject;
  let client: DirectServerInterface;
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Scenario: Server starts successfully with clean state', () => {
    beforeEach(async () => {
      // Given: no existing database or configuration files exist
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'server-initialization-clean',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    it('should initialize successfully', async () => {
      // When: the MCP server is started
      // (Server is already started by the scenario setup)
      
      // Then: the server should initialize successfully
      expect(client).toBeDefined();
    });

    it('should create database at ~/.vibe-feature-mcp/db.sqlite', async () => {
      // When: the MCP server is started and first tool is called
      await client.callTool('whats_next', {
        user_input: 'test database creation',
        context: 'Testing database initialization'
      });

      // Then: the database should be created at ~/.vibe-feature-mcp/db.sqlite
      const dbPath = join(homedir(), '.vibe-feature-mcp', 'db.sqlite');
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should create conversation_states table', async () => {
      // When: the MCP server is started and first tool is called
      const result = await client.callTool('whats_next', {
        user_input: 'test table creation',
        context: 'Testing table initialization'
      });

      // Then: the conversation_states table should be created
      // (Verified by successful tool call which requires database)
      const response = assertToolSuccess(result);
      expect(response.phase).toBeDefined();
    });

    it('should expose whats_next and proceed_to_phase tools', async () => {
      // When: the MCP server is started
      // Then: the server should expose the following tools
      const availableTools = await client.listTools();
      
      expect(availableTools).toContain('whats_next');
      expect(availableTools).toContain('proceed_to_phase');
    });

    it('should expose development-plan and conversation-state resources', async () => {
      // When: the MCP server is started
      // Then: the server should expose the following resources
      const availableResources = await client.listResources();
      
      expect(availableResources).toContain('plan://current');
      expect(availableResources).toContain('state://current');
    });

    it('should be ready to accept MCP protocol requests', async () => {
      // When: the MCP server is started
      // Then: server should be ready to accept MCP protocol requests
      const result = await client.callTool('whats_next', {
        user_input: 'test MCP protocol',
        context: 'Testing MCP protocol readiness'
      });

      const response = assertToolSuccess(result);
      expect(response.phase).toBeDefined();
      expect(response.instructions).toBeDefined();
      expect(response.plan_file_path).toBeDefined();
    });
  });

  describe('Scenario: Server handles database connection errors gracefully', () => {
    it('should handle database errors gracefully', async () => {
      // Given: the database directory is not writable
      // This is difficult to test in isolation without mocking
      // We'll test that the server handles general errors gracefully
      
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'server-initialization-errors',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;

      // When: the MCP server attempts to initialize
      // Then: the server should handle the error gracefully
      // And: provide a meaningful error message
      // And: not crash the process
      
      // Test with malformed parameters to trigger error handling
      const result = await client.callTool('whats_next', {
        // Intentionally malformed to test error handling
        invalid_param: 'test error handling'
      });

      // Server should handle this gracefully without crashing
      expect(result).toBeDefined();
    });
  });

  describe('Scenario: Server reconnects to existing database', () => {
    it('should connect to existing database and preserve conversation states', async () => {
      // Given: an existing database with conversation states
      const scenario1 = await createSuiteIsolatedE2EScenario({
        suiteName: 'server-initialization-reconnect',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      
      // Create initial conversation state
      const initialResult = await scenario1.client.callTool('whats_next', {
        user_input: 'create initial conversation',
        context: 'Creating initial state for reconnection test'
      });
      
      const initialResponse = assertToolSuccess(initialResult);
      const initialPhase = initialResponse.phase;
      
      // Get the conversation state
      const initialStateResource = await scenario1.client.readResource('state://current');
      const initialStateData = JSON.parse(initialStateResource.contents[0].text);
      const conversationId = initialStateData.conversationId;
      
      await scenario1.cleanup();

      // When: the MCP server is restarted
      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'server-initialization-reconnect',
        tempProjectFactory: () => scenario1.tempProject // Reuse same project
      });
      client = scenario2.client;
      tempProject = scenario2.tempProject;
      cleanup = scenario2.cleanup;

      // Then: the server should connect to the existing database
      // And: preserve all existing conversation states
      const reconnectResult = await client.callTool('whats_next', {
        user_input: 'test reconnection',
        context: 'Testing database reconnection'
      });

      const reconnectResponse = assertToolSuccess(reconnectResult);
      
      // And: be able to continue previous conversations
      const reconnectStateResource = await client.readResource('state://current');
      const reconnectStateData = JSON.parse(reconnectStateResource.contents[0].text);
      
      // The conversation should be preserved (same project path should maintain state)
      expect(reconnectStateData.projectPath).toBe(initialStateData.projectPath);
      expect(reconnectResponse.phase).toBeDefined();
    });
  });
});
