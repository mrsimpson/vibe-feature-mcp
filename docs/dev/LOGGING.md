# Logging Documentation

The Vibe Feature MCP Server includes a comprehensive logging system that follows MCP best practices and provides both local debugging capabilities and client notifications.

## MCP Compliance

The logging system is fully compliant with MCP requirements:

- **stderr only**: All local logging uses `stderr` (not `stdout`) to avoid interfering with MCP protocol operation
- **Client notifications**: Important events are sent to the MCP client via log message notifications
- **Structured logging**: All log messages include structured context data
- **Centralized logging**: All logging logic is centralized in `logger.ts` to avoid duplication

## Log Levels

The server supports four log levels with configurable output:

- **DEBUG**: Detailed tracing and execution flow information
- **INFO**: Success operations and important milestones (default)
- **WARN**: Expected errors and recoverable issues
- **ERROR**: Caught but unexpected errors

## Configuration

Set the log level using the `LOG_LEVEL` environment variable:

```bash
# Debug level (most verbose)
LOG_LEVEL=DEBUG npx tsx src/index.ts

# Production level (default)
LOG_LEVEL=INFO node dist/index.js

# Error level only
LOG_LEVEL=ERROR node dist/index.js
```

## Logging Components

### Local Logging (stderr)

All log messages are written to `stderr` with structured formatting:

```
[2025-06-23T06:33:37.372Z] INFO [Server] Phase transition completed {"from":"idle","to":"requirements","reason":"Starting development"}
```

Format: `[timestamp] LEVEL [component] message {context}`

### MCP Client Notifications

Important events are automatically sent to the MCP client as enhanced log message notifications:

- **Phase transitions**: Formatted as "Phase Transition: Idle → Requirements"
- **Server initialization**: Enhanced as "🚀 Vibe Feature MCP Server Ready"
- **Error conditions**: When tools fail or encounter issues
- **Debug information**: Only sent at DEBUG level

Client notifications use the MCP `notifications/message` method with enhanced formatting for better user experience.

## Component Loggers

The system uses component-specific loggers for better organization:

- **Server**: Main server operations and tool handlers
- **Database**: SQLite operations and state persistence
- **ConversationManager**: Conversation context management
- **TransitionEngine**: Phase transition analysis and state machine operations
- **PlanManager**: Plan file operations and management
- **StateMachineLoader**: State machine loading and validation
- **InteractionLogger**: Tool interaction logging

## Usage Examples

### Creating a Logger

```typescript
import { createLogger } from './logger.js';

const logger = createLogger('MyComponent');
```

### Logging with Context

```typescript
logger.info('Operation completed', {
  conversationId: 'abc123',
  phase: 'requirements',
  operation: 'phase_transition',
});
```

### Error Logging

```typescript
try {
  // some operation
} catch (error) {
  logger.error('Operation failed', error as Error, {
    operation: 'database_query',
    conversationId: 'abc123',
  });
}
```

### Child Loggers

```typescript
const childLogger = logger.child('SubComponent');
childLogger.debug('Sub-operation started');
// Output: [timestamp] DEBUG [MyComponent:SubComponent] Sub-operation started
```

## Client Integration

When using the MCP server, clients will receive enhanced log notifications for:

1. **Server initialization**: "🚀 Vibe Feature MCP Server Ready"
2. **Phase transitions**: "Phase Transition: Requirements → Design"
3. **Error conditions**: Immediate notification of tool failures or issues
4. **Debug information**: Detailed tracing (only at DEBUG level)

Example client notification:

```json
{
  "method": "notifications/message",
  "params": {
    "level": "info",
    "logger": "Server",
    "data": "Phase Transition: Idle → Requirements {\"from\":\"idle\",\"to\":\"requirements\",\"reason\":\"Starting development\"}"
  }
}
```

## Architecture Benefits

### Centralized Logging

- All logging logic is contained in `logger.ts`
- No duplication between server components
- Single point of configuration and enhancement

### Enhanced User Experience

- Phase transitions are formatted for readability
- Important events get visual indicators (🚀)
- Context information is preserved but formatted appropriately

### MCP Compliance

- All local logs go to stderr as required
- Client notifications use proper MCP protocol
- Graceful fallback when MCP transport is unavailable

## Debugging

### Enable Debug Logging

```bash
LOG_LEVEL=DEBUG npx tsx src/index.ts
```

Debug logging includes:

- Detailed execution flow
- State machine operations
- Database queries
- Plan file operations
- Tool parameter validation

### Log File Analysis

Since all logs go to `stderr`, you can capture them for analysis:

```bash
# Capture logs to file
LOG_LEVEL=DEBUG npx tsx src/index.ts 2> server.log

# Monitor logs in real-time
LOG_LEVEL=DEBUG npx tsx src/index.ts 2>&1 | tee server.log
```

## Best Practices

1. **Use appropriate log levels**: Debug for tracing, Info for milestones, Warn for recoverable issues, Error for failures
2. **Include context**: Always provide relevant context data with log messages
3. **Avoid sensitive data**: Don't log passwords, tokens, or other sensitive information
4. **Use structured logging**: Provide context as objects rather than string interpolation
5. **Component-specific loggers**: Use dedicated loggers for different components
6. **Centralized logging**: Use the logger module for all logging needs

## Performance Considerations

- Log level filtering happens before message formatting for efficiency
- MCP client notifications are sent asynchronously to avoid blocking operations
- Failed MCP notifications fall back to stderr logging
- Context objects are JSON-serialized only when the log level permits output
- Enhanced notifications only process important events to reduce overhead

## Troubleshooting

### No Log Output

Check the `LOG_LEVEL` environment variable. Default is `INFO`.

### MCP Client Not Receiving Notifications

Ensure the server is properly initialized and connected to the MCP transport. Client notifications are only sent after successful server initialization. In test environments, "Not connected" errors are expected and harmless.

### Performance Issues

Consider raising the log level to `WARN` or `ERROR` in production environments to reduce log volume.

## Integration with MCP Inspector

When using the MCP Inspector for debugging, set debug logging to see detailed protocol interactions:

```bash
LOG_LEVEL=DEBUG npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

The enhanced logging system provides comprehensive visibility into the server's operation while maintaining MCP compliance and optimal performance through centralized, structured logging.
