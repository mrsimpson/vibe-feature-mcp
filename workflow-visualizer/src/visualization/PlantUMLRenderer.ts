import { YamlStateMachine } from '../types/workflow-types';

export class PlantUMLRenderer {
  private container: HTMLElement;
  private onElementClick?: (elementType: 'state' | 'transition', elementId: string, data?: any) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Set click handler for interactive elements
   */
  public setClickHandler(handler: (elementType: 'state' | 'transition', elementId: string, data?: any) => void): void {
    this.onElementClick = handler;
  }

  /**
   * Render workflow as a proper state machine diagram
   */
  public async renderWorkflow(workflow: YamlStateMachine): Promise<void> {
    console.log(`Rendering workflow: ${workflow.name}`);
    
    // Clear container and set up scrollable area
    this.container.innerHTML = '';
    this.container.style.overflow = 'auto';
    this.container.style.height = '100%';
    
    // Create scrollable diagram container
    const diagramContainer = document.createElement('div');
    diagramContainer.style.minHeight = '600px';
    diagramContainer.style.padding = '20px';
    diagramContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    diagramContainer.style.position = 'relative';
    
    // Generate the state machine diagram
    const diagramHtml = this.generateStateMachineDiagram(workflow);
    diagramContainer.innerHTML = diagramHtml;
    
    this.container.appendChild(diagramContainer);
    
    // Add click handlers after DOM is ready
    setTimeout(() => this.addInteractivity(workflow), 0);
    
    console.log('State machine diagram rendered successfully');
  }

