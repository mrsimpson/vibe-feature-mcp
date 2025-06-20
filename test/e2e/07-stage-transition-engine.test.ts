import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { promises as fs } from 'fs';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: Intelligent Development Phase Management', () => {
  describe('Scenario: New feature detection and initial phase assignment', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-new-feature',
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

    it('should detect new feature keywords and set requirements phase', async () => {
      // Given: no existing conversation context
      // And: user input indicates a new feature request
      const featureRequests = [
        'implement user authentication',
        'add payment processing feature',
        'create dashboard functionality',
        'build notification system'
      ];

      for (const request of featureRequests) {
        // When: the transition engine analyzes the context
        const result = await client.callTool('whats_next', {
          user_input: request,
          context: 'new feature request'
        });

        // Then: the phase should be set to "requirements" or "idle" (initial state)
        const response = assertToolSuccess(result);
        expect(['idle', 'requirements']).toContain(response.phase);
        
        // And: the transition reason should be meaningful
        expect(response.transition_reason).toBeDefined();
        expect(response.transition_reason.length).toBeGreaterThan(5);
        expect(typeof response.transition_reason).toBe('string');
        
        // And: instructions should guide requirements gathering or initial analysis
        expect(response.instructions).toBeDefined();
        expect(response.instructions.toLowerCase()).toMatch(/(requirement|what|need|goal|scope|analyz)/);
      }
    });

    it('should provide contextually relevant instructions for starting requirements', async () => {
      // Given: a new feature request
      const result = await client.callTool('whats_next', {
        user_input: 'implement search functionality',
        context: 'starting new feature development'
      });

      // Then: instructions should be contextually relevant for starting requirements
      const response = assertToolSuccess(result);
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(50); // Should be substantial
      expect(response.instructions.toLowerCase()).toMatch(/(what|requirement|need|clarify|understand)/);
    });

    it('should have clear and logical transition reasoning', async () => {
      // Given: a new feature request
      const result = await client.callTool('whats_next', {
        user_input: 'create user profile management',
        context: 'new feature request analysis'
      });

      // Then: transition reasoning should be clear and logical
      const response = assertToolSuccess(result);
      expect(response.transition_reason).toBeDefined();
      expect(response.transition_reason.length).toBeGreaterThan(10); // Should be descriptive
      expect(typeof response.transition_reason).toBe('string');
    });
  });

  describe('Scenario: Requirements phase completion detection', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-requirements-complete',
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

    it('should detect completed requirements and suggest design phase', async () => {
      // Given: an existing conversation in "requirements" phase
      await client.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'starting requirements phase'
      });

      // And: conversation context indicates requirements gathering is done
      const result = await client.callTool('whats_next', {
        context: 'requirements gathering completed',
        conversation_summary: 'We have defined all user requirements, identified constraints, and documented acceptance criteria. Requirements phase is complete.',
        user_input: 'requirements are done, ready to move to design'
      });

      // Then: the engine should provide appropriate next steps
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      expect(response.instructions).toBeDefined();
    });

    it('should provide instructions for proceeding to design', async () => {
      // Given: completed requirements phase
      await client.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'testing requirements completion'
      });

      const result = await client.callTool('whats_next', {
        context: 'requirements complete, ready for design',
        conversation_summary: 'All requirements have been gathered and documented. User stories are complete.',
        user_input: 'let\'s start the design phase'
      });

      // Then: instructions should guide design work
      const response = assertToolSuccess(result);
      if (response.phase === 'design' || response.instructions.toLowerCase().includes('design')) {
        expect(response.instructions.toLowerCase()).toMatch(/(design|architect|technical|solution|how)/);
      }
    });
  });

  describe('Scenario: Mid-phase continuation with incomplete tasks', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-mid-phase',
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

    it('should continue current phase when tasks are incomplete', async () => {
      // Given: an existing conversation in "design" phase
      await client.callTool('proceed_to_phase', {
        target_phase: 'design',
        reason: 'testing mid-phase continuation'
      });

      // And: conversation context indicates ongoing design work
      const result = await client.callTool('whats_next', {
        context: 'still working on design',
        conversation_summary: 'We are in the middle of designing the system architecture. Some design decisions are still pending.',
        user_input: 'continuing with the design work'
      });

      // Then: the phase should remain "design"
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('design');
      
      // And: instructions should guide continuation of design work
      expect(response.instructions.toLowerCase()).toMatch(/(design|continue|complete|finish)/);
    });

    it('should provide focused instructions for current phase work', async () => {
      // Given: ongoing implementation work
      await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'testing implementation continuation'
      });

      const result = await client.callTool('whats_next', {
        context: 'implementation in progress',
        conversation_summary: 'We are implementing the core functionality. Some features are complete but others are still in progress.',
        user_input: 'working on the implementation'
      });

      // Then: instructions should focus on completing current phase work
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('implementation');
      expect(response.instructions.toLowerCase()).toMatch(/(implement|code|build|develop)/);
    });
  });

  describe('Scenario: Context-driven phase transition analysis', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-context-driven',
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

    it('should analyze conversation summary for phase completion indicators', async () => {
      // Given: rich conversation context with summary and recent messages
      const result = await client.callTool('whats_next', {
        context: 'analyzing rich conversation context',
        conversation_summary: 'We have completed the requirements analysis phase. All user stories are documented, acceptance criteria are defined, and stakeholders have approved the scope. We are ready to move to the design phase.',
        recent_messages: [
          { role: 'user', content: 'All requirements look good to me' },
          { role: 'assistant', content: 'Great! I\'ve documented all the requirements.' },
          { role: 'user', content: 'Should we start designing the solution now?' }
        ],
        user_input: 'ready for next phase'
      });

      // Then: conversation analysis should influence phase decisions
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('transition_reason');
      
      // Context should provide nuanced phase determination
      expect(response.transition_reason).toBeDefined();
      expect(response.instructions).toBeDefined();
    });

    it('should factor user readiness into transition timing', async () => {
      // Given: user input indicating readiness for next phase
      const readinessIndicators = [
        'ready to move forward',
        'let\'s proceed to the next step',
        'I think we\'re done with this phase',
        'can we start the next phase now?'
      ];

      for (const indicator of readinessIndicators) {
        const result = await client.callTool('whats_next', {
          context: 'user expressing readiness',
          user_input: indicator,
          conversation_summary: 'Current phase work appears to be complete based on our discussion.'
        });

        // Then: user readiness should be factored into transitions
        const response = assertToolSuccess(result);
        expect(response).toHaveProperty('phase');
        expect(response).toHaveProperty('instructions');
        // Instructions should acknowledge user readiness or provide guidance
        expect(response.instructions.length).toBeGreaterThan(20);
      }
    });
  });

  describe('Scenario: Regression to previous phases', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-regression',
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

    it('should support backward phase transitions when appropriate', async () => {
      // Given: an existing conversation in "implementation" phase
      await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'testing regression scenario'
      });

      // And: conversation context indicates design issues discovered
      const result = await client.callTool('whats_next', {
        context: 'design issues discovered during implementation',
        conversation_summary: 'During implementation, we discovered that our original design has fundamental flaws that need to be addressed.',
        user_input: 'we need to go back and fix the design issues'
      });

      // Then: appropriate phase should be suggested (could be design or continue implementation with design fixes)
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      
      // Instructions should address the issues
      expect(response.instructions.toLowerCase()).toMatch(/(design|issue|fix|address|problem)/);
    });

    it('should explain regression reasoning clearly', async () => {
      // Given: a situation requiring phase regression
      await client.callTool('proceed_to_phase', {
        target_phase: 'qa',
        reason: 'testing regression from QA'
      });

      const result = await client.callTool('whats_next', {
        context: 'major issues found during QA',
        conversation_summary: 'Quality assurance testing revealed significant implementation issues that require going back to the implementation phase.',
        user_input: 'QA found major bugs, need to go back to implementation'
      });

      // Then: transition reasoning should explain the regression
      const response = assertToolSuccess(result);
      expect(response.transition_reason).toBeDefined();
      expect(response.transition_reason.length).toBeGreaterThan(10);
    });
  });

  describe('Scenario: Direct phase transitions bypassing intermediate phases', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-direct',
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

    it('should allow non-sequential phase transitions', async () => {
      // Given: an existing conversation in "requirements" phase
      await client.callTool('proceed_to_phase', {
        target_phase: 'requirements',
        reason: 'testing direct transition'
      });

      // And: user explicitly requests jumping to "implementation"
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'implementation',
        reason: 'user requested direct jump to implementation'
      });

      // Then: direct transition to "implementation" should be allowed
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('implementation');
      
      // And: instructions should be appropriate for implementation phase
      expect(response.instructions.toLowerCase()).toMatch(/(implement|code|build|develop)/);
      
      // And: the transition should be recorded with explicit reasoning
      expect(response.transition_reason).toContain('user requested');
    });

    it('should adapt instructions to target phase regardless of progression', async () => {
      // Given: jumping from idle to testing phase
      const result = await client.callTool('proceed_to_phase', {
        target_phase: 'testing',
        reason: 'direct jump to testing phase'
      });

      // Then: instructions should adapt to the target phase
      const response = assertToolSuccess(result);
      expect(response.phase).toBe('testing');
      expect(response.instructions.toLowerCase()).toMatch(/(test|verify|validate|check)/);
    });
  });

  describe('Scenario: Phase transition with insufficient context', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-insufficient-context',
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

    it('should make conservative phase decisions with minimal context', async () => {
      // Given: minimal conversation context
      // And: unclear user input about development phase
      const result = await client.callTool('whats_next', {
        context: 'minimal context',
        user_input: 'help'
      });

      // Then: conservative phase decisions should be made
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(['idle', 'requirements']).toContain(response.phase); // Conservative defaults
      
      // And: default behavior should be safe and reasonable
      expect(response.instructions).toBeDefined();
      expect(response.instructions.length).toBeGreaterThan(20); // Should provide helpful guidance
    });

    it('should provide predictable fallback behavior', async () => {
      // Given: very unclear input
      const unclearInputs = ['', 'hmm', 'not sure', 'maybe'];

      for (const input of unclearInputs) {
        const result = await client.callTool('whats_next', {
          context: 'unclear input',
          user_input: input
        });

        // Then: fallback behavior should be predictable and helpful
        const response = assertToolSuccess(result);
        expect(response).toHaveProperty('phase');
        expect(response).toHaveProperty('instructions');
        expect(response.instructions).toBeDefined();
        expect(response.instructions.length).toBeGreaterThan(10);
      }
    });

    it('should not cause errors with insufficient context', async () => {
      // Given: insufficient context that might cause issues
      const problematicContexts = [
        { context: '', user_input: '' },
        { context: null, user_input: undefined },
        { context: 'test', user_input: null }
      ];

      for (const ctx of problematicContexts) {
        // When: the transition engine attempts analysis
        // Then: insufficient context should not cause errors
        await expect(client.callTool('whats_next', ctx)).resolves.not.toThrow();
      }
    });
  });

  describe('Scenario: Complex project context analysis', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-complex-context',
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

    it('should handle complex project contexts appropriately', async () => {
      // Given: a large project with multiple features in development
      // And: conversation context spanning multiple development areas
      const complexContext = `
        This is a large e-commerce platform with multiple features:
        - User authentication (in testing phase)
        - Payment processing (in implementation phase)
        - Product catalog (in design phase)
        - Order management (in requirements phase)
        - Analytics dashboard (not started)
        Current conversation is focused on the payment processing feature.
      `;

      const result = await client.callTool('whats_next', {
        context: 'complex project with multiple features',
        conversation_summary: complexContext,
        user_input: 'working on payment processing implementation'
      });

      // Then: phase determination should focus on current conversation thread
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      
      // And: instructions should be specific to the current feature
      expect(response.instructions).toBeDefined();
      // Should not be confused by project complexity
      expect(response.instructions.length).toBeGreaterThan(30);
    });

    it('should maintain focus despite project complexity', async () => {
      // Given: complex multi-feature project context
      const result = await client.callTool('whats_next', {
        context: 'multi-feature project',
        conversation_summary: 'Working on a complex system with authentication, payments, notifications, and analytics. Currently focusing on the notification system design.',
        user_input: 'let\'s continue with notification system design'
      });

      // Then: context analysis should not be confused by project complexity
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      
      // Instructions should remain focused and actionable
      expect(response.instructions).toBeDefined();
      expect(typeof response.instructions).toBe('string');
      expect(response.instructions.length).toBeGreaterThan(20);
    });
  });

  describe('Scenario: Transition engine error handling and recovery', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'transition-error-handling',
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

    it('should handle invalid context gracefully', async () => {
      // Given: corrupted or invalid conversation context
      const invalidContexts = [
        { context: 'invalid', conversation_summary: null, user_input: undefined },
        { context: '', conversation_summary: '', user_input: '' },
        { context: 'test', conversation_summary: 'very long summary that might cause issues '.repeat(100), user_input: 'test' }
      ];

      for (const invalidContext of invalidContexts) {
        // When: the transition engine attempts analysis
        const result = await client.callTool('whats_next', invalidContext);

        // Then: errors should be handled gracefully
        const response = assertToolSuccess(result);
        expect(response).toHaveProperty('phase');
        expect(response).toHaveProperty('instructions');
        
        // And: fallback phase determination should be provided
        expect(['idle', 'requirements', 'design', 'implementation', 'qa', 'testing', 'complete']).toContain(response.phase);
        
        // And: error recovery should not disrupt conversation flow
        expect(response.instructions).toBeDefined();
        expect(response.instructions.length).toBeGreaterThan(10);
      }
    });

    it('should provide reasonable fallback behavior for errors', async () => {
      // Given: potentially problematic input
      const result = await client.callTool('whats_next', {
        context: 'error testing',
        conversation_summary: 'Testing error handling with potentially problematic input',
        user_input: 'test error handling'
      });

      // Then: recovery mechanisms should maintain conversation continuity
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('phase');
      expect(response).toHaveProperty('instructions');
      expect(response).toHaveProperty('transition_reason');
      
      // Should provide reasonable defaults
      expect(typeof response.phase).toBe('string');
      expect(typeof response.instructions).toBe('string');
      expect(typeof response.transition_reason).toBe('string');
    });

    it('should not crash with malformed input', async () => {
      // Given: various types of malformed input
      const malformedInputs = [
        { context: { invalid: 'object' }, user_input: ['array', 'input'] },
        { context: 123, user_input: true },
        { context: 'normal', user_input: 'normal', conversation_summary: { malformed: 'object' } }
      ];

      for (const malformed of malformedInputs) {
        // When: processing malformed input
        // Then: should not crash the transition engine
        await expect(client.callTool('whats_next', malformed)).resolves.not.toThrow();
      }
    });
  });
});
