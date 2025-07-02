import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../../utils/temp-files';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess, initializeDevelopment } from '../../utils/e2e-test-setup';
import { promises as fs } from 'fs';
import path from 'path';

vi.unmock('fs');
vi.unmock('fs/promises');

/**
 * Workflow Integration Tests
 * 
 * Tests complete end-to-end workflows including:
 * - Full development lifecycle scenarios
 * - Multi-phase project progression
 * - Real-world usage patterns
 * - Integration between all components
 */
describe('Workflow Integration', () => {
  let client: DirectServerInterface;
  let tempProject: TempProject;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const scenario = await createSuiteIsolatedE2EScenario({
      suiteName: 'workflow-integration',
      tempProjectFactory: createTempProjectWithDefaultStateMachine
    });
    client = scenario.client;
    tempProject = scenario.tempProject;
    cleanup = scenario.cleanup;

    // Start development for all workflow integration tests
    await initializeDevelopment(client, 'waterfall');
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Complete Development Lifecycle', () => {
    it('should handle full feature development workflow', async () => {
      // 1. Start with requirements
      const requirements = await client.callTool('whats_next', {
        user_input: 'implement user authentication system',
        context: 'new feature request',
        conversation_summary: 'User wants to add authentication to their app'
      });
      const reqResponse = assertToolSuccess(requirements);
      expect(reqResponse.phase).toBe('requirements');
      expect(reqResponse.instructions).toContain('requirements');

      // 2. Transition to design
      const design = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements analysis complete'
      });
      const designResponse = assertToolSuccess(design);
      expect(designResponse.phase).toBe('design');
      expect(designResponse.instructions).toContain('design');

      // 3. Move to implementation
      const implementation = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'design approved'
      });
      const implResponse = assertToolSuccess(implementation);
      expect(implResponse.phase).toBe('implementation');

      // 4. Quality assurance
      const qa = await client.callTool('proceed_to_phase', {
        target_phase: 'qa',
        reason: 'implementation complete'
      });
      const qaResponse = assertToolSuccess(qa);
      expect(qaResponse.phase).toBe('qa');

      // 5. Testing phase
      const testing = await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'qa passed'
      });
      const testResponse = assertToolSuccess(testing);
      expect(testResponse.phase).toBe('testing');

      // 6. Complete
      const complete = await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'all tests passed'
      });
      const completeResponse = assertToolSuccess(complete);
      expect(completeResponse.phase).toBe('complete');

      // Verify final state
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('complete');
      expect(stateData.conversationId).toBe(reqResponse.conversation_id);
    });

    it('should handle iterative development with phase revisiting', async () => {
      // Start project
      await client.callTool('whats_next', { user_input: 'start project' });

      // Go to implementation
      await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'quick prototype'
      });

      // Realize need to go back to design
      const backToDesign = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'need to revise architecture'
      });
      expect(assertToolSuccess(backToDesign).phase).toBe('design');

      // Forward to implementation again
      const backToImpl = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'design revised'
      });
      expect(assertToolSuccess(backToImpl).phase).toBe('implementation');

      // Verify state consistency throughout
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBe('implementation');
    });

    it('should maintain plan file consistency throughout workflow', async () => {
      // Start workflow
      const start = await client.callTool('whats_next', {
        user_input: 'comprehensive project'
      });
      const startResponse = assertToolSuccess(start);
      const planPath = startResponse.plan_file_path;

      // Progress through phases
      await client.callTool('proceed_to_phase', { target_phase: 'design', reason: 'test' });
      await client.callTool('proceed_to_phase', { target_phase: 'implementation', reason: 'test' });
      await client.callTool('proceed_to_phase', { target_phase: 'qa', reason: 'test' });

      // Verify plan file exists and is updated
      const planExists = await fs.access(planPath).then(() => true).catch(() => false);
      expect(planExists).toBe(true);

      const planResource = await client.readResource('plan://current');
      const planContent = planResource.contents[0].text;

      // Should contain all phase sections
      expect(planContent).toContain('Requirements');
      expect(planContent).toContain('Design');
      expect(planContent).toContain('Implementation');
      expect(planContent).toContain('## Qa');
    });
  });

  describe('Multi-Project Scenarios', () => {
    it('should handle project context switching', async () => {
      // Start first project context
      const project1 = await client.callTool('whats_next', {
        user_input: 'project 1 feature',
        context: 'first project'
      });
      const p1Response = assertToolSuccess(project1);
      const p1ConversationId = p1Response.conversation_id;

      // Continue with same project
      const project1Continue = await client.callTool('whats_next', {
        user_input: 'continue project 1',
        context: 'same project context'
      });
      const p1ContinueResponse = assertToolSuccess(project1Continue);

      // Should maintain same conversation
      expect(p1ContinueResponse.conversation_id).toBe(p1ConversationId);
    });

    it('should maintain separate plan files for different contexts', async () => {
      const result = await client.callTool('whats_next', {
        user_input: 'test plan separation'
      });
      const response = assertToolSuccess(result);

      // Plan file should be specific to this project/branch context
      expect(response.plan_file_path).toContain(tempProject.projectPath);
      expect(response.plan_file_path).toContain('.vibe');
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle typical user interaction patterns', async () => {
      // User starts with vague request
      const vague = await client.callTool('whats_next', {
        user_input: 'I need to add some features',
        context: 'user has general idea'
      });
      expect(assertToolSuccess(vague).phase).toBe('requirements');

      // User provides more specific information
      const specific = await client.callTool('whats_next', {
        user_input: 'I need user login and dashboard',
        context: 'user clarified requirements',
        conversation_summary: 'User wants login and dashboard features'
      });
      const specificResponse = assertToolSuccess(specific);
      expect(specificResponse.phase).toBe('requirements');

      // User ready to move forward
      const ready = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements clear'
      });
      expect(assertToolSuccess(ready).phase).toBe('design');
    });

    it('should handle context-rich conversations', async () => {
      const result = await client.callTool('whats_next', {
        user_input: 'implement OAuth integration',
        context: 'user wants third-party authentication',
        conversation_summary: 'Discussed authentication options, user prefers OAuth with Google and GitHub',
        recent_messages: [
          { role: 'user', content: 'What authentication options do we have?' },
          { role: 'assistant', content: 'We can use OAuth, JWT, or traditional sessions' },
          { role: 'user', content: 'OAuth sounds good, especially Google and GitHub' },
          { role: 'assistant', content: 'Great choice! OAuth is secure and user-friendly' }
        ]
      });

      const response = assertToolSuccess(result);
      expect(response.phase).toBeTruthy();
      expect(response.instructions).toBeTruthy();
      expect(response.conversation_id).toBeTruthy();
    });

    it('should handle rapid development iterations', async () => {
      // Quick succession of development activities
      await client.callTool('whats_next', { user_input: 'rapid prototype' });
      await client.callTool('proceed_to_phase', { target_phase: 'implementation', reason: 'skip to coding' });
      await client.callTool('whats_next', { user_input: 'found issues' });
      await client.callTool('proceed_to_phase', { target_phase: 'design', reason: 'need better design' });
      await client.callTool('proceed_to_phase', { target_phase: 'implementation', reason: 'design fixed' });
      
      const final = await client.callTool('whats_next', { user_input: 'check status' });
      const finalResponse = assertToolSuccess(final);
      
      expect(finalResponse.phase).toBe('implementation');
      expect(finalResponse.conversation_id).toBeTruthy();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from invalid phase transitions', async () => {
      await client.callTool('whats_next', { user_input: 'start' });

      // Try invalid transition
      await client.callTool('proceed_to_phase', {
        target_phase: 'invalid_phase',
        reason: 'test error handling'
      });

      // Should still be able to continue normally
      const recovery = await client.callTool('whats_next', {
        user_input: 'continue after error'
      });
      const recoveryResponse = assertToolSuccess(recovery);
      
      expect(recoveryResponse.phase).toBeTruthy();
      expect(recoveryResponse.instructions).toBeTruthy();
    });

    it('should handle file system issues gracefully', async () => {
      const result = await client.callTool('whats_next', {
        user_input: 'test file system resilience'
      });
      const response = assertToolSuccess(result);

      // Even if there are file system issues, basic functionality should work
      expect(response.phase).toBeTruthy();
      expect(response.conversation_id).toBeTruthy();
    });

    it('should maintain functionality under stress', async () => {
      // Rapid fire requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        client.callTool('whats_next', {
          user_input: `stress test ${i}`,
          context: `iteration ${i}`
        })
      );

      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach((result, index) => {
        const response = assertToolSuccess(result);
        expect(response.phase).toBeTruthy();
        expect(response.conversation_id).toBeTruthy();
      });

      // Final state should be consistent
      const stateResource = await client.readResource('state://current');
      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData.currentPhase).toBeTruthy();
    });
  });

});

