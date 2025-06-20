/**
 * Server Initialization Integration Tests
 * 
 * Tests server startup, database initialization, and component integration
 * using real temporary files for realistic testing scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startTestServer, ServerTestContext } from '../utils/test-setup.js';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';

// Disable fs mocking for integration tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Server Initialization Integration Tests', () => {
  let serverContext: ServerTestContext;
  let tempProject: TempProject;

  // Clean up after each test
  afterEach(async () => {
    // Clean up client and server
    if (serverContext) {
      await serverContext.cleanup();
    }
    if (tempProject) {
      tempProject.cleanup();
    }
  });

  describe('Scenario: Component initialization with real files', () => {
    it('should initialize components with default state machine', async () => {
      // Given: a project with default state machine setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I initialize the core components
      const { ConversationManager } = await import('../../src/conversation-manager.js');
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const { StateMachineLoader } = await import('../../src/state-machine-loader.js');
      
      // Then: components should initialize successfully
      const conversationManager = new ConversationManager(tempProject.projectPath);
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      const stateMachineLoader = new StateMachineLoader();
      
      expect(conversationManager).toBeDefined();
      expect(transitionEngine).toBeDefined();
      expect(stateMachineLoader).toBeDefined();
      
      // And: state machine should load the default configuration
      const stateMachine = stateMachineLoader.loadStateMachine(tempProject.projectPath);
      expect(stateMachine.name).toBe('Development Workflow');
      expect(stateMachine.initial_state).toBe('idle');
    });

    it('should handle conversation state management', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I create a conversation manager
      const { ConversationManager } = await import('../../src/conversation-manager.js');
      const conversationManager = new ConversationManager(tempProject.projectPath);
      
      // Then: it should manage conversation state
      const conversationId = conversationManager.getConversationId();
      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
      
      // And: it should provide project context
      const projectPath = conversationManager.getProjectPath();
      expect(projectPath).toBe(tempProject.projectPath);
    });
  });

  describe('Scenario: Integration between components', () => {
    it('should integrate TransitionEngine with StateMachineLoader', async () => {
      // Given: a project with state machine
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I use TransitionEngine which depends on StateMachineLoader
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: it should analyze phase transitions correctly
      const result = transitionEngine.analyzePhaseTransition({
        currentPhase: 'idle',
        userInput: 'implement a new feature',
        context: 'Testing integration',
        conversationSummary: 'User wants to implement a feature'
      });
      
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toContain('requirements analysis');
      expect(result.isModeled).toBe(true);
    });

    it('should handle explicit phase transitions', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I use explicit phase transitions
      const { TransitionEngine } = await import('../../src/transition-engine.js');
      const transitionEngine = new TransitionEngine(tempProject.projectPath);
      
      // Then: it should handle valid transitions
      const result = transitionEngine.handleExplicitTransition('idle', 'requirements');
      expect(result.newPhase).toBe('requirements');
      expect(result.instructions).toBeDefined();
      expect(result.transitionReason).toBeDefined();
      
      // And: it should reject invalid transitions
      expect(() => {
        transitionEngine.handleExplicitTransition('idle', 'invalid_phase');
      }).toThrow(/Invalid target phase/);
    });
  });
  describe('Scenario: Plan file management integration', () => {
    it('should integrate with plan file management', async () => {
      // Given: a project setup
      tempProject = createTempProjectWithDefaultStateMachine();
      
      // When: I use plan manager
      const { PlanManager } = await import('../../src/plan-manager.js');
      const planManager = new PlanManager(tempProject.projectPath);
      
      // Then: it should generate plan file paths correctly
      const planPath = planManager.getPlanFilePath('test-feature');
      expect(planPath).toContain(tempProject.projectPath);
      expect(planPath).toContain('test-feature-plan.md');
      
      // And: it should be able to create plan files
      const planContent = planManager.generatePlanContent('Test Feature', 'requirements');
      expect(planContent).toContain('Test Feature');
      expect(planContent).toContain('Requirements');
    });

    it('should handle different project contexts', async () => {
      // Given: multiple project setups
      const project1 = createTempProjectWithDefaultStateMachine();
      const project2 = createTempProjectWithDefaultStateMachine();
      
      try {
        // When: I create conversation managers for different projects
        const { ConversationManager } = await import('../../src/conversation-manager.js');
        const manager1 = new ConversationManager(project1.projectPath);
        const manager2 = new ConversationManager(project2.projectPath);
        
        // Then: they should have different conversation IDs
        const id1 = manager1.getConversationId();
        const id2 = manager2.getConversationId();
        
        expect(id1).not.toBe(id2);
        expect(manager1.getProjectPath()).toBe(project1.projectPath);
        expect(manager2.getProjectPath()).toBe(project2.projectPath);
      } finally {
        project1.cleanup();
        project2.cleanup();
      }
    });
  });
});
      
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
