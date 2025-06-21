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
   * then falls back to default state machine file
   */
  public loadStateMachine(projectPath: string): YamlStateMachine {
    // Check for custom state machine file in project directory
    const customFilePaths = [
      path.join(projectPath, '.vibe', 'state-machine.yaml'),
      path.join(projectPath, '.vibe', 'state-machine.yml')
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
    
    // Fall back to default state machine file
    // Use import.meta.url to get the current file's path in ESM
    const currentFileUrl = import.meta.url;
    const currentFilePath = new URL(currentFileUrl).pathname;
    const projectRoot = path.dirname(path.dirname(currentFilePath));
    const defaultFilePath = path.join(projectRoot, 'resources', 'state-machine.yaml');
    
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
        directTransitionCount: stateMachine.direct_transitions.length,
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
    
    // Validate transition targets
    Object.entries(stateMachine.states).forEach(([stateName, state]) => {
      if (!state.transitions || !Array.isArray(state.transitions)) {
        throw new Error(`State "${stateName}" has invalid transitions property`);
      }
      
      state.transitions.forEach(transition => {
        if (!stateNames.includes(transition.to)) {
          throw new Error(`State "${stateName}" has transition to unknown state "${transition.to}"`);
        }
        
        if (!transition.instructions || !transition.transition_reason) {
          throw new Error(`Transition from "${stateName}" to "${transition.to}" is missing instructions or transition_reason`);
        }
      });
    });
    
    // Validate direct transitions
    if (!stateMachine.direct_transitions || !Array.isArray(stateMachine.direct_transitions)) {
      throw new Error('State machine is missing direct_transitions array');
    }
    
    stateMachine.direct_transitions.forEach(directTransition => {
      if (!stateNames.includes(directTransition.state)) {
        throw new Error(`Direct transition references unknown state: ${directTransition.state}`);
      }
      
      if (!directTransition.instructions || !directTransition.transition_reason) {
        throw new Error(`Direct transition for state "${directTransition.state}" has invalid properties`);
      }
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
    
    // Look for a modeled transition first
    const stateDefinition = this.stateMachine.states[fromState];
    if (stateDefinition) {
      const transition = stateDefinition.transitions.find(
        t => t.to === toState && (!trigger || t.trigger === trigger)
      );
      
      if (transition) {
        return {
          instructions: transition.instructions,
          transitionReason: transition.transition_reason,
          isModeled: true
        };
      }
    }
    
    // Fall back to direct transition instructions
    const directTransition = this.stateMachine.direct_transitions.find(
      dt => dt.state === toState
    );
    
    if (directTransition) {
      return {
        instructions: directTransition.instructions,
        transitionReason: directTransition.transition_reason,
        isModeled: false
      };
    }
    
    // If no transition found, throw error
    logger.error('No transition found', new Error(`No transition found from "${fromState}" to "${toState}"`));
    throw new Error(`No transition found from "${fromState}" to "${toState}"`);
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
    
    const continueTransition = stateDefinition.transitions.find(
      t => t.to === phase
    );
    
    if (continueTransition) {
      return continueTransition.instructions;
    }
    
    // Fall back to direct transition instructions
    const directTransition = this.stateMachine.direct_transitions.find(
      dt => dt.state === phase
    );
    
    if (directTransition) {
      return directTransition.instructions;
    }
    
    logger.warn('No continue instructions found for phase', { phase });
    return `Continue working in ${phase} phase.`;
  }
}
