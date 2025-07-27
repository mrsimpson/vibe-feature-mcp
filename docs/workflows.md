# Workflow Visualizer

Interactive visualization tool for exploring responsible-vibe workflow state machines.

<WorkflowVisualizer :showSidebar="false" />

## Features

- **Interactive State Machine Diagrams**: Visual representation of workflow states and transitions
- **Side Panel Details**: Comprehensive information about selected states and transitions  
- **Path Highlighting**: Visual feedback when clicking transitions to show flow
- **Dual Workflow Loading**: Built-in workflows + custom YAML file upload

## Built-in Workflows

The visualizer includes these pre-loaded workflows. Click any workflow name to view it in fullscreen:

1. **[Bug Fix](/responsible-vibe-mcp/workflows/bugfix)** - Focused workflow for debugging and fixing issues
2. **[EPCC](/responsible-vibe-mcp/workflows/epcc)** - Explore, Plan, Code, Commit workflow
3. **[Greenfield](/responsible-vibe-mcp/workflows/greenfield)** - Comprehensive workflow for new projects
4. **[Minor Enhancement](/responsible-vibe-mcp/workflows/minor)** - Streamlined workflow for small changes
5. **[Posts](/responsible-vibe-mcp/workflows/posts)** - Content creation workflow for blog posts and articles
6. **[Slides](/responsible-vibe-mcp/workflows/slides)** - Presentation creation workflow
7. **[Waterfall](/responsible-vibe-mcp/workflows/waterfall)** - Classical waterfall development process

## Usage

- **Click States**: View state details, description, and outgoing transitions
- **Click Transitions**: See transition details, instructions, and reasons
- **Upload YAML**: Add your own custom workflow files
- **Zoom & Pan**: Navigate large workflows with mouse/touch

## Custom Workflows

Upload your own YAML workflow files using the "Upload YAML" button. The visualizer supports standard YAML workflow format with file validation and error reporting.