/**
 * Test for reset functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResponsibleVibeMCPServer } from '../src/server.js';
import { TempProject } from './utils/temp-files.js';
import { ServerTestHelper, MockDocsHelper } from './utils/test-helpers.js';

describe('Reset Functionality', () => {
  let server: ResponsibleVibeMCPServer;
  let tempProject: TempProject;

  beforeEach(async () => {
    tempProject = new TempProject({ projectName: 'reset-test' });
    MockDocsHelper.addToTempProject(tempProject);

    server = await ServerTestHelper.createServer(tempProject.projectPath);
  });

  afterEach(async () => {
    await ServerTestHelper.cleanupServer(server);
    tempProject.cleanup();
  });

  it('should require confirmation to reset', async () => {
    // Try to reset without confirmation
    try {
      await server.handleResetDevelopment({ confirm: false });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain(
        'Reset operation requires explicit confirmation'
      );
    }
  });

  it('should successfully reset with confirmation', async () => {
    // First, initialize development with a workflow
    await server.handleStartDevelopment({
      workflow: 'waterfall',
    });

    // Then create some state by calling whats_next
    await server.handleWhatsNext({
      context: 'test context',
      user_input: 'test input',
    });

    // Now reset with confirmation
    const result = await server.handleResetDevelopment({
      confirm: true,
      reason: 'test reset',
    });

    expect(result.success).toBe(true);
    expect(result.resetItems).toContain('interaction_logs');
    expect(result.resetItems).toContain('conversation_state');
    expect(result.resetItems).toContain('plan_file');
    expect(result.message).toContain('Successfully reset conversation');
    expect(result.message).toContain('test reset');
  });

  it('should validate confirm parameter type', async () => {
    try {
      await server.handleResetDevelopment({ confirm: 'true' }); // string instead of boolean
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain('confirm parameter must be a boolean');
    }
  });
});
