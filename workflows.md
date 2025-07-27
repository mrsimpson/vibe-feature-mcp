# Workflow Visualizer

Interactive visualization tool for exploring responsible-vibe workflow state machines.

<WorkflowVisualizer />

## Features

- **Interactive State Machine Diagrams**: Visual representation of workflow states and transitions
- **Side Panel Details**: Comprehensive information about selected states and transitions  
- **Path Highlighting**: Visual feedback when clicking transitions to show flow
- **Dual Workflow Loading**: Built-in workflows + custom YAML file upload

## Built-in Workflows

The visualizer includes these pre-loaded workflows:

1. **Waterfall** - Classical waterfall development process
2. **EPCC** - Explore, Plan, Code, Commit workflow  
3. **Bug Fix** - Focused workflow for debugging and fixing issues
4. **Minor Enhancement** - Streamlined workflow for small changes
5. **Greenfield** - Comprehensive workflow for new projects
6. **Posts** - Content creation workflow for blog posts and articles
7. **Slides** - Presentation creation workflow

## Usage

- **Click States**: View state details, description, and outgoing transitions
- **Click Transitions**: See transition details, instructions, and reasons
- **Upload YAML**: Add your own custom workflow files
- **Zoom & Pan**: Navigate large workflows with mouse/touch

## Custom Workflows

Upload your own YAML workflow files using the "Upload YAML" button. The visualizer supports standard YAML workflow format with file validation and error reporting.