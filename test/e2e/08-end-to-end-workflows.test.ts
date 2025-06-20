import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { promises as fs } from 'fs';
import path from 'path';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: Complete Development Lifecycle Management', () => {
  describe('Scenario: Complete authentication feature development workflow', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-complete-auth',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should progress through complete authentication workflow', async () => {
      // Phase 1: Initial Request - Requirements Analysis
      const initialResult = await client.callTool('whats_next', {
        user_input: 'I want to implement user authentication',
        context: 'starting new authentication feature'
      });

      const initialResponse = assertToolSuccess(initialResult);
      expect(['idle', 'requirements']).toContain(initialResponse.phase);
      expect(initialResponse).toHaveProperty('plan_file_path');
      expect(initialResponse.instructions).toBeDefined();

      // Verify plan file was created
      const planFilePath = initialResponse.plan_file_path;
      const planExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(planExists).toBe(true);

      // Phase 2: Requirements Gathering
      const reqResult = await client.callTool('whats_next', {
        context: 'gathering authentication requirements',
        conversation_summary: 'User wants to implement authentication. We need to gather requirements about auth type, user data, and security needs.',
        user_input: 'I need email/password auth with optional social login'
      });

      const reqResponse = assertToolSuccess(reqResult);
      expect(reqResponse.instructions.toLowerCase()).toMatch(/(requirement|what|need|auth|security)/);

      // Phase 3: Design Phase Transition
      const designTransitionResult = await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'requirements complete, moving to design'
      });

      const designTransitionResponse = assertToolSuccess(designTransitionResult);
      expect(designTransitionResponse.phase).toBe('design');
      expect(designTransitionResponse.instructions.toLowerCase()).toMatch(/(design|architect|technical|solution)/);

      // Phase 4: Implementation Phase
      const implResult = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'design complete, starting implementation'
      });

      const implResponse = assertToolSuccess(implResult);
      expect(implResponse.phase).toBe('implementation');
      expect(implResponse.instructions.toLowerCase()).toMatch(/(implement|code|build|develop)/);

      // Phase 5: Quality Assurance
      const qaResult = await client.callTool('proceed_to_phase', {
        target_phase: 'qa',
        reason: 'implementation complete, starting QA'
      });

      const qaResponse = assertToolSuccess(qaResult);
      expect(qaResponse.phase).toBe('qa');
      expect(qaResponse.instructions.toLowerCase()).toMatch(/(quality|review|validate|test)/);

      // Phase 6: Testing
      const testResult = await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'QA complete, starting testing'
      });

      const testResponse = assertToolSuccess(testResult);
      expect(testResponse.phase).toBe('testing');
      expect(testResponse.instructions.toLowerCase()).toMatch(/(test|verify|validate|check)/);

      // Phase 7: Completion
      const completeResult = await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'testing complete, feature is done'
      });

      const completeResponse = assertToolSuccess(completeResult);
      expect(completeResponse.phase).toBe('complete');
      expect(completeResponse.instructions.toLowerCase()).toMatch(/(complete|done|finish|deploy)/);

      // Verify plan file still exists and is accessible
      const finalPlanExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(finalPlanExists).toBe(true);
    });

    it('should maintain plan file throughout workflow', async () => {
      // Start workflow
      const result1 = await client.callTool('whats_next', {
        user_input: 'implement authentication system',
        context: 'starting workflow'
      });
      const response1 = assertToolSuccess(result1);
      const planFilePath = response1.plan_file_path;

      // Progress through phases and check plan file persistence
      const phases = ['requirements', 'design', 'implementation', 'qa', 'testing'];
      
      for (const phase of phases) {
        await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `progressing to ${phase} phase`
        });

        // Verify plan file still exists
        const planExists = await fs.access(planFilePath).then(() => true).catch(() => false);
        expect(planExists).toBe(true);

        // Verify plan file is readable
        const content = await fs.readFile(planFilePath, 'utf-8');
        expect(content.length).toBeGreaterThan(100);
        expect(content).toContain('Development Plan');
      }
    });

    it('should provide contextually appropriate instructions for each phase', async () => {
      // Test that each phase provides appropriate instructions
      const phaseInstructions = {
        'requirements': /(requirement|what|need|scope|goal)/,
        'design': /(design|architect|technical|solution|how)/,
        'implementation': /(implement|code|build|develop|write)/,
        'qa': /(quality|review|validate|check|test)/,
        'testing': /(test|verify|validate|execute|run)/,
        'complete': /(complete|done|finish|deploy|wrap)/
      };

      for (const [phase, pattern] of Object.entries(phaseInstructions)) {
        const result = await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `testing ${phase} phase instructions`
        });

        const response = assertToolSuccess(result);
        expect(response.phase).toBe(phase);
        expect(response.instructions.toLowerCase()).toMatch(pattern);
      }
    });
  });

  describe('Scenario: Multi-session workflow continuation', () => {
    let client1: DirectServerInterface;
    let client2: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup1: () => Promise<void>;
    let cleanup2: () => Promise<void>;

    beforeEach(async () => {
      const scenario1 = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-multi-session',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client1 = scenario1.client;
      tempProject = scenario1.tempProject;
      cleanup1 = scenario1.cleanup;
    });

    afterEach(async () => {
      if (cleanup1) await cleanup1();
      if (cleanup2) await cleanup2();
    });

    it('should continue workflow from design phase after session restart', async () => {
      // Given: a development workflow started in one session
      const initialResult = await client1.callTool('whats_next', {
        user_input: 'implement user dashboard',
        context: 'starting dashboard feature'
      });
      const initialResponse = assertToolSuccess(initialResult);
      const planFilePath = initialResponse.plan_file_path;

      // Progress to design phase
      await client1.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design phase'
      });

      // And: the workflow is interrupted at the design phase
      await cleanup1();

      // When: a new session is started later
      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-multi-session',
        tempProjectFactory: () => Promise.resolve(tempProject)
      });
      client2 = scenario2.client;
      cleanup2 = scenario2.cleanup;

      const continuationResult = await client2.callTool('whats_next', {
        context: 'continuing workflow after restart',
        user_input: 'continuing with dashboard development'
      });

      // Then: the workflow should continue appropriately
      const continuationResponse = assertToolSuccess(continuationResult);
      expect(continuationResponse).toHaveProperty('phase');
      expect(continuationResponse).toHaveProperty('instructions');
      
      // And: the plan file should be accessible
      const planExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(planExists).toBe(true);
    });

    it('should preserve context and progress across sessions', async () => {
      // Start workflow and make progress
      await client1.callTool('whats_next', {
        user_input: 'create reporting feature',
        context: 'starting reporting feature'
      });

      await client1.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'jumping to implementation'
      });

      // Restart session
      await cleanup1();
      
      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-multi-session',
        tempProjectFactory: () => Promise.resolve(tempProject)
      });
      client2 = scenario2.client;
      cleanup2 = scenario2.cleanup;

      // Continue workflow
      const result = await client2.callTool('whats_next', {
        context: 'continuing after restart',
        user_input: 'continuing implementation work'
      });

      // Should maintain appropriate context
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      expect(response.instructions).toBeDefined();
    });
  });

  describe('Scenario: Parallel feature development workflows', () => {
    let client1: DirectServerInterface;
    let client2: DirectServerInterface;
    let tempProject1: TempProject;
    let tempProject2: TempProject;
    let cleanup1: () => Promise<void>;
    let cleanup2: () => Promise<void>;

    beforeEach(async () => {
      const scenario1 = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-parallel-1',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client1 = scenario1.client;
      tempProject1 = scenario1.tempProject;
      cleanup1 = scenario1.cleanup;

      const scenario2 = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-parallel-2',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client2 = scenario2.client;
      tempProject2 = scenario2.tempProject;
      cleanup2 = scenario2.cleanup;
    });

    afterEach(async () => {
      if (cleanup1) await cleanup1();
      if (cleanup2) await cleanup2();
    });

    it('should isolate workflows for different features', async () => {
      // Given: multiple feature branches in the same project (simulated with different temp projects)
      // When: different features are developed simultaneously
      const result1 = await client1.callTool('whats_next', {
        user_input: 'implement user authentication',
        context: 'auth feature development'
      });

      const result2 = await client2.callTool('whats_next', {
        user_input: 'implement payment processing',
        context: 'payment feature development'
      });

      // Then: each branch should have isolated workflow state
      const response1 = assertToolSuccess(result1);
      const response2 = assertToolSuccess(result2);

      expect(response1.conversation_id).not.toBe(response2.conversation_id);
      expect(response1.plan_file_path).not.toBe(response2.plan_file_path);

      // And: conversations should not interfere with each other
      await client1.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'auth feature implementation'
      });

      const check2 = await client2.callTool('whats_next', {
        context: 'checking payment feature state',
        user_input: 'what phase are we in?'
      });

      const checkResponse2 = assertToolSuccess(check2);
      // Payment feature should not be affected by auth feature phase change
      expect(['idle', 'requirements']).toContain(checkResponse2.phase);
    });

    it('should manage plan files independently', async () => {
      // Start different workflows
      const result1 = await client1.callTool('whats_next', {
        user_input: 'create admin dashboard',
        context: 'admin feature'
      });

      const result2 = await client2.callTool('whats_next', {
        user_input: 'create user profile',
        context: 'profile feature'
      });

      const response1 = assertToolSuccess(result1);
      const response2 = assertToolSuccess(result2);

      // Plan files should be different
      expect(response1.plan_file_path).not.toBe(response2.plan_file_path);

      // Both plan files should exist and be independent
      const plan1Exists = await fs.access(response1.plan_file_path).then(() => true).catch(() => false);
      const plan2Exists = await fs.access(response2.plan_file_path).then(() => true).catch(() => false);

      expect(plan1Exists).toBe(true);
      expect(plan2Exists).toBe(true);

      // Plan files should have different content
      const content1 = await fs.readFile(response1.plan_file_path, 'utf-8');
      const content2 = await fs.readFile(response2.plan_file_path, 'utf-8');

      expect(content1).not.toBe(content2);
    });
  });

  describe('Scenario: Workflow error recovery and resilience', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-error-recovery',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should recover gracefully from transient errors', async () => {
      // Given: a workflow in progress with multiple completed phases
      const initialResult = await client.callTool('whats_next', {
        user_input: 'implement search feature',
        context: 'starting search feature'
      });
      const initialResponse = assertToolSuccess(initialResult);

      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'progressing to design'
      });

      await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'progressing to implementation'
      });

      // When: potential error conditions occur (simulated by unusual input)
      const errorRecoveryResult = await client.callTool('whats_next', {
        context: 'testing error recovery',
        user_input: 'continue after potential error',
        conversation_summary: 'We were in implementation phase working on search feature'
      });

      // Then: the workflow should recover gracefully
      const recoveryResponse = assertToolSuccess(errorRecoveryResult);
      expect(recoveryResponse).toHaveProperty('phase');
      expect(recoveryResponse).toHaveProperty('instructions');
      
      // And: completed progress should be preserved
      expect(recoveryResponse.phase).toBeDefined();
      expect(recoveryResponse.instructions).toBeDefined();
    });

    it('should maintain plan file consistency after errors', async () => {
      // Start workflow
      const result = await client.callTool('whats_next', {
        user_input: 'implement notification system',
        context: 'starting notifications'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // Progress through phases
      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design'
      });

      // Simulate error recovery scenario
      const recoveryResult = await client.callTool('whats_next', {
        context: 'after error recovery',
        user_input: 'continuing notification development'
      });

      const recoveryResponse = assertToolSuccess(recoveryResult);

      // Plan file should remain consistent
      const planExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(planExists).toBe(true);

      const content = await fs.readFile(planFilePath, 'utf-8');
      expect(content).toContain('Development Plan');
      expect(content.length).toBeGreaterThan(100);
    });
  });

  describe('Scenario: Workflow customization and flexibility', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-customization',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should support non-linear workflow progression', async () => {
      // Given: a standard development workflow
      await client.callTool('whats_next', {
        user_input: 'implement analytics feature',
        context: 'starting analytics'
      });

      // When: users need to customize the workflow for specific needs
      // Then: direct phase jumps should be supported
      const jumpResult = await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'jumping directly to testing phase'
      });

      const jumpResponse = assertToolSuccess(jumpResult);
      expect(jumpResponse.phase).toBe('testing');
      expect(jumpResponse.instructions.toLowerCase()).toMatch(/(test|verify|validate)/);

      // Should be able to go back to earlier phases
      const backResult = await client.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'going back to requirements'
      });

      const backResponse = assertToolSuccess(backResult);
      expect(backResponse.phase).toBe('requirements');
      expect(backResponse.instructions.toLowerCase()).toMatch(/(requirement|what|need)/);
    });

    it('should adapt instructions to customized workflow patterns', async () => {
      // Test workflow adaptation with unusual phase progression
      const phases = ['complete', 'idle', 'implementation', 'design', 'qa'];

      for (const phase of phases) {
        const result = await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `custom workflow step to ${phase}`
        });

        const response = assertToolSuccess(result);
        expect(response.phase).toBe(phase);
        expect(response.instructions).toBeDefined();
        expect(response.instructions.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Scenario: Complex project workflow integration', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-complex-project',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should handle complex project contexts without confusion', async () => {
      // Given: a large project with multiple interconnected features
      const complexContext = `
        Large e-commerce platform with:
        - User authentication (completed)
        - Product catalog (in progress)
        - Shopping cart (planned)
        - Payment processing (in design)
        - Order management (in requirements)
        - Analytics dashboard (not started)
        - Admin panel (in testing)
        Current focus: Shopping cart feature implementation
      `;

      const result = await client.callTool('whats_next', {
        context: 'complex project workflow',
        conversation_summary: complexContext,
        user_input: 'working on shopping cart feature'
      });

      // Then: workflow management should handle project complexity
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      
      // And: feature-specific workflows should remain focused
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(20);
    });

    it('should maintain workflow focus within larger projects', async () => {
      // Test that workflow instructions remain focused despite project complexity
      const result = await client.callTool('whats_next', {
        context: 'large project context',
        conversation_summary: 'Working on a complex system with many features. Currently focused on implementing the notification system.',
        user_input: 'continuing with notification system development'
      });

      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      
      // Instructions should remain focused and actionable
      expect(response.instructions).toBeDefined();
      expect(typeof response.instructions).toBe('string');
      expect(response.instructions.length).toBeGreaterThan(30);
    });
  });

  describe('Scenario: Workflow completion and archival', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-completion',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should mark workflow as complete when feature is finished', async () => {
      // Given: a completed development workflow
      await client.callTool('whats_next', {
        user_input: 'implement file upload feature',
        context: 'starting file upload feature'
      });

      // When: the feature is fully implemented and deployed
      const completeResult = await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'feature is fully implemented and deployed'
      });

      // Then: the workflow should be marked as complete
      const completeResponse = assertToolSuccess(completeResult);
      expect(completeResponse.phase).toBe('complete');
      expect(completeResponse.instructions.toLowerCase()).toMatch(/(complete|done|finish|deploy)/);
    });

    it('should preserve workflow artifacts for reference', async () => {
      // Start and complete a workflow
      const startResult = await client.callTool('whats_next', {
        user_input: 'create backup system',
        context: 'backup feature development'
      });
      const startResponse = assertToolSuccess(startResult);
      const planFilePath = startResponse.plan_file_path;

      await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'backup system completed'
      });

      // Workflow artifacts should be preserved
      const planExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(planExists).toBe(true);

      const content = await fs.readFile(planFilePath, 'utf-8');
      expect(content).toContain('Development Plan');
      expect(content.length).toBeGreaterThan(100);
    });

    it('should maintain completion status persistently', async () => {
      // Complete a workflow
      await client.callTool('proceed_to_phase', {
        target_phase: 'complete',
        reason: 'feature completed'
      });

      // Check that completion status is maintained
      const statusResult = await client.callTool('whats_next', {
        context: 'checking completion status',
        user_input: 'what is the current status?'
      });

      const statusResponse = assertToolSuccess(statusResult);
      expect(statusResponse.phase).toBe('complete');
    });
  });

  describe('Scenario: Workflow analytics and insights', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'workflow-analytics',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should provide structured workflow data', async () => {
      // Given: multiple workflow interactions
      await client.callTool('whats_next', {
        user_input: 'implement logging system',
        context: 'logging feature'
      });

      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'moving to design'
      });

      await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'moving to implementation'
      });

      // When: analyzing workflow data
      const stateResource = await client.readResource('state://current');

      // Then: workflow data should be structured for analysis
      expect(stateResource).toBeDefined();
      expect(stateResource.contents).toBeDefined();
      expect(stateResource.contents.length).toBeGreaterThan(0);

      const stateData = JSON.parse(stateResource.contents[0].text);
      expect(stateData).toHaveProperty('conversationId'); // camelCase, not snake_case
      expect(stateData).toHaveProperty('currentPhase');
      expect(stateData).toHaveProperty('projectPath');
    });

    it('should track phase transitions', async () => {
      // Create workflow with multiple phase transitions
      const phases = ['requirements', 'design', 'implementation', 'qa'];
      
      for (const phase of phases) {
        const result = await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `transitioning to ${phase} for analytics`
        });

        const response = assertToolSuccess(result);
        expect(response.phase).toBe(phase);
        expect(response).toHaveProperty('transition_reason');
      }

      // Verify final state
      const finalResult = await client.callTool('whats_next', {
        context: 'checking final workflow state',
        user_input: 'what is our current phase?'
      });

      const finalResponse = assertToolSuccess(finalResult);
      expect(finalResponse.phase).toBe('qa');
    });

    it('should maintain workflow history', async () => {
      // Create a workflow with history
      await client.callTool('whats_next', {
        user_input: 'implement caching system',
        context: 'caching feature development'
      });

      const phases = ['design', 'implementation', 'testing', 'complete'];
      
      for (const phase of phases) {
        await client.callTool('proceed_to_phase', {
          target_phase: phase,
          reason: `workflow progression to ${phase}`
        });
      }

      // Verify workflow completion
      const finalCheck = await client.callTool('whats_next', {
        context: 'final workflow check',
        user_input: 'is the workflow complete?'
      });

      const finalResponse = assertToolSuccess(finalCheck);
      expect(finalResponse.phase).toBe('complete');
    });
  });
});
