/**
 * Main application entry point
 * Initializes the workflow visualizer application
 */

import { WorkflowLoader } from './services/WorkflowLoader';
import { FileUploadHandler } from './services/FileUploadHandler';
import { ErrorHandler } from './utils/ErrorHandler';
import { PlantUMLRenderer } from './visualization/PlantUMLRenderer';
import { getRequiredElement } from './utils/DomHelpers';
import type { InteractionEvent } from './types/ui-types';
import {
  YamlStateMachine,
  YamlState,
  YamlTransition,
  AppState,
  TransitionData,
} from './types/ui-types';

class WorkflowVisualizerApp {
  private readonly workflowLoader: WorkflowLoader;
  private readonly fileUploadHandler: FileUploadHandler;
  private readonly errorHandler: ErrorHandler;
  private readonly plantUMLRenderer: PlantUMLRenderer;

  // DOM elements
  private readonly workflowSelector: HTMLSelectElement;
  private readonly fileUploadInput: HTMLInputElement;
  private readonly diagramCanvas: HTMLElement;
  private readonly sidePanelContent: HTMLElement;
  private readonly sidePanelHeader: HTMLElement;

  // Application state
  private appState: AppState;

  constructor() {
    // Initialize services
    this.workflowLoader = new WorkflowLoader();
    this.errorHandler = new ErrorHandler();

    // Get DOM elements
    this.workflowSelector =
      getRequiredElement<HTMLSelectElement>('#workflow-selector');
    this.fileUploadInput = getRequiredElement<HTMLInputElement>('#file-upload');
    this.diagramCanvas = getRequiredElement('#diagram-canvas');
    this.sidePanelContent = getRequiredElement('.side-panel-content');
    this.sidePanelHeader = getRequiredElement('.side-panel-header');

    // Initialize PlantUML renderer
    this.plantUMLRenderer = new PlantUMLRenderer(this.diagramCanvas);

    // Set up click handler for interactive elements
    this.plantUMLRenderer.setClickHandler((elementType, elementId, data) => {
      if (elementType === 'state') {
        this.handleElementClick({
          elementType: 'node',
          elementId: elementId,
          data: data,
        });
      } else if (elementType === 'transition') {
        this.handleElementClick({
          elementType: 'transition',
          elementId: elementId,
          data: data,
        });
      } else if (elementType === 'clear-selection') {
        this.clearSelection();
      }
    });

    // Initialize file upload handler
    this.fileUploadHandler = new FileUploadHandler(
      this.fileUploadInput,
      this.workflowLoader
    );

    // Initialize application state
    this.appState = {
      currentWorkflow: null,
      selectedElement: null,
      highlightedPath: null,
      isLoading: false,
      error: null,
      parentState: null,
    };

    this.initialize();
  }

