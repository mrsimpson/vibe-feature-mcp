/**
 * System Prompt Resource Integration Tests
 * 
 * Tests the system prompt resource functionality to ensure it generates
 * and serves the system prompt correctly via MCP.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockFileSystem, mockSqlite, startTestServer, ServerTestContext } from '../utils/test-setup';

describe('System Prompt Resource Integration Tests', () => {
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

  describe('Scenario: System prompt resource availability', () => {
    it('should list system prompt resource', async () => {
      // Given: a running vibe-feature-mcp server
      serverContext = await startTestServer();

      // When: I list available resources
      const resources = await serverContext.client.listResources();

      // Then: the system prompt resource should be available
      expect(resources.resources).toBeDefined();
      
      const systemPromptResource = resources.resources.find(r => r.uri === 'prompt://system');
      expect(systemPromptResource).toBeDefined();
      expect(systemPromptResource?.uri).toBe('prompt://system');
      expect(systemPromptResource?.name).toBe('LLM System Prompt');
      expect(systemPromptResource?.description).toContain('Dynamically generated system prompt');
      expect(systemPromptResource?.mimeType).toBe('text/markdown');
    });

    it('should generate and serve system prompt content', async () => {
      // Given: a running vibe-feature-mcp server
      serverContext = await startTestServer();

      // When: I read the system prompt resource
      const result = await serverContext.client.readResource({
        uri: 'prompt://system'
      });

      // Then: the system prompt should be generated and returned
      expect(result.contents).toBeDefined();
      expect(result.contents).toHaveLength(1);
      
      const content = result.contents[0];
      expect(content.uri).toBe('prompt://system');
      expect(content.mimeType).toBe('text/markdown');
      expect(content.text).toBeDefined();
      
      // And: the content should be a comprehensive system prompt
      const promptText = content.text!;
      expect(promptText).toContain('whats_next()');
      expect(promptText).toContain('proceed_to_phase');
      expect(promptText).toContain('Development Phases');
      expect(promptText).toContain('Phase Transitions');
      
      // And: it should include all development phases
      expect(promptText).toContain('idle');
      expect(promptText).toContain('requirements');
      expect(promptText).toContain('design');
      expect(promptText).toContain('implementation');
      expect(promptText).toContain('qa');
      expect(promptText).toContain('testing');
      expect(promptText).toContain('complete');
      
      // And: it should be substantial content
      expect(promptText.length).toBeGreaterThan(1000);
    });

    it('should include phase-specific instructions from state machine', async () => {
      // Given: a running vibe-feature-mcp server
      serverContext = await startTestServer();

      // When: I read the system prompt resource
      const result = await serverContext.client.readResource({
        uri: 'prompt://system'
      });

      // Then: the prompt should include phase-specific instructions
      const promptText = result.contents[0].text!;
      
      // And: it should include direct transition instructions
      expect(promptText).toContain('Direct transition');
      
      // And: it should include transition examples
      expect(promptText).toContain('proceed_to_phase({');
      expect(promptText).toContain('target_phase:');
      expect(promptText).toContain('reason:');
    });

    it('should include information about proceed_to_phase tool', async () => {
      // Given: a running vibe-feature-mcp server
      serverContext = await startTestServer();

      // When: I read the system prompt resource
      const result = await serverContext.client.readResource({
        uri: 'prompt://system'
      });

      // Then: the prompt should include comprehensive proceed_to_phase information
      const promptText = result.contents[0].text!;
      
      // And: it should explain when to use proceed_to_phase
      expect(promptText).toContain('proceed_to_phase');
      
      // And: it should list available phases
      expect(promptText).toContain('idle');
      expect(promptText).toContain('requirements');
      expect(promptText).toContain('design');
      expect(promptText).toContain('implementation');
    });
  });
});
