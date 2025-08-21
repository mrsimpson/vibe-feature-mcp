/**
 * Response Renderer
 *
 * Handles translation between domain handler results and MCP protocol responses.
 * This provides clean separation between business logic and protocol concerns.
 */

import { createLogger } from '../logger.js';
import {
  ResponseRenderer,
  HandlerResult,
  ResourceContent,
  McpToolResponse,
  McpResourceResponse,
} from './types.js';

const logger = createLogger('ResponseRenderer');

/**
 * Default implementation of ResponseRenderer
 * Converts domain results to MCP protocol format
 */
export class DefaultResponseRenderer implements ResponseRenderer {
  /**
   * Render a tool handler result as an MCP tool response
   */
  renderToolResponse<T>(result: HandlerResult<T>): McpToolResponse {
    logger.debug('Rendering tool response', {
      success: result.success,
      hasData: !!result.data,
      hasError: !!result.error,
    });

    if (!result.success && result.error) {
      return this.renderError(result.error);
    }

    // Convert data to JSON string for MCP protocol
    const responseText = result.data
      ? JSON.stringify(result.data, null, 2)
      : '';

    return {
      content: [
        {
          type: 'text' as const,
          text: responseText,
        },
      ],
    };
  }

  /**
   * Render a resource handler result as an MCP resource response
   */
  renderResourceResponse(
    result: HandlerResult<ResourceContent>
  ): McpResourceResponse {
    logger.debug('Rendering resource response', {
      success: result.success,
      hasData: !!result.data,
    });

    if (!result.success || !result.data) {
      // For resources, we still need to return a valid response structure
      // but with error content
      const errorText = result.error || 'Resource not available';

      return {
        contents: [
          {
            uri: result.data?.uri || 'error://unknown',
            text: `Error: ${errorText}`,
            mimeType: 'text/plain',
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: result.data.uri,
          text: result.data.text,
          mimeType: result.data.mimeType,
        },
      ],
    };
  }

  /**
   * Render an error as an MCP tool response
   */
  renderError(error: Error | string): McpToolResponse {
    const errorMessage = error instanceof Error ? error.message : error;

    logger.debug('Rendering error response', { errorMessage });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create a default response renderer instance
 */
export function createResponseRenderer(): ResponseRenderer {
  return new DefaultResponseRenderer();
}