  /**
   * Initialize the application
   */
  private async initialize(): Promise<void> {
    try {
      // Set up event listeners
      this.setupEventListeners();

      // Populate workflow selector
      await this.populateWorkflowSelector();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.errorHandler.showError(
        this.errorHandler.createUserFriendlyError(error)
      );
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Workflow selector change
    this.workflowSelector.addEventListener(
      'change',
      this.handleWorkflowSelection.bind(this)
    );

    // File upload handlers
    this.fileUploadHandler.onWorkflowLoaded =
      this.handleWorkflowLoaded.bind(this);
    this.fileUploadHandler.onUploadError = this.handleUploadError.bind(this);

    // Note: PlantUML renderer doesn't need interaction handlers
    // Interactions will be handled through the side panel
  }

  /**
   * Populate the workflow selector with built-in workflows
   */
  private async populateWorkflowSelector(): Promise<void> {
    try {
      const workflows = this.workflowLoader.getAvailableWorkflows();

      // Clear existing options (except the first placeholder)
      while (this.workflowSelector.children.length > 1) {
        const lastChild = this.workflowSelector.lastChild;
        if (lastChild) {
          this.workflowSelector.removeChild(lastChild);
        }
      }

      // Add workflow options
      for (const workflow of workflows) {
        const option = document.createElement('option');
        option.value = workflow.name;
        option.textContent = `${workflow.displayName} - ${workflow.description}`;
        this.workflowSelector.appendChild(option);
      }
    } catch (error) {
      console.error('Failed to populate workflow selector:', error);
      this.errorHandler.showError('Failed to load available workflows');
    }
  }

  /**
   * Handle workflow selection from dropdown
   */
  private async handleWorkflowSelection(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const workflowName = target.value;

    if (!workflowName) {
      this.clearVisualization();
      return;
    }

    try {
      this.setLoadingState(true);

      const workflow =
        await this.workflowLoader.loadBuiltinWorkflow(workflowName);
      await this.handleWorkflowLoaded(workflow);
    } catch (error) {
      console.error(`Failed to load workflow ${workflowName}:`, error);
      this.errorHandler.showError(
        this.errorHandler.createUserFriendlyError(error)
      );
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Handle successful workflow loading
   */
  private async handleWorkflowLoaded(
    workflow: YamlStateMachine
  ): Promise<void> {
    this.appState.currentWorkflow = workflow;
    this.appState.selectedElement = null;
    this.appState.highlightedPath = null;

    // Render the workflow using PlantUML
    await this.plantUMLRenderer.renderWorkflow(workflow);

    // Show metadata by default when workflow loads
    this.updateSidePanel();
  }

  /**
   * Handle file upload errors
   */
  private handleUploadError(error: Error): void {
    console.error('File upload error:', error);
    this.errorHandler.showError(error);
  }

  /**
   * Handle element clicks in the diagram
   */
  private handleElementClick(event: InteractionEvent): void {
    if (event.elementType === 'node' && event.data && event.elementId) {
      this.selectState(event.elementId, event.data);
    } else if (
      event.elementType === 'transition' &&
      event.data &&
      event.elementId
    ) {
      this.selectTransition(event.elementId, event.data);
    }
  }

  /**
  /**
   * Select a state node
   */
  private selectState(stateId: string, _nodeData: unknown): void {
    const workflow = this.appState.currentWorkflow;
    if (!workflow || !workflow.states[stateId]) return;

    const state = workflow.states[stateId];

    this.appState.selectedElement = {
      type: 'state',
      id: stateId,
      data: state,
    };

    // Update side panel to show selected state details
    this.updateSidePanel();
  }

  /**
   * Select a transition link
   */
  private selectTransition(transitionId: string, linkData: unknown): void {
    const workflow = this.appState.currentWorkflow;
    if (!workflow) return;

    // Use the linkData passed from the PlantUML renderer
    if (linkData && linkData.from && linkData.to && linkData.trigger) {
      const transitionData: TransitionData = {
        trigger: linkData.trigger,
        from: linkData.from,
        to: linkData.to,
        instructions: linkData.instructions || '',
        additional_instructions: linkData.additional_instructions || '',
        transition_reason: linkData.transition_reason || '',
        review_perspectives: linkData.review_perspectives || [],
      };

      this.appState.selectedElement = {
        type: 'transition',
        id: transitionId,
        data: transitionData,
      };

      // Update side panel to show selected transition details
      this.updateSidePanel();
    }
  }

  /**
   * Update the side panel content
   */
  private updateSidePanel(): void {
    console.log('updateSidePanel called', {
      hasWorkflow: !!this.appState.currentWorkflow,
      hasSelectedElement: !!this.appState.selectedElement,
    });

    if (!this.appState.currentWorkflow) {
      this.sidePanelHeader.innerHTML = '<h2>Details</h2>';
      this.sidePanelContent.innerHTML =
        '<div class="empty-state">Select a workflow to see details</div>';
      return;
    }

    if (this.appState.selectedElement) {
      console.log('Rendering selected element details');
      this.renderSelectedElementDetails();
    } else {
      console.log('Rendering metadata details (default)');
      // Show workflow metadata by default when no element is selected
      this.renderMetadataDetails();
    }
  }

  /**
   * Render workflow metadata in side panel
   */
  private renderMetadataDetails(): void {
    const workflow = this.appState.currentWorkflow;
    if (!workflow) return;
    const metadata = workflow.metadata;

    // Update header
    this.sidePanelHeader.innerHTML = '<h2>Workflow Info</h2>';

    // Render metadata content
    this.sidePanelContent.innerHTML = `
      <div class="detail-section">
        <h3 class="detail-title">${workflow.name} Workflow</h3>
        <p class="detail-content">${workflow.description || 'No description available'}</p>
      </div>
      
      ${
        metadata?.complexity
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Complexity</h4>
          <span class="badge badge-${metadata.complexity}">${metadata.complexity.toUpperCase()}</span>
        </div>
      `
          : ''
      }
      
      ${
        metadata?.bestFor?.length
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Best For</h4>
          <ul class="metadata-list">
            ${metadata.bestFor.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      ${
        metadata?.useCases?.length
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Use Cases</h4>
          <ul class="metadata-list">
            ${metadata.useCases.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      ${
        metadata?.examples?.length
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Examples</h4>
          <ul class="metadata-list">
            ${metadata.examples.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      <div class="detail-section">
        <p class="detail-hint">Click on states or transitions to see detailed information.</p>
      </div>
    `;
  }

  /**
   * Render selected element details in side panel
   */
  private renderSelectedElementDetails(): void {
    const element = this.appState.selectedElement;
    if (!element) return;

    if (element.type === 'state') {
      this.renderStateDetailsWithHeader(element.id, element.data);
    } else if (element.type === 'transition') {
      this.renderTransitionDetailsWithHeader(element.data as TransitionData);
    }
  }

  /**
   * Render state details with back button in header
   */
  private renderStateDetailsWithHeader(
    stateId: string,
    stateData: YamlState
  ): void {
    const workflow = this.appState.currentWorkflow;
    if (!workflow) return;
    const isInitial = stateId === workflow.initial_state;

    // Update header with back button
    this.sidePanelHeader.innerHTML = `
      <button class="back-button" style="
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        margin-right: 8px;
        border-radius: 4px;
        transition: all 0.2s ease;
      " title="Back to Overview">←</button>
      <h2>State: ${stateId}</h2>
    `;

    const backButton = this.sidePanelHeader.querySelector('.back-button');
    backButton?.addEventListener('click', () => {
      this.clearSelection();
    });

    backButton?.addEventListener('mouseenter', () => {
      (backButton as HTMLElement).style.backgroundColor = '#f3f4f6';
    });

    backButton?.addEventListener('mouseleave', () => {
      (backButton as HTMLElement).style.backgroundColor = 'transparent';
    });

    // Render state content
    this.sidePanelContent.innerHTML = `
      <div class="detail-section">
        <h3 class="detail-title">
          ${stateId}
          ${isInitial ? '<span class="badge badge-success">Initial</span>' : ''}
        </h3>
        <p class="detail-content">${stateData.description}</p>
      </div>
      
      <div class="detail-section">
        <h4 class="detail-subtitle">Default Instructions</h4>
        <div class="code-block">${stateData.default_instructions}</div>
      </div>
      
      <div class="detail-section">
        <h4 class="detail-subtitle">Transitions (${stateData.transitions.length})</h4>
        <ul class="transitions-list">
          ${stateData.transitions
            .map(
              (transition: YamlTransition) => `
            <li class="transition-item clickable-transition" data-from="${stateId}" data-to="${transition.to}" data-trigger="${transition.trigger}">
              <div class="transition-trigger">${transition.trigger}</div>
              <div class="transition-target">→ ${transition.to}</div>
              <div class="transition-reason">${transition.transition_reason}</div>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;

    // Add click handlers to transitions
    const transitionItems = this.sidePanelContent.querySelectorAll(
      '.clickable-transition'
    );
    for (const item of transitionItems) {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const fromState = item.getAttribute('data-from');
        const toState = item.getAttribute('data-to');
        const trigger = item.getAttribute('data-trigger');

        if (fromState && toState && trigger) {
          // Find the full transition data
          const fullTransition = stateData.transitions.find(
            (t: YamlTransition) => t.to === toState && t.trigger === trigger
          );

          if (fullTransition) {
            // Store the parent state for back navigation
            this.appState.parentState = { id: stateId, data: stateData };

            this.selectTransition(`${fromState}->${toState}`, {
              from: fromState,
              to: toState,
              trigger: trigger,
              instructions: fullTransition.instructions,
              additional_instructions: fullTransition.additional_instructions,
              transition_reason: fullTransition.transition_reason,
            });
          }
        }
      });

      // Add hover effects
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.backgroundColor = '#f0f9ff';
        (item as HTMLElement).style.cursor = 'pointer';
      });

      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.backgroundColor = '';
        (item as HTMLElement).style.cursor = '';
      });
    }
  }

  /**
   * Render transition details with back button in header
   */
  private renderTransitionDetailsWithHeader(
    transitionData: TransitionData
  ): void {
    // Update header with back button
    this.sidePanelHeader.innerHTML = `
      <button class="back-button" style="
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        margin-right: 8px;
        border-radius: 4px;
        transition: all 0.2s ease;
      " title="Back to State">←</button>
      <h2>Transition: ${transitionData.trigger}</h2>
    `;

    const backButton = this.sidePanelHeader.querySelector('.back-button');
    backButton?.addEventListener('click', () => {
      this.goBackToParentState();
    });

    backButton?.addEventListener('mouseenter', () => {
      (backButton as HTMLElement).style.backgroundColor = '#f3f4f6';
    });

    backButton?.addEventListener('mouseleave', () => {
      (backButton as HTMLElement).style.backgroundColor = 'transparent';
    });

    // Render transition content
    this.sidePanelContent.innerHTML = `
      <div class="detail-section">
        <h3 class="detail-title">Transition: ${transitionData.trigger}</h3>
        <p class="detail-content">
          <strong>${transitionData.from}</strong> → <strong>${transitionData.to}</strong>
        </p>
      </div>
      
      <div class="detail-section">
        <h4 class="detail-subtitle">Reason</h4>
        <p class="detail-content">${transitionData.transition_reason}</p>
      </div>
      
      ${
        transitionData.instructions
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Instructions</h4>
          <div class="code-block">${transitionData.instructions}</div>
        </div>
      `
          : ''
      }
      
      ${
        transitionData.additional_instructions
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Additional Instructions</h4>
          <div class="code-block">${transitionData.additional_instructions}</div>
        </div>
      `
          : ''
      }
      
      ${
        transitionData.review_perspectives?.length
          ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Review Perspectives (${transitionData.review_perspectives.length})</h4>
          ${transitionData.review_perspectives
            .map(
              review => `
            <div class="review-perspective">
              <h5 class="review-role">${review.perspective.replace(/_/g, ' ').toUpperCase()}</h5>
              <p class="review-prompt">${review.prompt}</p>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : `<!-- No review perspectives found -->`
      }
    `;
  }

  /**
   * Go back to parent state from transition view
   */
  private goBackToParentState(): void {
    if (this.appState.parentState) {
      this.appState.selectedElement = {
        type: 'state',
        id: this.appState.parentState.id,
        data: this.appState.parentState.data,
      };
      this.appState.parentState = null;
      this.updateSidePanel();
    } else {
      this.clearSelection();
    }
  }

  /**
   * Clear selection and return to overview
   */
  private clearSelection(): void {
    this.appState.selectedElement = null;
    this.appState.parentState = null;

    // Reset header
    this.sidePanelHeader.innerHTML = '<h2>Details</h2>';

    this.updateSidePanel();
  }

  /**
  /**
   * Clear the visualization
   */
  private clearVisualization(): void {
    this.appState.currentWorkflow = null;
    this.appState.selectedElement = null;
    this.appState.highlightedPath = null;

    this.diagramCanvas.innerHTML =
      '<div class="loading-message">Select a workflow to visualize</div>';
    this.updateSidePanel();
  }

  /**
   * Set loading state
   */
  private setLoadingState(isLoading: boolean): void {
    this.appState.isLoading = isLoading;

    if (isLoading) {
      this.diagramCanvas.innerHTML =
        '<div class="loading-message">Loading workflow...</div>';
    }
    // Note: When not loading, the PlantUMLRenderer will clear the canvas and render the visualization
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WorkflowVisualizerApp();
});
