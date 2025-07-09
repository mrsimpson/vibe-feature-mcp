/**
 * Unit tests for VIBE_PROJECT_PATH environment variable support
 * 
 * Tests the minimal fix for issue #14
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationManager } from '../../src/conversation-manager.js';
import { Database } from '../../src/database.js';

// Mock the database
vi.mock('../../src/database', () => ({
  Database: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getConversationState: vi.fn().mockResolvedValue(null),
    saveConversationState: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the logger
vi.mock('../../src/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

describe('VIBE_PROJECT_PATH Environment Variable Support', () => {
  const originalEnv = process.env;
  let mockDatabase: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables to clean state
    process.env = { ...originalEnv };
    delete process.env.VIBE_PROJECT_PATH;
    
    // Create a mock database instance
    mockDatabase = new Database();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it('should use VIBE_PROJECT_PATH when environment variable is set', () => {
    // Set environment variable
    const testProjectPath = '/custom/project/path';
    process.env.VIBE_PROJECT_PATH = testProjectPath;
    
    // Create ConversationManager without explicit projectPath
    const conversationManager = new ConversationManager(mockDatabase);
    
    // Verify the project path was used from environment variable
    const projectPath = (conversationManager as any).projectPath;
    expect(projectPath).toBe(testProjectPath);
  });

  it('should use provided projectPath parameter over environment variable', () => {
    // Set environment variable
    process.env.VIBE_PROJECT_PATH = '/env/project/path';
    
    // Create ConversationManager with explicit projectPath
    const paramProjectPath = '/param/project/path';
    const conversationManager = new ConversationManager(mockDatabase, paramProjectPath);
    
    // Verify parameter takes precedence over environment variable
    const projectPath = (conversationManager as any).projectPath;
    expect(projectPath).toBe(paramProjectPath);
  });

  it('should fall back to process.cwd() when no environment variable is set', () => {
    // Ensure no environment variable is set
    delete process.env.VIBE_PROJECT_PATH;
    
    // Create ConversationManager without projectPath
    const conversationManager = new ConversationManager(mockDatabase);
    
    // Verify fallback to process.cwd()
    const projectPath = (conversationManager as any).projectPath;
    expect(projectPath).toBe(process.cwd());
  });

  it('should maintain backward compatibility', () => {
    // Test that existing behavior is preserved when no environment variable is set
    const explicitPath = '/explicit/path';
    const conversationManager = new ConversationManager(mockDatabase, explicitPath);
    
    const projectPath = (conversationManager as any).projectPath;
    expect(projectPath).toBe(explicitPath);
  });

  it('should properly handle empty environment variable', () => {
    // Set empty environment variable
    process.env.VIBE_PROJECT_PATH = '';
    
    // Create ConversationManager
    const conversationManager = new ConversationManager(mockDatabase);
    
    // Should fall back to process.cwd() when env var is empty
    const projectPath = (conversationManager as any).projectPath;
    expect(projectPath).toBe(process.cwd());
  });
});
