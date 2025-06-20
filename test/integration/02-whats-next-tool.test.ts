/**
 * whats_next Tool Integration Tests
 * 
 * Tests the whats_next tool functionality with real file system integration
 * focusing on component-level testing rather than full server spawning.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine, createTempProjectWithCustomStateMachine, CUSTOM_STATE_MACHINE_YAML } from '../utils/temp-files.js';

// Disable fs mocking for integration tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('whats_next Tool Integration Tests', () => {
  let tempProject: TempProject;

  afterEach(() => {
    if (tempProject) {
      tempProject.cleanup();
    }
  });

  describe('Scenario: Phase transition analysis with real state machine', () => {
    it('should analyze phase transitions using default state machine', async () => {
      // Given: a project with default state machine
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I analyze a phase transition
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'implement user authentication',
        context: 'new feature request',
        conversationSummary: 'User wants to implement authentication'
      });
      
      // Then: it should transition to requirements phase
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toContain('requirements analysis');
      expect(result.transitionReason).toContain('New feature request detected');
      expect(result.isModeled).toBe(true);
    });

    it('should handle continuing in current phase', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I analyze a transition that should continue in current phase
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'requirements',
        userInput: 'I need to clarify the user roles',
        context: 'continuing requirements gathering',
        conversationSummary: 'Still gathering requirements'
      });
      
      // Then: it should continue in requirements phase
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toContain('requirements');
    });
  });

  describe('Scenario: Context analysis drives phase transitions', () => {
    it('should analyze conversation context for appropriate transitions', async () => {
      // Given: a project with state machine
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I provide context indicating readiness for next phase
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'requirements',
        userInput: 'I think we have all the requirements, let\'s design the solution',
        context: 'requirements complete, ready for design',
        conversationSummary: 'Requirements gathering is complete, user wants to move to design'
      });
      
      // Then: it should transition to design phase
      expect(result.newPhase).toBe('design');
      expect(result.instructions).toContain('design');
      expect(result.transitionReason).toContain('design');
    });

    it('should handle different project contexts', async () => {
      // Given: a project with custom state machine
      tempProject = createTempProjectWithCustomStateMachine(CUSTOM_STATE_MACHINE_YAML);
      
      // When: I analyze transitions with custom phases
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'phase1',
        userInput: 'move to next phase',
        context: 'testing custom state machine',
        conversationSummary: 'Using custom state machine with phase1 and phase2'
      });
      
      // Then: it should work with custom phases
      expect(['phase1', 'phase2']).toContain(result.newPhase);
      expect(result.instructions).toBeDefined();
    });
  });

  describe('Scenario: Integration with conversation management', () => {
    it('should integrate with conversation manager', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I use conversation manager with transition engine
      const { ConversationManager } = await import('../../src/conversation-manager.js');
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      
      const conversationManager = new ConversationManager(tempProject.projectPath);
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: they should work together
      const conversationId = conversationManager.getConversationId();
      expect(conversationId).toBeDefined();
      
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'start new feature',
        context: 'integration test',
        conversationSummary: 'Testing integration'
      });
      
      expect(result.newPhase).toBe('requirements');
    });

    it('should handle malformed or missing parameters gracefully', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I provide minimal parameters
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: '',
        context: '',
        conversationSummary: ''
      });
      
      // Then: it should still work with defaults
      expect(result.newPhase).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.transitionReason).toBeDefined();
    });
  });
});
