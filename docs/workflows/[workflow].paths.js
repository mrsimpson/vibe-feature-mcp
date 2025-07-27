import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function getAvailableWorkflows() {
  try {
    // Read the BundledWorkflows.ts file and extract workflow names
    const bundledWorkflowsPath = resolve(__dirname, '../../workflow-visualizer/src/services/BundledWorkflows.ts')
    const content = readFileSync(bundledWorkflowsPath, 'utf8')
    
    // Extract workflow names from the BUNDLED_WORKFLOWS object
    const workflowMatch = content.match(/export const BUNDLED_WORKFLOWS[^{]*{([^}]*)}/s)
    if (!workflowMatch) {
      throw new Error('Could not parse BUNDLED_WORKFLOWS')
    }
    
    const workflowsSection = workflowMatch[1]
    const workflows = []
    const lines = workflowsSection.split('\n')
    
    for (const line of lines) {
      const match = line.match(/['"]([^'"]+)['"]:\s*/)
      if (match) {
        workflows.push(match[1])
      }
    }
    
    return workflows
  } catch (error) {
    console.error('Failed to parse BundledWorkflows.ts:', error)
    return []
  }
}

export default {
  paths() {
    const workflows = getAvailableWorkflows()
    return workflows.map(workflow => ({
      params: { workflow }
    }))
  }
}