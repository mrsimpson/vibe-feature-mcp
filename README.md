# Responsible Vibe MCP Server

[![Tests](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/pr.yml/badge.svg)](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/pr.yml)
[![Release](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/release.yml)
[![npm version](https://badge.fury.io/js/responsible-vibe-mcp.svg)](https://badge.fury.io/js/responsible-vibe-mcp)

A Model Context Protocol (MCP) server that acts as an intelligent conversation state manager and development guide for LLMs. This server orchestrates feature development conversations by maintaining state, determining development phases, and providing contextual instructions to guide LLMs through structured development processes.

## Overview

**Responsible Vibe MCP** serves as a conversation coordinator that:

- **Manages Conversation State**: Tracks development phase and conversation context across sessions
- **Guides LLM Behavior**: Provides phase-specific instructions telling the LLM what to do next
- **Maintains Project Memory**: Keeps a persistent markdown plan file that serves as long-term project memory
- **Orchestrates Development Flow**: Intelligently determines when to transition between development phases
- **Ensures Progress Tracking**: Continuously instructs the LLM to update completed tasks in the plan file

## Core Interaction Pattern

```
User: "implement feature X"
  ↓
LLM: calls whats_next()
  ↓
Responsible-Vibe-MCP: analyzes context → determines phase → returns instructions
  ↓
LLM: follows instructions → interacts with user → updates plan file
  ↓
LLM: calls whats_next() again
  ↓
[cycle continues...]
```

## Quick Start

### 🚨 **Critical: System Prompt Required**

**This MCP server requires a specific system prompt to function properly.** The LLM must be configured with the correct system prompt to know how to interact with the tools.

**Get the system prompt:**
```bash
npx responsible-vibe-mcp --system-prompt
```

**Configure your LLM with this system prompt** - without it, the server won't work correctly.

### Installation & Configuration

**Requirements**: Node.js 18.0.0 or higher

#### Claude Desktop Configuration

1. **Get the system prompt** and configure it in Claude Desktop
2. **Add the MCP server** to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "responsible-vibe-mcp": {
      "command": "npx",
      "args": ["responsible-vibe-mcp"]
    }
  }
}
```

#### Amazon Q Configuration

1. **Get the system prompt** and configure it in Amazon Q
2. **Add the MCP server** to your `.amazonq/mcp.json` file:

```json
{
  "mcpServers": {
    "responsible-vibe-mcp": {
      "command": "npx",
      "args": ["responsible-vibe-mcp"]
    }
  }
}
```

#### Custom Project Path

Configure a different project directory using the `PROJECT_PATH` environment variable:

```json
{
  "mcpServers": {
    "responsible-vibe-mcp": {
      "command": "npx",
      "args": ["responsible-vibe-mcp"],
      "env": {
        "PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### For Developers and Testing

Use the MCP Inspector to test and explore capabilities:

```bash
npx @modelcontextprotocol/inspector
```

Then configure it to connect to `npx responsible-vibe-mcp`.

## How It Works

The server provides tools that the LLM calls automatically based on the system prompt instructions:

- **LLM calls `whats_next()`** after each user interaction to get phase-specific guidance
- **LLM calls `proceed_to_phase()`** when ready to transition between development phases  
- **LLM calls `start_development()`** to begin with a chosen workflow
- **Server responds** with contextual instructions telling the LLM exactly what to do next

The user interacts normally with the LLM - the tool calls happen automatically in the background.

## Key Features

- **Review System**: Optional quality gates with configurable review perspectives before phase transitions
- **Workflow Visualizer**: Interactive web interface for exploring workflow state machines
- **Git Integration**: Optional automatic commits with intelligent defaults  
- **State Persistence**: Conversation state survives server restarts
- **Multi-Project Support**: Handle multiple concurrent project conversations
- **Branch Awareness**: Separate development contexts for different git branches

### Review System

The review system provides optional quality gates before phase transitions, ensuring thorough evaluation of work before proceeding to the next development phase.

**Key Features:**
- **Configurable Reviews**: Enable/disable reviews per conversation using `require_reviews` parameter
- **Role-Based Perspectives**: Reviews from relevant expert perspectives (architect, security expert, UX expert, etc.)
- **Workflow Integration**: Review perspectives defined in workflow YAML files
- **Environment Adaptive**: Works in both sampling and non-sampling MCP environments

## Utility Commands

### Get System Prompt

```bash
# Get the system prompt for your LLM
npx responsible-vibe-mcp --system-prompt
```

### Workflow Visualizer

```bash
# Start the interactive workflow visualizer
npx responsible-vibe-mcp --visualize
# or
npx responsible-vibe-mcp --viz
```

### Help and Version

```bash
npx responsible-vibe-mcp --help
npx responsible-vibe-mcp --version
```

## API Reference

The server provides tools that are automatically called by the LLM (not by users directly). The LLM uses these tools based on the system prompt instructions to coordinate development workflows.

### Tools

The LLM automatically calls these tools based on the system prompt instructions:

#### `start_development`
Begin a new development project with a structured workflow. Must be called before other development tools.

#### `whats_next`
Primary tool that analyzes conversation state and provides LLM instructions.

#### `proceed_to_phase`
Explicitly transition to a new development phase when current phase is complete.

#### `resume_workflow`
Resume development workflow after conversation compression with comprehensive project context.

#### `reset_development`
Reset conversation state and development progress (requires confirmation).

### Resources

#### `development-plan`
- **URI**: `plan://current`
- **Description**: Current development plan document (markdown)

#### `conversation-state`
- **URI**: `state://current`
- **Description**: Current conversation state and phase information

#### `system-prompt`
- **URI**: `system-prompt://`
- **Description**: Complete system prompt for LLM integration

### Prompts

#### `phase-guidance`
Provides detailed guidance prompts for specific development phases.

**Arguments:**
- `phase` (string): Development phase name
- `context` (string): Additional context or specific questions

## Example Usage

### Starting Development

```javascript
// Start with a specific workflow
start_development({ workflow: "your-preferred-workflow" })

// With git commit configuration
start_development({
  workflow: "your-workflow",
  commit_behaviour: "end"
})
```

### Basic Development Flow

```javascript
// LLM calls after each user interaction
whats_next({
  context: "user wants to add authentication",
  user_input: "implement user login",
  conversation_summary: "Working on user authentication feature"
})

// When phase is complete, transition explicitly
proceed_to_phase({
  target_phase: "next-phase",
  reason: "current phase tasks completed"
})
```

## Documentation

For detailed information, see:

- **[Architecture](./docs/ARCHITECTURE.md)** - Detailed system architecture and components
- **[Examples](./docs/EXAMPLES.md)** - Comprehensive interaction examples and workflows
- **[Development](./docs/DEVELOPMENT.md)** - Testing, logging, and debugging information
- **[Git Integration](./docs/git-commit-feature.md)** - Git commit feature documentation

## Contributing

This project uses conventional commits for version management. When contributing:

- Use conventional commit format
- Run tests with `npm run test:run`
- Ensure all tests pass before submitting PRs

## License

[License information]
