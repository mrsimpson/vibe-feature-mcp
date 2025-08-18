# Development

This document provides information for developers working on the Responsible Vibe MCP Server, including testing, logging, and debugging.

## Testing

The project includes comprehensive test coverage with different test execution options to balance thoroughness with development speed:

### Test Commands

#### Default Test Run (Quiet)
```bash
npm test          # Interactive test runner
npm run test:run  # Single test run (quiet, no noisy tests)
```
- Excludes the MCP contract test (which shows INFO logs due to SDK limitations)
- Clean output with ERROR-level logging only
- **Recommended for development** - fast and quiet

#### All Tests (Including Noisy)
```bash
npm run test:all  # Run all tests including noisy ones
```
- **10 test files**, **96+ tests**
- Includes the MCP contract test with spawned processes
- Shows INFO-level logs from MCP SDK (unavoidable)
- **Use for comprehensive testing** before commits/releases

#### Specific Test Categories
```bash
npm run test:noisy        # Run only the noisy MCP contract test
npm run test:mcp-contract # Run MCP contract test (with custom state machine check)
npm run test:ui           # Interactive test UI
```

### Test Configuration

The test setup automatically:
- Sets `LOG_LEVEL=ERROR` for clean output during testing
- Configures test environment variables (`NODE_ENV=test`, `VITEST=true`)
- Excludes noisy tests by default unless `INCLUDE_NOISY_TESTS=true`
- Uses TypeScript source files and compiled JavaScript as needed

## Testing Architecture

The project uses an innovative E2E testing approach without process spawning, providing consumer perspective testing with real file system integration.

### Testing Pattern

- **Production**: Client → Transport → Server → Components  
- **Testing**: Test → DirectInterface → Server → Components

### Test Structure

```typescript
it('should work end-to-end', async () => {
  const tempProject = createTempProjectWithDefaultStateMachine();
  const { client, cleanup } = await createE2EScenario({ tempProject });
  
  const result = await client.callTool('whats_next', {
    user_input: 'implement auth'
  });
  
  expect(result.phase).toBeDefined();
});
```

## Logging and Debugging

The server includes comprehensive logging with configurable levels for debugging, monitoring, and troubleshooting:

### Log Levels
- **DEBUG**: Detailed tracing and execution flow
- **INFO**: Success operations and important milestones (default)
- **WARN**: Expected errors and recoverable issues  
- **ERROR**: Caught but unexpected errors

### Configuration
Set the log level using the `LOG_LEVEL` environment variable:

```bash
# Debug level (most verbose)
LOG_LEVEL=DEBUG npx tsx src/index.ts

# Production level
LOG_LEVEL=INFO node dist/index.js
```

### Log Components
- **Server**: Main server operations and tool handlers
- **Database**: SQLite operations and state persistence
- **ConversationManager**: Conversation context management
- **TransitionEngine**: Phase transition analysis
- **PlanManager**: Plan file operations

For detailed logging documentation, see [LOGGING.md](./LOGGING.md).

## Interaction Logging

Vibe Feature MCP includes a comprehensive interaction logging system that records all tool calls and responses for debugging and analysis purposes:

### Logged Information

- **Tool Calls**: All calls to `whats_next` and `proceed_to_phase` tools
- **Input Parameters**: Complete request parameters for each tool call
- **Response Data**: Complete response data returned to the LLM
- **Current Phase**: Development phase at the time of the interaction
- **Timestamp**: When the interaction occurred
- **Conversation ID**: Which conversation the interaction belongs to

### Data Storage

All interaction logs are stored in the local SQLite database in the `.vibe` directory of your project. The data is stored without masking or filtering, as it is kept locally on your system.

### Querying Logs

Logs can be queried by conversation ID for analysis and debugging purposes. No UI is provided in the current implementation, but the database can be accessed directly using SQLite tools.

**Note**: All interaction data is stored locally on your system and is never transmitted to external services.

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd responsible-vibe-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Project File Organization

The server creates a `.vibe` subdirectory in your project to store all responsible-vibe-mcp related files:

```
your-project/
├── .vibe/
│   ├── conversation-state.sqlite      # SQLite database for conversation state
│   ├── development-plan.md        # Main development plan (main/master branch)
│   └── development-plan-{branch}.md  # Branch-specific development plans
├── src/
├── package.json
└── ... (your project files)
```

### Plan File Management

The server automatically creates and manages development plan files:
- **Main branch**: `.vibe/development-plan.md`
- **Feature branches**: `.vibe/development-plan-{branch-name}.md`

The LLM is instructed to continuously update these files with:
- Task progress and completion status
- Technical decisions and design choices
- Implementation notes and progress
- Testing results and validation

### Database Storage

Conversation state is persisted in a project-local SQLite database:
`.vibe/conversation-state.sqlite`

This ensures:
- **Project isolation**: Each project has its own conversation state
- **Branch awareness**: Different branches can have separate development contexts
- **Persistence**: State survives server restarts and provides conversation continuity
- **Portability**: Database travels with your project

## Project Identification

Each conversation is uniquely identified by:
- **Project path**: Absolute path to current working directory
- **Git branch**: Current git branch (or 'no-git' if not in a git repo)

This allows multiple projects and branches to have independent conversation states.

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test:run

# Run all tests (including noisy ones)
npm run test:all

# Start workflow visualizer
npm run visualize
```

### Project Structure

```
src/
├── index.ts              # Main server entry point
├── server.ts             # MCP server implementation
├── conversation/         # Conversation management
├── database/            # Database operations
├── plan/               # Plan file management
├── transitions/        # Phase transition logic
├── workflows/          # Workflow definitions
└── utils/              # Utility functions

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test fixtures

docs/
├── ARCHITECTURE.md     # Architecture documentation
├── EXAMPLES.md         # Usage examples
├── DEVELOPMENT.md      # This file
└── *.md               # Other documentation
```

## Debugging Tips

### Common Issues

1. **Server not responding**: Check if the server process is running and listening on the correct port
2. **Database errors**: Ensure the SQLite database file has proper permissions
3. **Git integration issues**: Verify git is installed and the project is in a git repository
4. **Plan file not updating**: Check file permissions and project path configuration

### Debug Mode

Enable debug logging to see detailed execution flow:

```bash
LOG_LEVEL=DEBUG npx responsible-vibe-mcp
```

### Testing with MCP Inspector

Use the MCP Inspector for interactive testing:

```bash
npx @modelcontextprotocol/inspector
```

Configure it to connect to your local server instance.

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting conventions
- Add tests for new functionality
- Update documentation for API changes

### Commit Messages

Use conventional commits for version management:

```
feat: add new workflow support
fix: resolve database connection issue
docs: update API documentation
test: add integration tests for phase transitions
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass (`npm run test:all`)
5. Update documentation as needed
6. Submit a pull request

### Release Process

The project uses automated releases based on conventional commits:

- `feat:` commits trigger minor version bumps
- `fix:` commits trigger patch version bumps
- `BREAKING CHANGE:` in commit body triggers major version bumps