  /**
   * Generate a proper state machine diagram with connected states
   */
  private generateStateMachineDiagram(workflow: YamlStateMachine): string {
    const states = Object.keys(workflow.states);
    const initialState = workflow.initial_state;
    
    // Calculate positions for states in a grid layout
    const statePositions = this.calculateStatePositions(states);
    
    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin-bottom: 10px;">${workflow.name} Workflow</h2>
        <p style="color: #64748b; margin: 0;">${workflow.description || ''}</p>
      </div>
      
      <div style="position: relative; min-height: 500px; margin: 20px;">
        <!-- SVG for connections -->
        <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none;">
          ${this.generateConnections(workflow, statePositions)}
        </svg>
        
        <!-- States positioned absolutely -->
        ${this.generateStates(workflow, statePositions)}
      </div>
      
      <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 14px; color: #64748b;">
        <strong>Legend:</strong>
        <div style="margin-top: 8px;">
          <span style="display: inline-block; width: 12px; height: 12px; background: #059669; border-radius: 50%; margin-right: 8px;"></span>
          Initial State
        </div>
        <div style="margin-top: 4px;">
          <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #2563eb; border-radius: 50%; margin-right: 8px;"></span>
          Regular State
        </div>
        <div style="margin-top: 4px;">
          <span style="color: #64748b;">Click on states or transitions for details</span>
        </div>
      </div>
    `;
    
    return html;
  }

  /**
   * Calculate positions for states in a grid layout
   */
  private calculateStatePositions(states: string[]): Map<string, {x: number, y: number}> {
    const positions = new Map();
    const cols = Math.ceil(Math.sqrt(states.length));
    const stateWidth = 150;
    const stateHeight = 100;
    const spacing = 200;
    
    states.forEach((state, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      positions.set(state, {
        x: col * spacing + stateWidth / 2,
        y: row * spacing + stateHeight / 2 + 50
      });
    });
    
    return positions;
  }

  /**
   * Generate SVG connections between states
   */
  private generateConnections(workflow: YamlStateMachine, positions: Map<string, {x: number, y: number}>): string {
    let svg = '';
    
    Object.entries(workflow.states).forEach(([fromState, stateConfig]) => {
      if (stateConfig.transitions) {
        stateConfig.transitions.forEach(transition => {
          const fromPos = positions.get(fromState);
          const toPos = positions.get(transition.to);
          
          if (fromPos && toPos) {
            // Create curved arrow between states
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2 - 30; // Curve upward
            
            svg += `
              <g class="transition-group" data-from="${fromState}" data-to="${transition.to}" data-trigger="${transition.trigger}">
                <path d="M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}" 
                      stroke="#94a3b8" 
                      stroke-width="2" 
                      fill="none" 
                      marker-end="url(#arrowhead)"
                      style="cursor: pointer;"
                      class="transition-path"/>
                <text x="${midX}" y="${midY - 10}" 
                      text-anchor="middle" 
                      font-size="12" 
                      fill="#64748b"
                      style="cursor: pointer;"
                      class="transition-label">
                  ${transition.trigger.replace(/_/g, ' ')}
                </text>
              </g>
            `;
          }
        });
      }
    });
    
    // Add arrow marker definition
    svg = `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>
      ${svg}
    `;
    
    return svg;
  }

  /**
   * Generate positioned state elements
   */
  private generateStates(workflow: YamlStateMachine, positions: Map<string, {x: number, y: number}>): string {
    const initialState = workflow.initial_state;
    let html = '';
    
    Object.entries(workflow.states).forEach(([stateName, stateConfig]) => {
      const pos = positions.get(stateName);
      if (!pos) return;
      
      const isInitial = stateName === initialState;
      
      html += `
        <div class="state-element" 
             data-state="${stateName}"
             style="
               position: absolute;
               left: ${pos.x - 75}px;
               top: ${pos.y - 40}px;
               width: 150px;
               height: 80px;
               display: flex;
               flex-direction: column;
               align-items: center;
               justify-content: center;
               padding: 10px;
               border: 2px solid ${isInitial ? '#059669' : '#2563eb'};
               border-radius: 20px;
               background: ${isInitial ? '#059669' : '#ffffff'};
               color: ${isInitial ? '#ffffff' : '#1e293b'};
               text-align: center;
               cursor: pointer;
               z-index: 2;
               transition: all 0.2s ease;
             "
             onmouseover="this.style.transform='scale(1.05)'"
             onmouseout="this.style.transform='scale(1)'">
          <div style="font-weight: 600; font-size: 14px;">${stateName}</div>
          ${stateConfig.description ? `<div style="font-size: 11px; margin-top: 4px; opacity: 0.8; line-height: 1.2;">${stateConfig.description}</div>` : ''}
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Add interactivity to the diagram
   */
  private addInteractivity(workflow: YamlStateMachine): void {
    // Add click handlers for states
    const stateElements = this.container.querySelectorAll('.state-element');
    stateElements.forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const stateName = element.getAttribute('data-state');
        if (stateName && this.onElementClick) {
          this.onElementClick('state', stateName, workflow.states[stateName]);
        }
      });
    });

    // Add click handlers for transitions
    const transitionGroups = this.container.querySelectorAll('.transition-group');
    transitionGroups.forEach(group => {
      const paths = group.querySelectorAll('.transition-path, .transition-label');
      paths.forEach(path => {
        path.addEventListener('click', (e) => {
          e.stopPropagation();
          const fromState = group.getAttribute('data-from');
          const toState = group.getAttribute('data-to');
          const trigger = group.getAttribute('data-trigger');
          if (fromState && toState && trigger && this.onElementClick) {
            this.onElementClick('transition', `${fromState}->${toState}`, {
              from: fromState,
              to: toState,
              trigger: trigger
            });
          }
        });
        
        // Add hover effects
        path.addEventListener('mouseenter', () => {
          group.querySelectorAll('.transition-path').forEach(p => {
            (p as HTMLElement).style.stroke = '#2563eb';
            (p as HTMLElement).style.strokeWidth = '3';
          });
          group.querySelectorAll('.transition-label').forEach(l => {
            (l as HTMLElement).style.fill = '#2563eb';
            (l as HTMLElement).style.fontWeight = 'bold';
          });
        });
        
        path.addEventListener('mouseleave', () => {
          group.querySelectorAll('.transition-path').forEach(p => {
            (p as HTMLElement).style.stroke = '#94a3b8';
            (p as HTMLElement).style.strokeWidth = '2';
          });
          group.querySelectorAll('.transition-label').forEach(l => {
            (l as HTMLElement).style.fill = '#64748b';
            (l as HTMLElement).style.fontWeight = 'normal';
          });
        });
      });
    });
  }

  /**
   * Clear the container
   */
  public clear(): void {
    this.container.innerHTML = '';
  }
}
