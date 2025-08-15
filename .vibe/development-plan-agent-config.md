# Development Plan: responsible-vibe (agent-config branch)

*Generated on 2025-08-15 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Improve the responsible-vibe-mcp CLI to generate configuration instructions for different coding agents (Claude Code, Amazon Q) that bundle both the system prompt and MCP server configuration, making setup easier for users.

## Explore
### Tasks
- [ ] Define CLI interface and command structure
- [ ] Determine customization options needed

### Completed
- [x] Created development plan file
- [x] Analyzed current CLI structure and system prompt generation
- [x] Examined user's sample Amazon Q configuration format
- [x] Research Claude Code configuration format
- [x] Identified what configuration formats need to be supported
- [x] Understand the current setup pain points for users
- [x] Define CLI interface and command structure
- [x] Determine customization options needed

## Plan

### Phase Entrance Criteria:
- [x] Current CLI structure and capabilities are understood
- [x] Configuration formats for different agents are documented
- [x] User requirements and pain points are clearly defined
- [x] Scope of the feature is well-defined

### Tasks
- [x] Analyze existing CLI argument parsing structure
- [x] Design configuration generation architecture
- [x] Define configuration templates for each agent type
- [x] Plan file structure and output locations
- [x] Identify integration points with existing system prompt generation
- [x] Plan error handling and validation

### Completed
- [x] Created detailed implementation plan

## Code

### Phase Entrance Criteria:
- [x] Implementation plan is complete and detailed
- [x] Technical approach is validated
- [x] All dependencies and integration points are identified
- [x] User interface design is finalized

### Tasks
*All tasks completed*

### Completed
- [x] Add --generate-config flag to CLI argument parsing in src/index.ts
- [x] Create abstract ConfigGenerator base class with shared utilities
- [x] Create ConfigGeneratorFactory with createGenerator method
- [x] Implement AmazonQConfigGenerator class (single JSON file)
- [x] Implement ClaudeConfigGenerator class (3 files: CLAUDE.md, .mcp.json, settings.json)
- [x] Implement GeminiConfigGenerator class (settings.json, GEMINI.md)
- [x] Create main generateConfig function using factory pattern
- [x] Integrate with existing system prompt generation in base class
- [x] Add file writing utilities with error handling in base class
- [x] Add input validation and factory error handling
- [x] Update CLI help text to include new flag
- [x] Fix allowed tools to only include the four specified tools
- [x] Test configuration generation for all three agent types
- [x] Fix Amazon Q configuration to output to .amazonq/cli-agents directory
- [x] Rename amazonq to amazonq-cli for CLI distinction
- [x] Fix duplicate error reporting
- [x] Suppress noisy info logs during CLI operations

## Commit

### Phase Entrance Criteria:
- [ ] All planned functionality is implemented
- [ ] Code quality standards are met
- [ ] Tests are passing
- [ ] Documentation is updated

### Tasks
*All tasks completed*

### Completed
- [x] Review implementation and ensure code quality
- [x] Run tests to verify no regressions
- [x] Clean up temporary code and comments
- [x] Verify all functionality works as expected
- [x] Update README.md with new --generate-config feature
- [x] Update any user guides or documentation
- [x] Prepare for final delivery

## Key Decisions
- Amazon Q uses a comprehensive agent configuration format that bundles system prompt, MCP servers, tools, and permissions
- Claude Code uses separate files: CLAUDE.md (prompt), .mcp.json (MCP config), settings.json (security/permissions)
- Gemini CLI uses comprehensive settings file + GEMINI.md for prompt
- Current CLI already has good structure with flag-based commands (--system-prompt, --visualize, etc.)
- User wants to allow whats_next, conduct_review, list_workflows, get_tool_info by default
- Three distinct configuration patterns identified:
  1. **Single comprehensive file** (Amazon Q): All-in-one JSON with prompt, MCP, tools, permissions
  2. **Split files** (Claude Code): Separate files for different concerns (prompt, MCP, settings)
  3. **Settings + prompt files** (Gemini CLI): Settings file + separate prompt file
- **CLI Interface Decisions**:
  - Use `--generate-config <agent>` flag where agent = amazonq|claude|gemini
  - Default output to current directory (.) with no additional path options
  - Hard-code allowed tools: whats_next, conduct_review, list_workflows, get_tool_info
  - Default agent name: "vibe"
  - No additional customization options for initial implementation
- **Implementation Architecture**:
  - Extend existing CLI argument parsing in src/index.ts
  - Create new config generator module with **factory pattern** for extensibility
  - Each agent type has its own generator class with single responsibility
  - Abstract base class provides shared utilities (system prompt, file writing, MCP config)
  - Factory class creates appropriate generator based on agent type
  - Reuse existing system prompt generation functionality
  - Use JSON templates for each agent type with variable substitution
  - Implement file writing with proper error handling
  - **Factory Pattern**: ConfigGeneratorFactory creates appropriate generator based on agent type
- **Factory Pattern Benefits**:
  - Single responsibility per generator class
  - Easy extensibility for future agent types
  - Shared utilities in base class
  - Independent testing and maintenance
  - Type-safe generator creation
- **Final Implementation Details**:
  - Amazon Q CLI: generates .amazonq/cli-agents/vibe.json
  - Claude Code: generates CLAUDE.md, .mcp.json, settings.json in current directory
  - Gemini CLI: generates settings.json, GEMINI.md in current directory
  - Only four tools allowed by default: whats_next, conduct_review, list_workflows, get_tool_info
  - Duplicate error reporting fixed
  - Info logs suppressed during CLI operations using LOG_LEVEL=ERROR

## Factory Pattern Architecture

