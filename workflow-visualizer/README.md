# Workflow Visualizer

A modern web application for visualizing responsible-vibe workflow state machines. Built with TypeScript, D3.js, and Vite for workflow authors who need to understand and debug YAML-defined development workflows.

## Features

### 🎯 **Core Functionality**
- **Interactive State Machine Diagrams**: Visual representation of workflow states and transitions
- **Side Panel Details**: Comprehensive information about selected states and transitions
- **Path Highlighting**: Visual feedback when clicking transitions to show flow
- **Dual Workflow Loading**: Built-in workflows + custom YAML file upload

### 🎨 **Modern UI/UX**
- **Split-Panel Layout**: Diagram on left, details on right
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Styling**: Clean typography, consistent spacing, professional appearance
- **Interactive Elements**: Hover effects, click interactions, smooth animations

### 🔧 **Technical Features**
- **TypeScript**: Full type safety with existing project types
- **D3.js Visualization**: Professional state machine rendering with automatic layout
- **YAML Validation**: Comprehensive parsing and error handling
- **Error Handling**: User-friendly error messages and feedback
- **Hot Reload**: Vite dev server for fast development

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Installation & Development

```bash
# Navigate to the workflow visualizer directory
cd workflow-visualizer

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Usage

### Built-in Workflows

The visualizer comes with 5 pre-loaded workflows from the responsible-vibe project:

1. **Waterfall** - Classical waterfall development process
2. **EPCC** - Explore, Plan, Code, Commit workflow  
3. **Bug Fix** - Focused workflow for debugging and fixing issues
4. **Minor Enhancement** - Streamlined workflow for small changes
5. **Greenfield** - Comprehensive workflow for new projects

### Custom Workflows

Upload your own YAML workflow files using the "Upload YAML" button. The visualizer supports:

- ✅ Standard YAML workflow format
- ✅ File validation and error reporting
- ✅ Files up to 1MB in size
- ✅ `.yaml` and `.yml` extensions

### Interactions

- **Click States**: View state details, description, and outgoing transitions
- **Click Transitions**: See transition details, instructions, and reasons
- **Path Highlighting**: Visual feedback showing transition flow
- **Zoom & Pan**: Navigate large workflows with mouse/touch

## Architecture

### Project Structure

```
workflow-visualizer/
├── src/
│   ├── types/              # TypeScript type definitions
│   ├── services/           # Data layer (loading, parsing)
│   ├── visualization/      # D3.js rendering engine
│   ├── ui/                 # UI controllers and interactions
│   ├── utils/              # Shared utilities
│   └── main.ts             # Application entry point
├── styles/                 # CSS styling
├── index.html              # Main HTML file
└── vite.config.ts          # Vite configuration
```

### Key Components

- **DiagramRenderer**: Main D3.js orchestrator for state machine visualization
- **LayoutEngine**: Automatic positioning with force-directed, hierarchical, and circular layouts
- **StateRenderer**: Individual state node rendering with interactions
- **TransitionRenderer**: Transition arrows and labels with curved paths
- **WorkflowLoader**: Loads workflows from resources folder and uploaded files
- **YamlParser**: Comprehensive YAML validation and parsing

### Design Principles

- **Single Responsibility**: Each class has one clear purpose
- **Type Safety**: Full TypeScript coverage with strict checking
- **Verbose Code**: Clear, descriptive naming and explicit error handling
- **Modular Architecture**: Easy to test, maintain, and extend

## YAML Workflow Format

The visualizer expects workflows in the following format:

```yaml
name: "example"
description: "Example workflow description"
initial_state: "start"

states:
  start:
    description: "Starting state description"
    default_instructions: "Instructions for this state"
    transitions:
      - trigger: "next"
        to: "end"
        instructions: "Optional transition instructions"
        transition_reason: "Why this transition occurs"
  
  end:
    description: "End state description"
    default_instructions: "Final instructions"
    transitions: []
```

### Required Fields

- `name`: Workflow identifier
- `description`: Human-readable description
- `initial_state`: Starting state name
- `states`: Object containing state definitions

### State Definition

- `description`: State purpose and context
- `default_instructions`: Instructions when entering this state
- `transitions`: Array of possible transitions

### Transition Definition

- `trigger`: Event that causes this transition
- `to`: Target state name
- `transition_reason`: Explanation for the transition
- `instructions` (optional): Additional instructions for this transition

## Development

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting (if configured)
- **Conventional Commits**: Structured commit messages

### Testing

The visualizer integrates with the main project's test suite:

```bash
# Run all project tests (from main directory)
cd ..
npm test

# All tests should pass (149/149)
```

### Adding Features

1. **Services**: Add new data processing in `src/services/`
2. **Visualization**: Extend D3.js components in `src/visualization/`
3. **UI**: Add interactions in `src/ui/`
4. **Types**: Define interfaces in `src/types/`

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features Used**: ES2020, CSS Grid, Flexbox, SVG, Fetch API

## Performance

- **Bundle Size**: ~121KB (38KB gzipped)
- **Load Time**: < 1 second on modern connections
- **Memory Usage**: Optimized D3.js rendering with cleanup
- **Large Workflows**: Handles workflows with 20+ states efficiently

## Troubleshooting

### Common Issues

**YAML Upload Fails**
- Check file format matches the expected structure
- Ensure all required fields are present
- Verify file size is under 1MB

**Visualization Not Loading**
- Check browser console for JavaScript errors
- Ensure modern browser with SVG support
- Try refreshing the page

**Layout Issues**
- Try the "Fit to View" functionality (if implemented)
- Check responsive design on different screen sizes
- Verify CSS is loading correctly

### Debug Mode

Enable debug logging in browser console:
```javascript
localStorage.setItem('debug', 'workflow-visualizer:*');
```

## Contributing

This visualizer is part of the responsible-vibe MCP server project. To contribute:

1. Follow the existing code style and architecture
2. Add TypeScript types for new features
3. Test with multiple workflow files
4. Ensure responsive design works
5. Update documentation

## License

Same as the parent responsible-vibe project.

---

**Built with ❤️ for workflow authors who need to visualize complex state machines.**
