import { YamlStateMachine } from '../types/workflow-types';

export class PlantUMLRenderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Render workflow as a simple HTML-based state diagram
   */
  public async renderWorkflow(workflow: YamlStateMachine): Promise<void> {
    console.log(`Rendering workflow: ${workflow.name}`);
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create a simple HTML-based state diagram
    const diagramHtml = this.generateSimpleDiagram(workflow);
    
    const diagramDiv = document.createElement('div');
    diagramDiv.innerHTML = diagramHtml;
    diagramDiv.style.padding = '20px';
    diagramDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    this.container.appendChild(diagramDiv);
    
    console.log('Simple diagram rendered successfully');
  }

  /**
   * Generate a simple HTML-based state diagram
   */
  private generateSimpleDiagram(workflow: YamlStateMachine): string {
    const states = Object.keys(workflow.states);
    const initialState = workflow.initial_state;
    
    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin-bottom: 10px;">${workflow.name} Workflow</h2>
        <p style="color: #64748b; margin: 0;">${workflow.description || ''}</p>
      </div>
      
      <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
    `;
    
    // Add start indicator
    html += `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 20px; height: 20px; background: #000; border-radius: 50%;"></div>
        <div style="color: #64748b;">START</div>
      </div>
      <div style="width: 2px; height: 20px; background: #94a3b8;"></div>
    `;
    
    // Add states
    states.forEach((stateName, index) => {
      const state = workflow.states[stateName];
      const isInitial = stateName === initialState;
      
      html += `
        <div style="
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          padding: 15px 25px; 
          border: 2px solid ${isInitial ? '#059669' : '#2563eb'}; 
          border-radius: 25px; 
          background: ${isInitial ? '#059669' : '#ffffff'};
          color: ${isInitial ? '#ffffff' : '#1e293b'};
          min-width: 120px;
          text-align: center;
        ">
          <div style="font-weight: 600; font-size: 16px;">${stateName}</div>
          ${state.description ? `<div style="font-size: 12px; margin-top: 5px; opacity: 0.8;">${state.description}</div>` : ''}
        </div>
      `;
      
      // Add transitions
      if (state.transitions && state.transitions.length > 0) {
        html += `<div style="width: 2px; height: 20px; background: #94a3b8;"></div>`;
        
        state.transitions.forEach(transition => {
          const targetState = transition.to;
          const trigger = transition.trigger.replace(/_/g, ' ');
          
          html += `
            <div style="
              display: flex; 
              align-items: center; 
              gap: 10px; 
              padding: 8px 15px; 
              background: #f1f5f9; 
              border-radius: 15px;
              font-size: 14px;
              color: #475569;
            ">
              <span>${trigger}</span>
              <span>→</span>
              <span style="font-weight: 500;">${targetState}</span>
            </div>
          `;
          
          if (transition !== state.transitions[state.transitions.length - 1]) {
            html += `<div style="width: 2px; height: 15px; background: #cbd5e1;"></div>`;
          }
        });
        
        if (index < states.length - 1) {
          html += `<div style="width: 2px; height: 20px; background: #94a3b8;"></div>`;
        }
      }
    });
    
    html += `
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
      </div>
    `;
    
    return html;
  }

  /**
   * Clear the container
   */
  public clear(): void {
    this.container.innerHTML = '';
  }
}