### Class Structure
```typescript
// Base abstract class
abstract class ConfigGenerator {
  abstract generate(outputDir: string): Promise<void>;
  protected getSystemPrompt(): string; // Reuses existing system prompt generation
  protected writeFile(path: string, content: string): Promise<void>; // Shared file writing
  protected getDefaultMcpConfig(): object; // Shared MCP configuration
}

// Concrete implementations
class AmazonQConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    // Generate single vibe.json file
  }
}

class ClaudeConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    // Generate CLAUDE.md, .mcp.json, settings.json
  }
}

class GeminiConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    // Generate settings.json, GEMINI.md
  }
}

// Factory class
class ConfigGeneratorFactory {
  static createGenerator(agent: string): ConfigGenerator {
    switch (agent) {
      case 'amazonq': return new AmazonQConfigGenerator();
      case 'claude': return new ClaudeConfigGenerator();
      case 'gemini': return new GeminiConfigGenerator();
      default: throw new Error(`Unsupported agent: ${agent}`);
    }
  }
}

// Main function
export async function generateConfig(agent: string, outputDir: string): Promise<void> {
  const generator = ConfigGeneratorFactory.createGenerator(agent);
  await generator.generate(outputDir);
}
```

### Benefits of Factory Pattern
- **Single Responsibility**: Each generator class handles only one agent type
- **Extensibility**: Easy to add new agents by creating new generator classes
- **Maintainability**: Changes to one agent don't affect others
- **Testability**: Each generator can be tested independently
- **Code Reuse**: Shared utilities in base class (system prompt, file writing, MCP config)
- **Type Safety**: Factory ensures only valid generators are created

### Future Extensibility Example
```typescript
// Adding a new agent is simple:
class VSCodeConfigGenerator extends ConfigGenerator {
  async generate(outputDir: string): Promise<void> {
    // Generate VSCode-specific configuration
  }
}

// Update factory:
case 'vscode': return new VSCodeConfigGenerator();
```

## Implementation Plan

### 1. CLI Integration
- **Location**: `src/index.ts`
- **Approach**: Add `--generate-config` flag to existing argument parsing
- **Validation**: Ensure agent parameter is one of: amazonq, claude, gemini
- **Error Handling**: Show usage help for invalid agent types

### 2. Configuration Generator Module (Factory Pattern)
- **Location**: `src/config-generator.ts` (new file)
- **Architecture**: 
  - **Abstract Base Class**: `ConfigGenerator` with abstract `generate()` method
  - **Concrete Implementations**: `AmazonQConfigGenerator`, `ClaudeConfigGenerator`, `GeminiConfigGenerator`
  - **Factory Class**: `ConfigGeneratorFactory` with `createGenerator(agent: string)` method
  - **Main Function**: `generateConfig(agent: string, outputDir: string)` uses factory
  - **Single Responsibility**: Each generator class handles only one agent type
  - **Extensibility**: Easy to add new agent types by creating new generator classes

### 3. Generator Class Structure
- **Base Interface**: 
  ```typescript
  abstract class ConfigGenerator {
    abstract generate(outputDir: string): Promise<void>;
    protected getSystemPrompt(): string; // Shared utility
    protected writeFile(path: string, content: string): Promise<void>; // Shared utility
  }
  ```
- **Amazon Q Generator**: Handles single JSON file generation
- **Claude Generator**: Handles multiple file generation (CLAUDE.md, .mcp.json, settings.json)
- **Gemini Generator**: Handles settings.json + GEMINI.md generation
- **Factory**: Maps agent strings to appropriate generator classes
- **Amazon Q Template**:
  - Single JSON file with name, description, prompt, mcpServers, tools, allowedTools
  - Hard-coded tool permissions for vibe-specific tools
  - MCP server configuration for responsible-vibe-mcp
- **Claude Code Templates**:
  - CLAUDE.md: System prompt content
  - .mcp.json: MCP server configuration
  - settings.json: Tool permissions and security settings
- **Gemini CLI Templates**:
  - settings.json: Comprehensive configuration
  - GEMINI.md: Context/prompt file

### 4. System Prompt Integration
- **Reuse**: Existing `generateSystemPrompt()` function from `src/system-prompt-generator.ts`
- **Approach**: Call existing function to get prompt content for templates
- **Consistency**: Ensures generated configs use same prompt as CLI

### 5. File Output Strategy
- **Output Directory**: Current working directory (.)
- **File Names**: 
  - Amazon Q: `vibe.json`
  - Claude Code: `CLAUDE.md`, `.mcp.json`, `settings.json`
  - Gemini CLI: `settings.json`, `GEMINI.md`
- **Overwrite Behavior**: Overwrite existing files (simple approach)
- **Error Handling**: Handle file permission errors, disk space issues

### 6. Default Configuration Values
- **Agent Name**: "vibe"
- **Description**: "Responsible vibe development"
- **MCP Server**: responsible-vibe-mcp via npx
- **Allowed Tools**: whats_next, conduct_review, list_workflows, get_tool_info
- **Additional Tools**: Based on each platform's requirements

## Notes
- Amazon Q agent config includes: name, description, prompt, mcpServers, tools, allowedTools, toolsSettings, resources, hooks
- Claude Code splits: CLAUDE.md (prompt), .mcp.json (MCP servers), settings.json (permissions/security)
- Gemini CLI: settings.json (comprehensive config) + GEMINI.md (prompt/context)
- Current system prompt generation works well and can be reused
- CLI structure in src/index.ts is clean and extensible for new flags
- All three approaches support MCP server configuration
- Security/permissions handling varies significantly between platforms
- Simple, focused implementation - no complex customization for v1
- Template-based approach allows easy maintenance and updates
- Reusing existing system prompt generation ensures consistency
- File overwrite approach keeps implementation simple

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
