<template>
  <div id="workflow-visualizer-app">
    <header class="app-header">
      <h1>Workflow Visualizer</h1>
      <div class="workflow-controls">
        <select id="workflow-selector" class="workflow-selector">
          <option value="">Select a workflow...</option>
        </select>
        <input type="file" id="file-upload" accept=".yaml,.yml" class="file-upload">
        <label for="file-upload" class="file-upload-label">Upload YAML</label>
      </div>
    </header>

    <main class="app-main">
      <div class="diagram-container">
        <div id="diagram-canvas" class="diagram-canvas">
          <div class="loading-message">Select a workflow to visualize</div>
        </div>
      </div>
      
      <aside class="side-panel">
        <div class="side-panel-header">
          <h2>Details</h2>
        </div>
        <div class="side-panel-content">
          <div class="empty-state">
            Click on a state or transition to see details
          </div>
        </div>
      </aside>
    </main>

    <div id="error-container" class="error-container hidden">
      <div class="error-message">
        <span class="error-text"></span>
        <button class="error-close">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let workflowVisualizerApp: any = null

onMounted(async () => {
  try {
    console.log('Initializing Workflow Visualizer...')
    
    // Import the workflow visualizer modules
    const { WorkflowLoader } = await import('@workflow-visualizer/services/WorkflowLoader')
    const { FileUploadHandler } = await import('@workflow-visualizer/services/FileUploadHandler')
    const { ErrorHandler } = await import('@workflow-visualizer/utils/ErrorHandler')
    const { PlantUMLRenderer } = await import('@workflow-visualizer/visualization/PlantUMLRenderer')
    const { getRequiredElement } = await import('@workflow-visualizer/utils/DomHelpers')
    
    // Initialize the workflow visualizer (simplified version of main.ts logic)
    const workflowLoader = new WorkflowLoader()
    const errorHandler = new ErrorHandler()
    
    // Get DOM elements
    const workflowSelector = getRequiredElement<HTMLSelectElement>('#workflow-selector')
    const fileUploadInput = getRequiredElement<HTMLInputElement>('#file-upload')
    const diagramCanvas = getRequiredElement('#diagram-canvas')
    const sidePanelContent = getRequiredElement('.side-panel-content')
    const sidePanelHeader = getRequiredElement('.side-panel-header')
    
    // Initialize PlantUML renderer
    const plantUMLRenderer = new PlantUMLRenderer(diagramCanvas)
    
    // Initialize file upload handler
    const fileUploadHandler = new FileUploadHandler(fileUploadInput, workflowLoader)
    
    // Set up event listeners and populate workflow selector
    workflowSelector.addEventListener('change', async (event) => {
      const target = event.target as HTMLSelectElement
      const workflowName = target.value
      
      if (!workflowName) {
        diagramCanvas.innerHTML = '<div class="loading-message">Select a workflow to visualize</div>'
        return
      }
      
      try {
        diagramCanvas.innerHTML = '<div class="loading-message">Loading workflow...</div>'
        const workflow = await workflowLoader.loadBuiltinWorkflow(workflowName)
        await plantUMLRenderer.renderWorkflow(workflow)
        console.log(`Workflow loaded: ${workflow.name}`)
      } catch (error) {
        console.error('Failed to load workflow:', error)
        diagramCanvas.innerHTML = '<div class="loading-message">Failed to load workflow</div>'
      }
    })
    
    // Populate workflow selector
    const workflows = workflowLoader.getAvailableWorkflows()
    workflows.forEach(workflow => {
      const option = document.createElement('option')
      option.value = workflow.name
      option.textContent = `${workflow.displayName} - ${workflow.description}`
      workflowSelector.appendChild(option)
    })
    
    workflowVisualizerApp = { workflowLoader, plantUMLRenderer, fileUploadHandler, errorHandler }
    console.log('Workflow Visualizer initialized successfully')
  } catch (error) {
    console.error('Failed to load WorkflowVisualizerApp:', error)
    
    // Fallback: show error message
    const errorContainer = document.getElementById('error-container')
    const errorText = document.querySelector('.error-text')
    if (errorContainer && errorText) {
      errorText.textContent = 'Failed to load workflow visualizer'
      errorContainer.classList.remove('hidden')
    }
  }
})

onUnmounted(() => {
  // Clean up any resources
  workflowVisualizerApp = null
})
</script>

<style>
/* Workflow Visualizer styles - adapted from original CSS files */