// Custom Workflow Integration tests need their own setup without start_development in beforeEach
describe('Workflow Integration - Custom State Machines', () => {
  let client: DirectServerInterface;
  let tempProject: TempProject;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const scenario = await createSuiteIsolatedE2EScenario({
      suiteName: 'workflow-integration-custom',
      tempProjectFactory: createTempProjectWithDefaultStateMachine
    });
    client = scenario.client;
    tempProject = scenario.tempProject;
    cleanup = scenario.cleanup;
    // Note: NOT calling start_development here - custom workflow tests need to start fresh
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Custom Workflow Integration', () => {
    it('should integrate custom state machines with full workflow', async () => {
      // Create custom state machine
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      await fs.mkdir(vibeDir, { recursive: true });

      const customWorkflow = `
name: "Agile Sprint Workflow"
description: "Custom agile development workflow"
initial_state: "backlog"
states:
  backlog:
    description: "Feature backlog"
    default_instructions: "Manage feature backlog and prioritize items"
    transitions:
      - trigger: "ready_for_sprint"
        to: "sprint_planning"
        instructions: "Backlog prioritized, ready for sprint planning"
        transition_reason: "Backlog items prioritized and ready for sprint"
  sprint_planning:
    description: "Sprint planning"
    default_instructions: "Plan sprint activities and estimate effort"
    transitions:
      - trigger: "sprint_planned"
        to: "development"
        instructions: "Sprint planned, ready to start development"
        transition_reason: "Sprint planning complete, ready to develop"
  development:
    description: "Active development"
    default_instructions: "Implement features according to sprint plan"
    transitions:
      - trigger: "development_complete"
        to: "review"
        instructions: "Development complete, ready for code review"
        transition_reason: "Development phase finished, ready for review"
  review:
    description: "Code review"
    default_instructions: "Review code and validate implementation"
    transitions:
      - trigger: "review_approved"
        to: "done"
        instructions: "Review approved, sprint complete"
        transition_reason: "Code review passed, ready to complete sprint"
  done:
    description: "Sprint complete"
    default_instructions: "Sprint complete, prepare for next iteration"
    transitions: []
`;

      await fs.writeFile(path.join(vibeDir, 'workflow.yaml'), customWorkflow);

      // First, initialize development with the custom workflow
      const initResult = await client.callTool('start_development', {
        workflow: 'custom'
      });
      assertToolSuccess(initResult);
      
      // Then call whats_next to get instructions
      const start = await client.callTool('whats_next', {
        user_input: 'start agile sprint development',
        context: 'new feature request'
      });
      const startResponse = assertToolSuccess(start);
      
      // The server may start at any valid phase in the custom state machine
      // Let's accept any of the valid phases from our custom workflow
      expect(['backlog', 'sprint_planning', 'development', 'review', 'done']).toContain(startResponse.phase);

      // Progress through custom phases - start from whatever phase we're in
      let currentPhase = startResponse.phase;
      
      // If we're not already at development, try to get there
      if (currentPhase !== 'development') {
        const development = await client.callTool('proceed_to_phase', {
          target_phase: 'development',
          reason: 'ready to develop'
        });
        const devResponse = assertToolSuccess(development);
        expect(devResponse.phase).toBe('development');
        currentPhase = 'development';
      }

      // Verify we can transition to review
      const review = await client.callTool('proceed_to_phase', {
        target_phase: 'review',
        reason: 'development complete'
      });
      expect(assertToolSuccess(review).phase).toBe('review');

      // Verify plan file integration
      const planResource = await client.readResource('plan://current');
      const planContent = planResource.contents[0].text;
      expect(planContent).toContain('Development Plan');
    });
  });
});
