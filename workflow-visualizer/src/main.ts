/**
 * Main application entry point
 * Initializes the workflow visualizer application
 */

import { WorkflowLoader } from './services/WorkflowLoader';
import { FileUploadHandler } from './services/FileUploadHandler';
import { ErrorHandler } from './utils/ErrorHandler';
import { PlantUMLRenderer } from './visualization/PlantUMLRenderer';
import { getRequiredElement } from './utils/DomHelpers';
import { YamlStateMachine, AppState, TransitionData } from './types/ui-types';

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
  
  // Application state
  private appState: AppState;

  constructor() {
    // Initialize services
    this.workflowLoader = new WorkflowLoader();
    this.errorHandler = new ErrorHandler();
    
    // Get DOM elements
    this.workflowSelector = getRequiredElement<HTMLSelectElement>('#workflow-selector');
    this.fileUploadInput = getRequiredElement<HTMLInputElement>('#file-upload');
    this.diagramCanvas = getRequiredElement('#diagram-canvas');
    this.sidePanelContent = getRequiredElement('.side-panel-content');
    
    // Initialize PlantUML renderer
    this.plantUMLRenderer = new PlantUMLRenderer(this.diagramCanvas);
    
    // Set up click handler for interactive elements
    this.plantUMLRenderer.setClickHandler((elementType, elementId, data) => {
      console.log('PlantUML element clicked:', elementType, elementId, data);
      
      if (elementType === 'state') {
        this.handleElementClick({
          elementType: 'node',
          elementId: elementId,
          data: data
        });
      } else if (elementType === 'transition') {
        this.handleElementClick({
          elementType: 'link',
          elementId: elementId,
          data: data
        });
      }
    });
    
    // Initialize file upload handler
    this.fileUploadHandler = new FileUploadHandler(this.fileUploadInput, this.workflowLoader);
    
    // Initialize application state
    this.appState = {
      currentWorkflow: null,
      selectedElement: null,
      highlightedPath: null,
      isLoading: false,
      error: null
    };
    
    this.initialize();
  }

  /**
   * Initialize the application
   */
  private async initialize(): Promise<void> {
    try {
      console.log('Initializing Workflow Visualizer...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Populate workflow selector
      await this.populateWorkflowSelector();
      
      console.log('Workflow Visualizer initialized successfully');
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
    this.workflowSelector.addEventListener('change', this.handleWorkflowSelection.bind(this));
    
    // File upload handlers
    this.fileUploadHandler.onWorkflowLoaded = this.handleWorkflowLoaded.bind(this);
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
        this.workflowSelector.removeChild(this.workflowSelector.lastChild!);
      }
      
      // Add workflow options
      workflows.forEach(workflow => {
        const option = document.createElement('option');
        option.value = workflow.name;
        option.textContent = `${workflow.displayName} - ${workflow.description}`;
        this.workflowSelector.appendChild(option);
      });
      
      console.log(`Loaded ${workflows.length} built-in workflows`);
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
      console.log(`Loading workflow: ${workflowName}`);
      
      const workflow = await this.workflowLoader.loadBuiltinWorkflow(workflowName);
      await this.handleWorkflowLoaded(workflow, workflowName);
      
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
  private async handleWorkflowLoaded(workflow: YamlStateMachine, source: string): Promise<void> {
    console.log(`Workflow loaded successfully: ${workflow.name} (from ${source})`);
    
    this.appState.currentWorkflow = workflow;
    this.appState.selectedElement = null;
    this.appState.highlightedPath = null;
    
    // Render the workflow using PlantUML
    await this.plantUMLRenderer.renderWorkflow(workflow);
    
    // Update side panel
    this.updateSidePanel();
  }

  /**
   * Handle file upload errors
   */
  private handleUploadError(error: any): void {
    console.error('File upload error:', error);
    this.errorHandler.showError(error);
  }

  /**
   * Handle element clicks in the diagram
   */
  private handleElementClick(event: InteractionEvent): void {
    console.log('Element clicked:', event.elementType, event.elementId, event.data);
    
    if (event.elementType === 'node' && event.data) {
      console.log('Selecting state:', event.elementId);
      this.selectState(event.elementId!, event.data);
    } else if (event.elementType === 'link' && event.data) {
      console.log('Selecting transition:', event.elementId);
      this.selectTransition(event.elementId!, event.data);
    }
  }

  /**
   * Handle element hover in the diagram
   */
  private handleElementHover(event: InteractionEvent): void {
    // For now, just log hover events
    // Could be extended to show tooltips
    if (event.type === 'hover') {
      console.log('Element hovered:', event.elementType, event.elementId);
    }
  }

  /**
   * Select a state node
   */
  private selectState(stateId: string, _nodeData: any): void {
    const workflow = this.appState.currentWorkflow;
    if (!workflow || !workflow.states[stateId]) return;
    
    const state = workflow.states[stateId];
    
    this.appState.selectedElement = {
      type: 'state',
      id: stateId,
      data: state
    };
    
    // Update side panel to show selected state details
    this.updateSidePanel();
    
    console.log('State selected and side panel updated:', stateId);
  }

  /**
   * Select a transition link
   */
  private selectTransition(transitionId: string, linkData: any): void {
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
        transition_reason: linkData.transition_reason || ''
      };
      
      this.appState.selectedElement = {
        type: 'transition',
        id: transitionId,
        data: transitionData
      };
      
      // Update side panel to show selected transition details
      this.updateSidePanel();
      
      console.log('Transition selected and side panel updated:', transitionId);
    }
  }

  /**
   * Highlight a transition path
   */
  private highlightTransitionPath(fromState: string, toState: string): void {
    // Note: PlantUML diagrams don't support interactive path highlighting
    // Path information is shown in the side panel instead
    const pathElements = [fromState, toState];
    this.appState.highlightedPath = pathElements;
  }

  /**
   * Update the side panel content
   */
  private updateSidePanel(): void {
    if (!this.appState.currentWorkflow) {
      this.sidePanelContent.innerHTML = '<div class="empty-state">Select a workflow to see details</div>';
      return;
    }
    
    if (this.appState.selectedElement) {
      this.renderSelectedElementDetails();
    } else {
      this.renderWorkflowOverview();
    }
  }

  /**
   * Render workflow overview in side panel
   */
  private renderWorkflowOverview(): void {
    const workflow = this.appState.currentWorkflow!;
    
    this.sidePanelContent.innerHTML = `
      <div class="detail-section">
        <h3 class="detail-title">${workflow.name}</h3>
        <p class="detail-content">${workflow.description}</p>
      </div>
      
      <div class="detail-section">
        <h4 class="detail-subtitle">Initial State</h4>
        <div class="code-block">${workflow.initial_state}</div>
      </div>
      
      <div class="detail-section">
        <h4 class="detail-subtitle">States (${Object.keys(workflow.states).length})</h4>
        <ul class="detail-list">
          ${Object.keys(workflow.states).map(stateName => `
            <li class="detail-list-item ${stateName === workflow.initial_state ? 'active' : ''}">
              ${stateName}
            </li>
          `).join('')}
        </ul>
      </div>
      
      <div class="detail-section">
        <p class="detail-content" style="font-style: italic; color: var(--color-gray-500);">
          Click on a state or transition to see detailed information.
        </p>
      </div>
    `;
  }

  /**
   * Render selected element details in side panel
   */
  private renderSelectedElementDetails(): void {
    const element = this.appState.selectedElement!;
    
    if (element.type === 'state') {
      this.renderStateDetails(element.id, element.data);
    } else if (element.type === 'transition') {
      this.renderTransitionDetails(element.data as TransitionData);
    }
  }

  /**
   * Render state details
   */
  private renderStateDetails(stateId: string, stateData: any): void {
    const workflow = this.appState.currentWorkflow!;
    const isInitial = stateId === workflow.initial_state;
    
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
          ${stateData.transitions.map((transition: any) => `
            <li class="transition-item">
              <div class="transition-trigger">${transition.trigger}</div>
              <div class="transition-target">→ ${transition.to}</div>
              <div class="transition-reason">${transition.transition_reason}</div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * Render transition details
   */
  private renderTransitionDetails(transitionData: TransitionData): void {
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
      
      ${transitionData.instructions ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Instructions</h4>
          <div class="code-block">${transitionData.instructions}</div>
        </div>
      ` : ''}
      
      ${transitionData.additional_instructions ? `
        <div class="detail-section">
          <h4 class="detail-subtitle">Additional Instructions</h4>
          <div class="code-block">${transitionData.additional_instructions}</div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Clear the visualization
   */
  private clearVisualization(): void {
    this.appState.currentWorkflow = null;
    this.appState.selectedElement = null;
    this.appState.highlightedPath = null;
    
    this.diagramCanvas.innerHTML = '<div class="loading-message">Select a workflow to visualize</div>';
    this.updateSidePanel();
  }

  /**
   * Set loading state
   */
  private setLoadingState(isLoading: boolean): void {
    this.appState.isLoading = isLoading;
    
    if (isLoading) {
      this.diagramCanvas.innerHTML = '<div class="loading-message">Loading workflow...</div>';
    }
    // Note: When not loading, the PlantUMLRenderer will clear the canvas and render the visualization
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WorkflowVisualizerApp();
});
