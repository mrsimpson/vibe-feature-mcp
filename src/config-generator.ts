/**
 * Configuration Generator for Different AI Coding Agents
 *
 * This module implements a factory pattern to generate configuration files
 * for different AI coding agents (Amazon Q, Claude Code, Gemini CLI).
 * Each agent has its own generator class with single responsibility.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { generateSystemPrompt } from './system-prompt-generator.js';
import { StateMachineLoader } from './state-machine-loader.js';
import {} from './logger.js';

/**
 * Abstract base class for configuration generators
 */
abstract class ConfigGenerator {
  /**
   * Generate configuration files for the specific agent
   */
  abstract generate(outputDir: string): Promise<void>;

  /**
   * Get the system prompt using existing generation logic
   * Suppresses info logs during CLI operations
   */
  protected getSystemPrompt(): string {
    try {
      // Create loggers with ERROR level to suppress info messages
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(process.cwd());
      return generateSystemPrompt(stateMachine);
    } catch (error) {
      throw new Error(`Failed to generate system prompt: ${error}`);
    }
  }

  /**
   * Write file with proper error handling
   */
  protected async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await writeFile(filePath, content, 'utf-8');
      console.log(`✓ Generated: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  /**
   * Get default MCP server configuration
   */
  protected getDefaultMcpConfig(): object {
    return {
      'responsible-vibe-mcp': {
        command: 'npx',
        args: ['responsible-vibe-mcp'],
      },
    };
  }

  /**
   * Get default allowed tools for responsible-vibe-mcp
   */
  protected getDefaultAllowedTools(): string[] {
    return ['whats_next', 'conduct_review', 'list_workflows', 'get_tool_info'];
  }
}

/**
 * Amazon Q Configuration Generator
 * Generates a single comprehensive JSON file
 */
class AmazonQConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    const systemPrompt = this.getSystemPrompt();
    const mcpServers = this.getDefaultMcpConfig();

    const config = {
      name: 'vibe',
      description: 'Responsible vibe development',
      prompt: systemPrompt,
      mcpServers: mcpServers,
      tools: [
        'execute_bash',
        'fs_read',
        'fs_write',
        'report_issue',
        'knowledge',
        'thinking',
        'use_aws',
        '@responsible-vibe-mcp',
      ],
      allowedTools: [
        'fs_read',
        'fs_write',
        '@responsible-vibe-mcp/whats_next',
        '@responsible-vibe-mcp/conduct_review',
        '@responsible-vibe-mcp/list_workflows',
        '@responsible-vibe-mcp/get_tool_info',
      ],
      toolsSettings: {
        execute_bash: {
          alwaysAllow: [
            {
              preset: 'readOnly',
            },
          ],
        },
        use_aws: {
          alwaysAllow: [
            {
              preset: 'readOnly',
            },
          ],
        },
      },
      resources: ['file://README.md', 'file://.amazonq/rules/**/*.md'],
      hooks: {},
    };

    // Create .amazonq/cli-agents directory
    const amazonqDir = join(outputDir, '.amazonq', 'cli-agents');
    await mkdir(amazonqDir, { recursive: true });

    const configPath = join(amazonqDir, 'vibe.json');
    await this.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}

/**
 * Claude Code Configuration Generator
 * Generates multiple files: CLAUDE.md, .mcp.json, settings.json
 */
class ClaudeConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    const systemPrompt = this.getSystemPrompt();
    const mcpServers = this.getDefaultMcpConfig();

    // Generate CLAUDE.md (system prompt)
    const claudeMdPath = join(outputDir, 'CLAUDE.md');
    await this.writeFile(claudeMdPath, systemPrompt);

    // Generate .mcp.json (MCP server configuration)
    const mcpConfig = {
      mcpServers: mcpServers,
    };
    const mcpJsonPath = join(outputDir, '.mcp.json');
    await this.writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));

    // Generate settings.json (permissions and security)
    const settings = {
      permissions: {
        allow: [
          'MCP(responsible-vibe-mcp:whats_next)',
          'MCP(responsible-vibe-mcp:conduct_review)',
          'MCP(responsible-vibe-mcp:list_workflows)',
          'MCP(responsible-vibe-mcp:get_tool_info)',
          'Read(README.md)',
          'Read(./.vibe/**)',
          'Write(./.vibe/**)',
        ],
        ask: ['Bash(*)', 'Write(**)'],
        deny: ['Read(./.env)', 'Read(./.env.*)', 'Read(./secrets/**)'],
      },
    };
    const settingsPath = join(outputDir, 'settings.json');
    await this.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }
}

/**
 * Gemini CLI Configuration Generator
 * Generates settings.json and GEMINI.md
 */
class GeminiConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    const systemPrompt = this.getSystemPrompt();
    const mcpServers = this.getDefaultMcpConfig();
    const allowedTools = this.getDefaultAllowedTools();

    // Generate settings.json (comprehensive configuration)
    const settings = {
      contextFileName: 'GEMINI.md',
      autoAccept: false,
      theme: 'Default',
      vimMode: false,
      sandbox: false,
      mcpServers: mcpServers,
      allowMCPServers: ['responsible-vibe-mcp'],
      coreTools: ['ReadFileTool', 'WriteFileTool', 'GlobTool', 'ShellTool'],
      telemetry: {
        enabled: false,
        target: 'local',
        otlpEndpoint: 'http://localhost:4317',
        logPrompts: false,
      },
      usageStatisticsEnabled: false,
      hideTips: false,
      hideBanner: false,
    };
    const settingsPath = join(outputDir, 'settings.json');
    await this.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Generate GEMINI.md (context/prompt file)
    const geminiMdContent = `# Vibe Development Agent

${systemPrompt}

## Project Context

This agent is configured to work with the responsible-vibe-mcp server for structured development workflows.

## Available Tools

The following tools are available for development tasks:
${allowedTools.map(tool => `- ${tool}`).join('\n')}
`;
    const geminiMdPath = join(outputDir, 'GEMINI.md');
    await this.writeFile(geminiMdPath, geminiMdContent);
  }
}

/**
 * Factory class for creating configuration generators
 */
class ConfigGeneratorFactory {
  static createGenerator(agent: string): ConfigGenerator {
    switch (agent.toLowerCase()) {
      case 'amazonq-cli':
        return new AmazonQConfigGenerator();
      case 'claude':
        return new ClaudeConfigGenerator();
      case 'gemini':
        return new GeminiConfigGenerator();
      default:
        throw new Error(
          `Unsupported agent: ${agent}. Supported agents: amazonq-cli, claude, gemini`
        );
    }
  }
}

/**
 * Main function to generate configuration for specified agent
 */
export async function generateConfig(
  agent: string,
  outputDir: string = '.'
): Promise<void> {
  console.log(`Generating configuration for ${agent}...`);

  const generator = ConfigGeneratorFactory.createGenerator(agent);
  await generator.generate(outputDir);

  console.log(`✅ Configuration generated successfully for ${agent}`);
}