/* CSS Variables */
#workflow-visualizer-app {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #64748b;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #dc2626;
  
  --color-white: #ffffff;
  --color-gray-50: #f8fafc;
  --color-gray-100: #f1f5f9;
  --color-gray-200: #e2e8f0;
  --color-gray-300: #cbd5e1;
  --color-gray-400: #94a3b8;
  --color-gray-500: #64748b;
  --color-gray-600: #475569;
  --color-gray-700: #334155;
  --color-gray-800: #1e293b;
  --color-gray-900: #0f172a;
  
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* Container for the entire visualizer */
#workflow-visualizer-app {
  width: 100%;
  min-height: 600px;
  background: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  font-family: var(--font-family-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-gray-900);
}

/* Ensure proper scoping within VitePress */
#workflow-visualizer-app * {
  box-sizing: border-box;
}

/* App Header */
#workflow-visualizer-app .app-header {
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
  padding: var(--spacing-lg);
}

#workflow-visualizer-app .app-header h1 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-gray-900);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

#workflow-visualizer-app .workflow-controls {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

#workflow-visualizer-app .workflow-selector {
  flex: 1;
  min-width: 200px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  background: var(--color-white);
  font-family: inherit;
  font-size: inherit;
  color: var(--color-gray-900);
}

#workflow-visualizer-app .file-upload {
  display: none;
}

#workflow-visualizer-app .file-upload-label {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: var(--color-white);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  border: none;
  font-family: inherit;
  font-size: inherit;
}

#workflow-visualizer-app .file-upload-label:hover {
  background: var(--color-primary-hover);
}

/* Main Layout */
#workflow-visualizer-app .app-main {
  display: flex;
  height: 500px;
}

#workflow-visualizer-app .diagram-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--color-white);
}

#workflow-visualizer-app .diagram-canvas {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

#workflow-visualizer-app .loading-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-gray-500);
  font-size: 1rem;
  font-style: italic;
}

/* Side Panel */
#workflow-visualizer-app .side-panel {
  width: 320px;
  border-left: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
  display: flex;
  flex-direction: column;
}

#workflow-visualizer-app .side-panel-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
  background: var(--color-white);
  display: flex;
  align-items: center;
}

#workflow-visualizer-app .side-panel-header h2 {
  margin: 0;
  color: var(--color-gray-900);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.2;
}

#workflow-visualizer-app .side-panel-content {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

#workflow-visualizer-app .empty-state {
  color: var(--color-gray-500);
  text-align: center;
  font-style: italic;
  padding: var(--spacing-xl) 0;
}

/* Detail sections */
#workflow-visualizer-app .detail-section {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
}

#workflow-visualizer-app .detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

#workflow-visualizer-app .detail-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-sm);
}

#workflow-visualizer-app .detail-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-gray-800);
  margin-bottom: var(--spacing-sm);
}

#workflow-visualizer-app .detail-content {
  color: var(--color-gray-700);
  line-height: 1.6;
  margin: 0;
}

#workflow-visualizer-app .code-block {
  background-color: var(--color-gray-100);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  font-family: var(--font-family-mono);
  font-size: 0.875rem;
  color: var(--color-gray-800);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: var(--spacing-sm) 0;
}

/* Badges */
#workflow-visualizer-app .badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-left: var(--spacing-sm);
}

#workflow-visualizer-app .badge-success {
  background-color: var(--color-success);
  color: var(--color-white);
}

/* Transitions list */
#workflow-visualizer-app .transitions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

#workflow-visualizer-app .transition-item {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  transition: all 0.2s ease;
}

#workflow-visualizer-app .transition-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

#workflow-visualizer-app .transition-trigger {
  font-weight: 600;
  color: var(--color-gray-900);
  margin-bottom: 0.25rem;
}

#workflow-visualizer-app .transition-target {
  color: var(--color-primary);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

#workflow-visualizer-app .transition-reason {
  color: var(--color-gray-600);
  font-size: 0.875rem;
}

/* Error container */
#workflow-visualizer-app .error-container {
  position: absolute;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 1000;
}

#workflow-visualizer-app .error-container.hidden {
  display: none;
}

#workflow-visualizer-app .error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--color-error);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  max-width: 300px;
  box-shadow: var(--shadow-md);
}

#workflow-visualizer-app .error-close {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
}

/* Buttons */
#workflow-visualizer-app button {
  cursor: pointer;
  font-family: inherit;
}

#workflow-visualizer-app select {
  cursor: pointer;
}

/* Back button */
#workflow-visualizer-app .back-button {
  background: none;
  border: none;
  color: var(--color-gray-500);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  margin-right: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

#workflow-visualizer-app .back-button:hover {
  background-color: var(--color-gray-100);
}

/* PlantUML diagram styles */
#workflow-visualizer-app .diagram-canvas svg {
  max-width: 100%;
  height: auto;
}

/* Clickable elements in diagrams */
#workflow-visualizer-app .clickable-transition {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

#workflow-visualizer-app .clickable-transition:hover {
  background-color: #f0f9ff;
}
</style>