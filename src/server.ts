/**
 * Vibe Feature MCP Server Core
 *
 * Updated to use the new modular architecture while maintaining backward compatibility.
 * The actual implementation is now in src/server/ with proper separation of concerns.
 */

import { ResponsibleVibeMCPServer as ModularResponsibleVibeMCPServer } from './server/index.js';
import { ServerConfig as ModularServerConfig } from './server/types.js';

/**
 * Main server class that maintains backward compatibility
 * while using the new modular architecture internally
 */
export class ResponsibleVibeMCPServer extends ModularResponsibleVibeMCPServer {
  constructor(config: ModularServerConfig = {}) {
    super(config);
  }
}

// Re-export types for backward compatibility
export type { ServerConfig } from './server/types.js';
