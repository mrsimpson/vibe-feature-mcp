/**
 * State Machine Loader
 * 
 * Loads and validates YAML-based state machine definitions
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { createLogger } from './logger.js';
import { 
  YamlStateMachine, 
  YamlTransition,
} from './state-machine-types.js';

const logger = createLogger('StateMachineLoader');

/**
 * Loads and manages YAML-based state machine definitions
 */
export class StateMachineLoader {
  private stateMachine: YamlStateMachine | null = null;
  private validPhases: Set<string> = new Set();

  /**
   * Get all valid phases from the loaded state machine
   */
  public getValidPhases(): string[] {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    return Array.from(this.validPhases);
  }

  /**
   * Get the initial state from the loaded state machine
   */
  public getInitialState(): string {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    return this.stateMachine.initial_state;
  }
  
  /**
   * Load state machine from YAML file
   * 
   * Checks for custom state machine file in project directory first,
   * then falls back to waterfall workflow as default
   */
  public loadStateMachine(projectPath: string): YamlStateMachine {
    // Check for custom state machine file in project directory
    const customFilePaths = [
      path.join(projectPath, '.vibe', 'workflow.yaml'),
      path.join(projectPath, '.vibe', 'workflow.yml')
    ];
    
    // Try to load custom state machine file
    for (const filePath of customFilePaths) {
      if (fs.existsSync(filePath)) {
        logger.info('Loading custom state machine file', { filePath });
        try {
          return this.loadFromFile(filePath);
        } catch (error) {
          logger.warn('Failed to load custom state machine, falling back to default', { 
            filePath, 
            error: (error as Error).message 
          });
          // Continue to try next file or fall back to default
        }
      }
    }
    
    // Fall back to waterfall workflow as default
    // Use import.meta.url to get the current file's path in ESM
    const currentFileUrl = import.meta.url;
    const currentFilePath = new URL(currentFileUrl).pathname;
    const projectRoot = path.dirname(path.dirname(currentFilePath));
    const defaultFilePath = path.join(projectRoot, 'resources', 'workflows', 'waterfall.yaml');
    
    logger.info('Loading default state machine file', { defaultFilePath });
    return this.loadFromFile(defaultFilePath);
  }
  
  /**
   * Load state machine from specific file path
   */
  public loadFromFile(filePath: string): YamlStateMachine {
    try {
      const yamlContent = fs.readFileSync(path.resolve(filePath), 'utf8');
      const stateMachine = yaml.load(yamlContent) as YamlStateMachine;
      
      // Validate the state machine
      this.validateStateMachine(stateMachine);
      
      // Store valid phases for later validation
      this.validPhases = new Set(Object.keys(stateMachine.states));

      this.stateMachine = stateMachine;
      logger.info('State machine loaded successfully', {
        name: stateMachine.name,
        stateCount: Object.keys(stateMachine.states).length,
        phases: Array.from(this.validPhases)
      });
      
      return stateMachine;
    } catch (error) {
      logger.error('Failed to load state machine', error as Error);
      throw new Error(`Failed to load state machine: ${(error as Error).message}`);
    }
  }
  
  /**
   * Validate the state machine structure and references
   */
  private validateStateMachine(stateMachine: YamlStateMachine): void {
    // Check required properties
    if (!stateMachine.name || !stateMachine.description || 
        !stateMachine.initial_state || !stateMachine.states) {
      throw new Error('State machine is missing required properties');
    }
    
    // Get all state names
    const stateNames = Object.keys(stateMachine.states);
    
    // Check initial state is valid
    if (!stateNames.includes(stateMachine.initial_state)) {
      throw new Error(`Initial state "${stateMachine.initial_state}" is not defined in states`);
    }
    
    // Validate states and transitions
    Object.entries(stateMachine.states).forEach(([stateName, state]) => {
      // Check required state properties
      if (!state.description || !state.default_instructions) {
        throw new Error(`State "${stateName}" is missing required properties (description or default_instructions)`);
      }
      
      if (!state.transitions || !Array.isArray(state.transitions)) {
        throw new Error(`State "${stateName}" has invalid transitions property`);
      }
      
      state.transitions.forEach(transition => {
        if (!stateNames.includes(transition.to)) {
          throw new Error(`State "${stateName}" has transition to unknown state "${transition.to}"`);
        }
        
        if (!transition.transition_reason) {
          throw new Error(`Transition from "${stateName}" to "${transition.to}" is missing transition_reason`);
        }
      });
    });
    
    logger.debug('State machine validation successful');
  }
  
