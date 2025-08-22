/**
 * YAML parsing and validation service
 * Handles parsing YAML content and validating workflow structure
 */

import * as yaml from 'js-yaml';
import { YamlStateMachine, YamlState, YamlTransition } from '../types/ui-types';
import { AppError } from '../types/ui-types';

export class YamlParser {
  /**
   * Parse YAML content into a workflow state machine
   */
  public parseWorkflow(yamlContent: string): YamlStateMachine {
    try {
      const parsed = yaml.load(yamlContent) as unknown;

      if (!parsed) {
        throw this.createValidationError('Empty YAML content');
      }

      const workflow = this.validateWorkflowStructure(parsed);
      return workflow;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw this.createParsingError(`YAML syntax error: ${error.message}`);
      }

      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }

      throw this.createParsingError(`Failed to parse YAML: ${String(error)}`);
    }
  }

  /**
   * Validate the structure of a parsed workflow object
   */
  private validateWorkflowStructure(parsed: unknown): YamlStateMachine {
    // Check required top-level fields
    this.validateRequiredField(parsed, 'name', 'string');
    this.validateRequiredField(parsed, 'description', 'string');
    this.validateRequiredField(parsed, 'initial_state', 'string');
    this.validateRequiredField(parsed, 'states', 'object');

    // Validate states structure
    const states = this.validateStates(parsed.states);

    // Validate initial state exists
    if (!states[parsed.initial_state]) {
      throw this.createValidationError(
        `Initial state "${parsed.initial_state}" not found in states`
      );
    }

    // Validate state transitions reference valid states
    this.validateStateReferences(states);

    return {
      name: parsed.name,
      description: parsed.description,
      initial_state: parsed.initial_state,
      states: states,
      metadata: parsed.metadata,
    };
  }

  /**
   * Validate states object structure
   */
  private validateStates(statesObj: unknown): Record<string, YamlState> {
    if (!statesObj || typeof statesObj !== 'object') {
      throw this.createValidationError('States must be an object');
    }

    const validatedStates: Record<string, YamlState> = {};

    for (const [stateName, stateData] of Object.entries(statesObj)) {
      if (!stateData || typeof stateData !== 'object') {
        throw this.createValidationError(
          `State "${stateName}" must be an object`
        );
      }

      const state = stateData as unknown;

      // Validate required state fields
      this.validateRequiredField(
        state,
        'description',
        'string',
        `State "${stateName}"`
      );
      this.validateRequiredField(
        state,
        'default_instructions',
        'string',
        `State "${stateName}"`
      );
      this.validateRequiredField(
        state,
        'transitions',
        'object',
        `State "${stateName}"`
      );

      // Validate transitions
      const transitions = this.validateTransitions(
        state.transitions,
        stateName
      );

      validatedStates[stateName] = {
        description: state.description,
        default_instructions: state.default_instructions,
        transitions: transitions,
      };
    }

    return validatedStates;
  }

  /**
   * Validate transitions array structure
   */
  private validateTransitions(
    transitionsArray: unknown,
    stateName: string
  ): YamlTransition[] {
    if (!Array.isArray(transitionsArray)) {
      throw this.createValidationError(
        `Transitions for state "${stateName}" must be an array`
      );
    }

    return transitionsArray.map((transition: unknown, index: number) => {
      if (!transition || typeof transition !== 'object') {
        throw this.createValidationError(
          `Transition ${index} in state "${stateName}" must be an object`
        );
      }

      // Validate required transition fields
      this.validateRequiredField(
        transition,
        'trigger',
        'string',
        `Transition ${index} in state "${stateName}"`
      );
      this.validateRequiredField(
        transition,
        'to',
        'string',
        `Transition ${index} in state "${stateName}"`
      );
      this.validateRequiredField(
        transition,
        'transition_reason',
        'string',
        `Transition ${index} in state "${stateName}"`
      );

      return {
        trigger: transition.trigger,
        to: transition.to,
        instructions: transition.instructions,
        additional_instructions: transition.additional_instructions,
        transition_reason: transition.transition_reason,
        review_perspectives: transition.review_perspectives,
      };
    });
  }

  /**
   * Validate that all transition targets reference valid states
   */
  private validateStateReferences(states: Record<string, YamlState>): void {
    const stateNames = Object.keys(states);

    for (const [stateName, state] of Object.entries(states)) {
      for (const transition of state.transitions) {
        if (!stateNames.includes(transition.to)) {
          throw this.createValidationError(
            `Transition in state "${stateName}" references unknown state "${transition.to}"`
          );
        }
      }
    }
  }

  /**
   * Validate that a required field exists and has the correct type
   */
  private validateRequiredField(
    obj: unknown,
    fieldName: string,
    expectedType: string,
    context: string = 'Workflow'
  ): void {
    if (!(fieldName in obj)) {
      throw this.createValidationError(
        `${context}: Missing required field "${fieldName}"`
      );
    }

    const actualType = typeof obj[fieldName];
    if (actualType !== expectedType) {
      throw this.createValidationError(
        `${context}: Field "${fieldName}" must be ${expectedType}, got ${actualType}`
      );
    }
  }

  /**
   * Create a validation error
   */
  private createValidationError(message: string): AppError {
    return {
      type: 'validation',
      message: `Validation error: ${message}`,
    } as AppError;
  }

  /**
   * Create a parsing error
   */
  private createParsingError(message: string): AppError {
    return {
      type: 'parsing',
      message: message,
    } as AppError;
  }
}
