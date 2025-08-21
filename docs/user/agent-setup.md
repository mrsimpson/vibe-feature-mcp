# Agent Setup Guide

This guide explains how to set up AI coding agents to work with the responsible-vibe-mcp server.

## Overview

The responsible-vibe-mcp server requires proper integration with an AI coding agent. The agent needs:

1. **System Prompt Configuration**: Instructions on how to use the MCP tools
2. **MCP Server Connection**: Configuration to connect to the responsible-vibe-mcp server
3. **Tool Permissions**: Access to call the necessary MCP tools

## Quick Setup (Recommended)

Use the automated configuration generator for your preferred agent:

### Amazon Q CLI

```bash
npx responsible-vibe-mcp --generate-config amazonq-cli
```

**Creates**: `.amazonq/cli-agents/vibe.json`

### Claude Code

```bash
npx responsible-vibe-mcp --generate-config claude
```

**Creates**: `CLAUDE.md`, `.mcp.json`, `settings.json`

### Gemini CLI

```bash
npx responsible-vibe-mcp --generate-config gemini
```

**Creates**: `settings.json`, `GEMINI.md`

## Manual Setup

If you prefer manual configuration or use a different agent:

### Step 1: Get the System Prompt

```bash
npx responsible-vibe-mcp --system-prompt
```

Copy the output and configure it in your AI agent as the system prompt or rules.

### Step 2: Configure MCP Server Connection

Add the responsible-vibe-mcp server to your agent's MCP configuration:

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

**For Amazon Q** (`.amazonq/mcp.json`):

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

### Step 3: Configure Tool Permissions

Ensure your agent has permission to call these essential tools:

- `whats_next`
- `start_development`
- `proceed_to_phase`
- `conduct_review`
- `list_workflows`
- `get_tool_info`

## Agent-Specific Instructions

### Amazon Q CLI

**Automated Setup**:

```bash
npx responsible-vibe-mcp --generate-config amazonq-cli
```

**Manual Setup**:

1. Create `.amazonq/cli-agents/vibe.json`:

```json
{
  "name": "Vibe Development Assistant",
  "systemPrompt": "[paste system prompt here]",
  "mcpServers": {
    "responsible-vibe-mcp": {
      "command": "npx",
      "args": ["responsible-vibe-mcp"]
    }
  },
  "allowedTools": [
    "responsible-vibe-mcp___whats_next",
    "responsible-vibe-mcp___start_development",
    "responsible-vibe-mcp___proceed_to_phase",
    "responsible-vibe-mcp___conduct_review",
    "responsible-vibe-mcp___list_workflows",
    "responsible-vibe-mcp___get_tool_info"
  ]
}
```

2. Use the agent:

```bash
q chat --agent vibe
```

### Claude Desktop

**Automated Setup**:

```bash
npx responsible-vibe-mcp --generate-config claude
```

**Manual Setup**:

1. Add system prompt to Claude's custom instructions
2. Configure MCP server in `claude_desktop_config.json`
3. Restart Claude Desktop

### Claude Code (VS Code Extension)

**Automated Setup**:

```bash
npx responsible-vibe-mcp --generate-config claude
```

**Manual Setup**:

1. Create `.mcp.json` with server configuration
2. Create `CLAUDE.md` with system prompt as rules
3. Configure VS Code settings if needed

### Gemini CLI

**Automated Setup**:

```bash
npx responsible-vibe-mcp --generate-config gemini
```

**Manual Setup**:

1. Configure system prompt in Gemini settings
2. Set up MCP server connection
3. Ensure tool permissions are granted

## Custom Project Path

To use a different project directory, set the `PROJECT_PATH` environment variable:

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

## Verification

After setup, verify the integration works:

1. **Start a conversation** with your AI agent
2. **Ask for development help**: "Help me implement a new feature"
3. **Check for tool calls**: The agent should automatically call `whats_next()`
4. **Verify plan file creation**: Look for `.vibe/development-plan-*.md` files

## Troubleshooting

### Common Issues

**Agent doesn't call MCP tools**:

- Verify system prompt is configured correctly
- Check MCP server connection in agent settings
- Ensure tool permissions are granted

**"Tool not found" errors**:

- Verify MCP server is running (`npx responsible-vibe-mcp` works)
- Check server configuration in agent settings
- Restart your agent/IDE

**System prompt not working**:

- Use exact output from `--system-prompt` command
- Don't modify the system prompt text
- Ensure it's configured as system prompt, not user message

**Project path issues**:

- Verify `PROJECT_PATH` environment variable if using custom path
- Ensure the path exists and is writable
- Check file permissions

### Getting Help

1. **Check server status**: Run `npx responsible-vibe-mcp` directly to test
2. **Verify configuration**: Use `--generate-config` to create fresh config
3. **Review logs**: Check your agent's logs for MCP-related errors
4. **Test with MCP Inspector**: Use `npx @modelcontextprotocol/inspector` for debugging

## Advanced Configuration

### Multiple Projects

You can set up different configurations for different projects by using different `PROJECT_PATH` values or creating separate agent configurations.

### Custom Workflows

If you have custom workflows in `.vibe/workflow.yaml`, the system will automatically detect and use them.

### Development vs Production

For development/testing, you can run the MCP server directly:

```bash
npx responsible-vibe-mcp
```

For production use, the agent will automatically spawn the server as needed.

## Next Steps

Once your agent is set up:

1. **Read [How It Works](./how-it-works.md)** to understand the development flow
2. **Try a simple feature**: Ask your agent to help implement something small
3. **Explore workflows**: Use `list_workflows` to see available development approaches
4. **Check examples**: Review the comprehensive examples in the documentation

The agent will guide you through structured development workflows, maintaining project context and helping you build features systematically.