  /**
   * Get transition instructions for a specific state change
   */
  public getTransitionInstructions(
    fromState: string,
    toState: string, 
    trigger?: string
  ): { instructions: string; transitionReason: string; isModeled: boolean } {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    // Get target state definition
    const targetState = this.stateMachine.states[toState];
    if (!targetState) {
      throw new Error(`Target state "${toState}" not found`);
    }
    
    // Look for a modeled transition first
    const fromStateDefinition = this.stateMachine.states[fromState];
    if (fromStateDefinition) {
      const transition = fromStateDefinition.transitions.find(
        t => t.to === toState && (!trigger || t.trigger === trigger)
      );
      
      if (transition) {
        // For modeled transitions, compose instructions
        let composedInstructions = targetState.default_instructions;
        
        // If transition has specific instructions, use those instead of default
        if (transition.instructions) {
          composedInstructions = transition.instructions;
        }
        
        // If transition has additional instructions, combine them
        if (transition.additional_instructions) {
          composedInstructions = `${composedInstructions}\n\n**Additional Context:**\n${transition.additional_instructions}`;
        }
        
        return {
          instructions: composedInstructions,
          transitionReason: transition.transition_reason,
          isModeled: true
        };
      }
    }
    
    // Fall back to target state's default instructions for unmodeled transitions
    return {
      instructions: targetState.default_instructions,
      transitionReason: `Direct transition to ${toState} phase`,
      isModeled: false
    };
  }
  
  /**
   * Get all possible transitions from a given state
   */
  public getPossibleTransitions(fromState: string): YamlTransition[] {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    const stateDefinition = this.stateMachine.states[fromState];
    return stateDefinition ? stateDefinition.transitions : [];
  }
  
  /**
   * Check if a transition is modeled (shown in state diagram)
   */
  public isModeledTransition(fromState: string, toState: string): boolean {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    const stateDefinition = this.stateMachine.states[fromState];
    if (!stateDefinition) return false;
    
    return stateDefinition.transitions.some(
      t => t.to === toState
    );
  }
  
  /**
   * Check if a phase is valid in the current state machine
   */
  public isValidPhase(phase: string): boolean {
    return this.validPhases.has(phase);
  }

  /**
   * Get phase-specific instructions for continuing work in current phase
   */
  public getContinuePhaseInstructions(phase: string): string {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    const stateDefinition = this.stateMachine.states[phase];
    if (!stateDefinition) {
      logger.error('Unknown phase', new Error(`Unknown phase: ${phase}`));
      throw new Error(`Unknown phase: ${phase}`);
    }
    
    // Look for a self-transition (continue in same phase)
    const continueTransition = stateDefinition.transitions.find(
      t => t.to === phase
    );
    
    if (continueTransition) {
      // Compose instructions for continue transition
      let composedInstructions = stateDefinition.default_instructions;
      
      // If transition has specific instructions, use those instead of default
      if (continueTransition.instructions) {
        composedInstructions = continueTransition.instructions;
      }
      
      // If transition has additional instructions, combine them
      if (continueTransition.additional_instructions) {
        composedInstructions = `${composedInstructions}\n\n**Additional Context:**\n${continueTransition.additional_instructions}`;
      }
      
      return composedInstructions;
    }
    
    // Fall back to default instructions for the phase
    return stateDefinition.default_instructions;
  }
}
