# Testing Architecture

## Overview
E2E testing without process spawning - consumer perspective testing with real files.

## Architecture
- **Production**: Client → Transport → Server → Components  
- **Testing**: Test → DirectInterface → Server → Components

## Key Components

### 1. Testable Server
```typescript
export class VibeFeatureMCPServer {
  constructor(config: ServerConfig = {}) {
    this.projectPath = config.projectPath || process.cwd();
  }
  public async handleWhatsNext(args: any): Promise<any>
}
```

### 2. Direct Interface  
```typescript
export class DirectServerInterface {
  async callTool(name: string, args: any) {
    return await this.server.handleWhatsNext(args);
  }
}
```

### 3. Temp Files
```typescript
export class TempProject {
  constructor() { /* creates real temp dirs */ }
  cleanup() { /* removes temp files */ }
}
```

## Test Pattern
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

## Benefits
- ✅ Consumer perspective testing
- ✅ 10x faster (no process spawning)  
- ✅ Real file system integration
- ✅ Easy debugging (single process)

## Usage
```bash
npm test                      # All tests
npm test -- test/integration/ # E2E tests only
```
