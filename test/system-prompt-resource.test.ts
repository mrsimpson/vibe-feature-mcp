/**
 * System Prompt Resource Tests
 *
 * Tests for the system-prompt resource handler to ensure it properly
 * exposes the system prompt through the MCP protocol.
 */

import { describe, it, expect } from 'vitest';
import { SystemPromptResourceHandler } from '../src/server/resource-handlers/system-prompt.js';
import type { ServerContext } from '../src/server/types.js';

describe('System Prompt Resource', () => {
  it('should expose system prompt as MCP resource', async () => {
    const handler = new SystemPromptResourceHandler();

    // Call the handler directly
    const result = await handler.handle(
      new URL('system-prompt://'),
      {} as ServerContext
    );

    // Verify the safeExecute wrapper structure
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data;
    expect(data.uri).toBe('system-prompt://');
    expect(data.mimeType).toBe('text/plain');
    expect(data.text).toBeDefined();
    expect(typeof data.text).toBe('string');

    // Verify content contains expected system prompt elements
    expect(data.text).toContain(
      'You are an AI assistant that helps users develop software features'
    );
    expect(data.text).toContain('responsible-vibe-mcp');
    expect(data.text).toContain('whats_next()');
    expect(data.text).toContain('proceed_to_phase({');
    expect(data.text).toContain('Core Workflow');

    // Verify it's a substantial prompt (not empty or truncated)
    expect(data.text.length).toBeGreaterThan(1000);
  });

  it('should be workflow-independent and consistent', async () => {
    const handler = new SystemPromptResourceHandler();

    // Get system prompt multiple times
    const result1 = await handler.handle(
      new URL('system-prompt://'),
      {} as ServerContext
    );
    const result2 = await handler.handle(
      new URL('system-prompt://'),
      {} as ServerContext
    );
    const result3 = await handler.handle(
      new URL('system-prompt://'),
      {} as ServerContext
    );

    // All should be successful
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result3.success).toBe(true);

    // All should be identical
    expect(result1.data.text).toBe(result2.data.text);
    expect(result2.data.text).toBe(result3.data.text);

    // Verify the prompt contains standard elements
    expect(result1.data.text).toContain('You are an AI assistant');
    expect(result1.data.text).toContain('whats_next()');
    expect(result1.data.text).toContain('Development Workflow');
    expect(result1.data.text).toContain('start_development()');
  });

  it('should use default waterfall workflow for system prompt', async () => {
    const handler = new SystemPromptResourceHandler();

    const result = await handler.handle(
      new URL('system-prompt://'),
      {} as ServerContext
    );

    expect(result.success).toBe(true);

    // The system prompt should be generated using the default workflow
    // and should contain workflow-agnostic instructions
    expect(result.data.text).toContain(
      'The responsible-vibe-mcp server will guide you through development phases'
    );
    expect(result.data.text).toContain(
      'available phases and their descriptions will be provided'
    );
    expect(result.data.text).toContain(
      'tool responses from start_development() and resume_workflow()'
    );
  });
});
