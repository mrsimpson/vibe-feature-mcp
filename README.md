# Responsible Vibe MCP Server

[![Tests](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/pr.yml/badge.svg)](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/pr.yml)
[![Release](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/mrsimpson/vibe-feature-mcp/actions/workflows/release.yml)
[![npm version](https://badge.fury.io/js/responsible-vibe-mcp.svg)](https://badge.fury.io/js/responsible-vibe-mcp)

A Model Context Protocol (MCP) server that acts as an intelligent conversation state manager and development guide for LLMs. This server orchestrates feature development conversations by maintaining state, determining development phases, and providing contextual instructions to guide LLMs through structured development processes.

## Overview

**Responsible Vibe MCP** serves as a conversation coordinator that:

- **Manages Conversation State**: Tracks development phase and conversation context across sessions
- **Guides LLM Behavior**: Provides phase-specific instructions telling the LLM what to do next
- **Maintains Project Memory**: Comprehensive long-term memory system with persistent plan files and structured project artifacts
- **Orchestrates Development Flow**: Intelligently determines when to transition between development phases
- **Ensures Progress Tracking**: Continuously instructs the LLM to update completed tasks in the plan file
- **Manages Project Artifacts**: Intelligent documentation system that creates, links, and maintains project documentation across conversations

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

#### 🚀 **Quick Setup (Recommended)**

Use the automatic configuration generator to set up your AI coding agent:

```bash
# For Amazon Q CLI
npx responsible-vibe-mcp --generate-config amazonq-cli

# For Claude Code  
npx responsible-vibe-mcp --generate-config claude

# For Gemini CLI
npx responsible-vibe-mcp --generate-config gemini
```

This automatically creates all necessary configuration files with the correct system prompt and MCP server settings.

#### Manual Configuration

Alternatively, you can configure manually:

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

- **Comprehensive Long-Term Memory System**: Persistent project artifacts and documentation that survive across conversations and sessions
- **Project Documentation System**: Intelligent artifact management with dynamic template discovery and workflow integration
- **Review System**: Optional quality gates with configurable review perspectives before phase transitions
- **Workflow Visualizer**: Interactive web interface for exploring workflow state machines
- **Git Integration**: Optional automatic commits with intelligent defaults  
- **State Persistence**: Conversation state survives server restarts
- **Multi-Project Support**: Handle multiple concurrent project conversations
- **Branch Awareness**: Separate development contexts for different git branches

### Long-Term Memory System

The comprehensive artifacts management system provides persistent project memory through two key components:

**Project Documentation Artifacts:**
- **Architecture, Requirements, and Design Documents**: Structured documentation using templates (Arc42, EARS, Comprehensive) or linked existing files
- **Workflow Variable Integration**: Documents are referenced in workflows as `$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`, `$DESIGN_DOC`
- **Dynamic Content Injection**: LLM receives contextual documentation during each development phase
- **Flexible Setup**: Create from templates, link existing files, or disable with "none" option

**Development Plan Files as Process Memory:**
- **Central Process Tracking**: Markdown files tracking tasks, decisions, and project evolution
- **Cross-Session Continuity**: Maintains project context across conversations and server restarts
- **Decision Documentation**: Records architectural choices and implementation rationale
- **Fallback Documentation**: Used when specific document types are disabled

**Memory Persistence Features:**
- **Artifact Linking**: Connect existing project files (README.md, docs/) to the memory system
- **Template-Based Structure**: Standardized documentation formats for consistent organization
- **Workflow Integration**: Documents contextually referenced using variables in workflow instructions
- **Branch-Aware Memory**: Separate memory contexts for different git branches
- **Multi-Project Memory**: Handle multiple concurrent projects with isolated memory spaces

**Benefits for Development:**
- **Context Preservation**: Never lose project context between conversations
- **Informed Decision Making**: LLM always has access to relevant project documentation
- **Documentation-Driven Development**: Workflows enforce reference to project specifications
- **Progressive Context Building**: Context grows naturally as the project evolves through phases

### Project Documentation System

The project documentation system provides intelligent artifact management with:

- **Dynamic Template Discovery**: Automatically discovers available templates from the file system
- **File Linking Support**: Link existing documentation files (like README.md) instead of creating new ones
- **Workflow Integration**: Workflows reference project documents contextually (e.g., `$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`)
- **Intelligent Setup Guidance**: Analyzes workflows to detect missing documents and provides targeted setup recommendations
- **Multiple Template Types**: Support for Arc42, EARS, Comprehensive, and Freestyle documentation approaches
- **Symlink Management**: Uses symbolic links to maintain standard paths while referencing existing files
- **Zero Maintenance**: Add new templates without code changes - just drop files in the templates directory

#### **File Linking Capabilities**

The system now supports linking existing documentation files instead of only creating new structured documents:

**Mixed Usage Examples:**
```bash
# Link existing README.md as requirements, create new architecture doc
setup_project_docs({
  architecture: "arc42",
  requirements: "README.md", 
  design: "docs/design.md"
})

# Use existing files for all document types
setup_project_docs({
  architecture: "ARCHITECTURE.md",
  requirements: "README.md",
  design: "README.md"  # Same file can serve multiple purposes
})

# Disable specific document types with "none" template
setup_project_docs({
  architecture: "arc42",
  requirements: "none",     # Creates placeholder, uses plan file instead
  design: "comprehensive"
})

# Mixed approach: templates, files, and disabled docs
setup_project_docs({
  architecture: "README.md",  # Link existing file
  requirements: "ears",       # Use template
  design: "none"              # Disable with placeholder
})
```

**Supported File Patterns:**
- `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `REQUIREMENTS.md`
- Files in `docs/` folder: `docs/architecture.md`, `docs/requirements.md`
- Absolute and relative file paths
- Multiple document types can reference the same source file
- **"none" template**: Creates placeholder that instructs LLM to use plan file instead

**How It Works:**
1. **Template OR File Path OR "none"**: Each parameter accepts template names, file paths, or "none"
2. **Automatic Detection**: System detects existing documentation files and suggests them
3. **Symlink Creation**: Creates symbolic links in `.vibe/docs/` pointing to existing files
4. **Placeholder Creation**: "none" creates instructional placeholder for plan-file-only workflows
5. **Standard Integration**: Workflows continue to work with standard document paths

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

### Generate Agent Configuration

Automatically generate configuration files for different AI coding agents with pre-configured settings for responsible-vibe-mcp:

```bash
# Generate Amazon Q CLI configuration
npx responsible-vibe-mcp --generate-config amazonq-cli
# Creates: .amazonq/cli-agents/vibe.json

# Generate Claude Code configuration  
npx responsible-vibe-mcp --generate-config claude
# Creates: CLAUDE.md, .mcp.json, settings.json

# Generate Gemini CLI configuration
npx responsible-vibe-mcp --generate-config gemini  
# Creates: settings.json, GEMINI.md
```

**Features:**
- **Pre-configured MCP Server**: Automatically includes responsible-vibe-mcp server configuration
- **System Prompt Integration**: Uses the same system prompt as `--system-prompt` command
- **Default Tool Permissions**: Includes essential tools (`whats_next`, `conduct_review`, `list_workflows`, `get_tool_info`)
- **Agent-Specific Formats**: Generates files in the correct format and location for each agent
- **Ready to Use**: Generated configurations work immediately without manual editing

This eliminates the manual setup process and ensures consistent configuration across different AI coding agents.

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

#### `setup_project_docs`
Set up project documentation artifacts using intelligent templates. Creates architecture, requirements, and design documents based on selected templates with dynamic template discovery.

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
- **[Long-Term Memory System](./docs/user/long-term-memory.md)** - Comprehensive guide to the artifacts management and memory system
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
