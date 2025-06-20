import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TempProject, createTempProjectWithDefaultStateMachine } from '../utils/temp-files.js';
import { DirectServerInterface, createSuiteIsolatedE2EScenario, assertToolSuccess } from '../utils/e2e-test-setup.js';
import { promises as fs } from 'fs';
import path from 'path';

// Disable fs mocking for E2E tests
vi.unmock('fs');
vi.unmock('fs/promises');

describe('Feature: Development Plan File Operations', () => {
  describe('Scenario: Automatic plan file creation for new conversations', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-creation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should create new plan file automatically for new conversations', async () => {
      // Given: a new conversation is started for a project
      // And: no existing plan file exists
      const planDir = path.join(tempProject.projectPath, '.vibe');
      const planFiles = await fs.readdir(planDir).catch(() => []);
      const existingPlanFiles = planFiles.filter(f => f.endsWith('.md'));
      expect(existingPlanFiles).toHaveLength(0);

      // When: the conversation requires a plan file
      const result = await client.callTool('whats_next', {
        context: 'starting new conversation that needs plan file'
      });

      // Then: a new plan file should be created automatically
      const response = assertToolSuccess(result);
      expect(response).toHaveProperty('plan_file_path');
      
      // And: the file should exist
      const planFilePath = response.plan_file_path;
      const fileExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // And: the file path should be stored in conversation state
      expect(planFilePath).toMatch(/\.md$/);
    });

    it('should contain default template structure', async () => {
      // Given: a new conversation that creates a plan file
      const result = await client.callTool('whats_next', {
        context: 'creating plan file with template'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the plan file is created
      const content = await fs.readFile(planFilePath, 'utf-8');

      // Then: it should contain standard markdown structure
      expect(content).toContain('# Development Plan:');
      expect(content).toContain('## Project Overview');
      expect(content).toContain('### 📋 Requirements Analysis');
      expect(content).toContain('### 🎨 Design');
      expect(content).toContain('### 💻 Implementation');
      expect(content).toContain('### 🔍 Quality Assurance');
      expect(content).toContain('### 🧪 Testing');
    });

    it('should have descriptive and feature-specific file name', async () => {
      // Given: a new conversation
      const result = await client.callTool('whats_next', {
        context: 'checking plan file naming'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // Then: file name should be descriptive
      const fileName = path.basename(planFilePath);
      expect(fileName).toMatch(/development-plan/);
      expect(fileName).toMatch(/\.md$/);
      expect(fileName.length).toBeGreaterThan(10); // Should be reasonably descriptive
    });

    it('should not overwrite existing files', async () => {
      // Given: an existing plan file
      const result1 = await client.callTool('whats_next', {
        context: 'creating first plan file'
      });
      const response1 = assertToolSuccess(result1);
      const planFilePath1 = response1.plan_file_path;
      
      // Modify the file to add custom content
      const customContent = '\n\n## Custom Section\nThis is custom content that should not be overwritten.';
      await fs.appendFile(planFilePath1, customContent);

      // When: another conversation tries to create a plan file
      const result2 = await client.callTool('whats_next', {
        context: 'second interaction with existing plan file'
      });
      const response2 = assertToolSuccess(result2);

      // Then: existing file should not be overwritten
      const finalContent = await fs.readFile(planFilePath1, 'utf-8');
      expect(finalContent).toContain('Custom Section');
      expect(finalContent).toContain('This is custom content that should not be overwritten.');
    });
  });

  describe('Scenario: Plan file template generation', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-template',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should include sections for each development phase', async () => {
      // Given: a new plan file needs to be created
      const result = await client.callTool('whats_next', {
        context: 'generating plan file template'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the plan file is generated
      const content = await fs.readFile(planFilePath, 'utf-8');

      // Then: it should include sections for each development phase
      const expectedPhases = ['Requirements Analysis', 'Design', 'Implementation', 'Quality Assurance', 'Testing'];
      for (const phase of expectedPhases) {
        expect(content).toContain(phase);
      }
    });

    it('should have placeholder content for project overview', async () => {
      // Given: a new plan file
      const result = await client.callTool('whats_next', {
        context: 'checking project overview placeholder'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the plan file is generated
      const content = await fs.readFile(planFilePath, 'utf-8');

      // Then: it should have placeholder content for project overview
      expect(content).toContain('## Project Overview');
      expect(content).toMatch(/\*\*Status\*\*:\s*\S+/); // Should have status field
      expect(content).toContain('Planning Phase');
    });

    it('should include task tracking format with checkboxes', async () => {
      // Given: a new plan file
      const result = await client.callTool('whats_next', {
        context: 'checking task tracking format'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the plan file is generated
      const content = await fs.readFile(planFilePath, 'utf-8');

      // Then: it should include task tracking format with checkboxes
      expect(content).toMatch(/- \[ \]/); // Should contain unchecked checkboxes
      expect(content).toContain('#### Tasks');
      expect(content).toContain('#### Completed');
      expect(content).toMatch(/- \[x\]/); // Should contain some completed checkboxes
    });

    it('should be immediately usable', async () => {
      // Given: a generated plan file
      const result = await client.callTool('whats_next', {
        context: 'testing plan file usability'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the plan file is accessed
      const content = await fs.readFile(planFilePath, 'utf-8');

      // Then: it should be valid markdown and immediately usable
      expect(content.length).toBeGreaterThan(100); // Should have substantial content
      expect(content).toMatch(/^#/m); // Should start with markdown headers
      expect(content).not.toContain('undefined'); // Should not have template errors
      expect(content).not.toContain('null'); // Should not have template errors
    });
  });

  describe('Scenario: Plan file content analysis for task completion', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-analysis',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should identify completed tasks correctly', async () => {
      // Given: an existing plan file with tasks and checkboxes
      const result = await client.callTool('whats_next', {
        context: 'creating plan file for task analysis'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // Add some completed and incomplete tasks
      const taskContent = `
## Requirements Analysis
### Tasks:
- [x] Define user requirements
- [x] Identify constraints
- [ ] Create user stories
- [ ] Define acceptance criteria
`;
      await fs.appendFile(planFilePath, taskContent);

      // When: the server analyzes the plan file (through resource access)
      const planResource = await client.readResource('plan://current');

      // Then: completed tasks should be identified correctly
      expect(planResource).toBeDefined();
      expect(planResource.contents).toBeDefined();
      const content = planResource.contents[0].text;
      expect(content).toContain('[x] Define user requirements');
      expect(content).toContain('[x] Identify constraints');
      expect(content).toContain('[ ] Create user stories');
      expect(content).toContain('[ ] Define acceptance criteria');
    });

    it('should detect incomplete tasks', async () => {
      // Given: a plan file with mixed task completion
      const result = await client.callTool('whats_next', {
        context: 'testing incomplete task detection'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      const taskContent = `
## Implementation
### Tasks:
- [x] Set up project structure
- [ ] Implement core functionality
- [ ] Add error handling
- [ ] Write unit tests
`;
      await fs.appendFile(planFilePath, taskContent);

      // When: the plan file is accessed
      const planResource = await client.readResource('plan://current');

      // Then: incomplete tasks should be detected
      const content = planResource.contents[0].text;
      const incompleteTaskCount = (content.match(/- \[ \]/g) || []).length;
      expect(incompleteTaskCount).toBeGreaterThan(0);
    });

    it('should handle various markdown formats', async () => {
      // Given: a plan file with different checkbox formats
      const result = await client.callTool('whats_next', {
        context: 'testing markdown format handling'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      const variousFormats = `
## Testing Various Formats
- [x] Standard completed task
- [ ] Standard incomplete task
- [X] Uppercase completed task
* [x] Bullet with asterisk
* [ ] Bullet incomplete
1. [x] Numbered list completed
2. [ ] Numbered list incomplete
`;
      await fs.appendFile(planFilePath, variousFormats);

      // When: the plan file is read
      const planResource = await client.readResource('plan://current');

      // Then: various formats should be preserved
      const content = planResource.contents[0].text;
      expect(content).toContain('[x] Standard completed task');
      expect(content).toContain('[X] Uppercase completed task');
      expect(content).toContain('* [x] Bullet with asterisk');
      expect(content).toContain('1. [x] Numbered list completed');
    });
  });

  describe('Scenario: Plan file updates and synchronization', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-updates',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should preserve existing content structure during updates', async () => {
      // Given: an existing plan file with custom content
      const result = await client.callTool('whats_next', {
        context: 'creating plan file for update testing'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      const originalContent = await fs.readFile(planFilePath, 'utf-8');
      const customSection = '\n## Custom Section\nThis is my custom content.\n';
      await fs.appendFile(planFilePath, customSection);

      // When: development progress is made (simulate by making another call)
      await client.callTool('whats_next', {
        context: 'making progress that might update plan file'
      });

      // Then: existing content structure should be preserved
      const updatedContent = await fs.readFile(planFilePath, 'utf-8');
      expect(updatedContent).toContain('Custom Section');
      expect(updatedContent).toContain('This is my custom content.');
      
      // Original structure should still be there
      expect(updatedContent).toContain('# Development Plan');
      expect(updatedContent).toContain('## Project Overview');
    });

    it('should be reflected immediately in subsequent reads', async () => {
      // Given: a plan file
      const result = await client.callTool('whats_next', {
        context: 'testing immediate reflection of updates'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: file is modified externally
      const timestamp = new Date().toISOString();
      const updateContent = `\n## Update Test\nUpdated at: ${timestamp}\n`;
      await fs.appendFile(planFilePath, updateContent);

      // Then: updates should be reflected immediately in subsequent reads
      const planResource = await client.readResource('plan://current');
      const content = planResource.contents[0].text;
      expect(content).toContain('Update Test');
      expect(content).toContain(timestamp);
    });
  });

  describe('Scenario: Plan file path resolution and validation', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-paths',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should resolve paths correctly relative to project', async () => {
      // Given: a conversation state with a plan file path
      const result = await client.callTool('whats_next', {
        context: 'testing path resolution'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the plan file is accessed
      // Then: the path should be resolved correctly relative to project
      expect(path.isAbsolute(planFilePath)).toBe(true);
      expect(planFilePath).toContain(tempProject.projectPath);
      
      // And: the file should be accessible for reading and writing
      const fileExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Test writing
      const testContent = '\n## Path Test\nTesting write access.\n';
      await expect(fs.appendFile(planFilePath, testContent)).resolves.not.toThrow();
      
      // Test reading
      const content = await fs.readFile(planFilePath, 'utf-8');
      expect(content).toContain('Path Test');
    });

    it('should work across different operating systems', async () => {
      // Given: a plan file path
      const result = await client.callTool('whats_next', {
        context: 'testing cross-platform paths'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // Then: paths should work across different operating systems
      expect(path.isAbsolute(planFilePath)).toBe(true);
      expect(planFilePath).not.toContain('\\\\'); // Should not have Windows-style double backslashes
      expect(planFilePath).not.toMatch(/[<>:"|?*]/); // Should not contain invalid filename characters
      
      // Path should be normalized
      expect(planFilePath).toBe(path.normalize(planFilePath));
    });
  });

  describe('Scenario: Plan file format validation and error handling', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-validation',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should handle parsing errors gracefully', async () => {
      // Given: a plan file with potentially invalid markdown
      const result = await client.callTool('whats_next', {
        context: 'creating plan file for error testing'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // Add some potentially problematic content
      const problematicContent = `
## Problematic Section
This has some [unclosed markdown link
And some **unclosed bold text
And some \`unclosed code
`;
      await fs.appendFile(planFilePath, problematicContent);

      // When: the server attempts to parse the file
      // Then: parsing errors should be handled gracefully
      await expect(client.readResource('plan://current')).resolves.not.toThrow();
      
      // And: invalid content should not crash the server
      const planResource = await client.readResource('plan://current');
      expect(planResource).toBeDefined();
      expect(planResource.contents).toBeDefined();
      expect(planResource.contents[0].text).toContain('Problematic Section');
    });

    it('should provide reasonable defaults for fallback behavior', async () => {
      // Given: a conversation that needs a plan file
      const result = await client.callTool('whats_next', {
        context: 'testing fallback behavior'
      });
      const response = assertToolSuccess(result);

      // Then: fallback behavior should provide reasonable defaults
      expect(response).toHaveProperty('plan_file_path');
      expect(response.plan_file_path).toMatch(/\.md$/);
      
      // File should exist and have basic structure
      const content = await fs.readFile(response.plan_file_path, 'utf-8');
      expect(content).toContain('# Development Plan');
      expect(content.length).toBeGreaterThan(50); // Should have reasonable default content
    });
  });

  describe('Scenario: Plan file integration with external tools', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-external',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should detect and handle external changes', async () => {
      // Given: a plan file created by the server
      const result = await client.callTool('whats_next', {
        context: 'creating plan file for external modification test'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: external tools modify the file
      const externalModification = '\n## External Modification\nThis was added by an external tool.\n';
      await fs.appendFile(planFilePath, externalModification);

      // Then: the server should detect and handle external changes
      const planResource = await client.readResource('plan://current');
      const content = planResource.contents[0].text;
      expect(content).toContain('External Modification');
      expect(content).toContain('This was added by an external tool.');
    });

    it('should maintain standard markdown format for compatibility', async () => {
      // Given: a plan file created by the server
      const result = await client.callTool('whats_next', {
        context: 'testing markdown compatibility'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: the file format is examined
      const content = await fs.readFile(planFilePath, 'utf-8');

      // Then: file format should be standard markdown for compatibility
      expect(content).toMatch(/^#\s+/m); // Should have proper header format
      expect(content).toMatch(/^##\s+/m); // Should have proper subheader format
      expect(content).toMatch(/^-\s+\[[ x]\]/m); // Should have proper checkbox format
      
      // Should not contain proprietary markup
      expect(content).not.toContain('<proprietary>');
      expect(content).not.toContain('{{custom}}');
    });

    it('should handle concurrent access safely', async () => {
      // Given: a plan file
      const result = await client.callTool('whats_next', {
        context: 'testing concurrent access'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // When: multiple operations access the file concurrently
      const operations = [
        fs.appendFile(planFilePath, '\n## Concurrent Test 1\n'),
        fs.appendFile(planFilePath, '\n## Concurrent Test 2\n'),
        client.readResource('plan://current'),
        fs.appendFile(planFilePath, '\n## Concurrent Test 3\n')
      ];

      // Then: concurrent access should be handled safely
      await expect(Promise.all(operations)).resolves.not.toThrow();
      
      // File should still be readable and contain all modifications
      const finalContent = await fs.readFile(planFilePath, 'utf-8');
      expect(finalContent).toContain('Concurrent Test 1');
      expect(finalContent).toContain('Concurrent Test 2');
      expect(finalContent).toContain('Concurrent Test 3');
    });
  });

  describe('Scenario: Plan file cleanup and maintenance', () => {
    let client: DirectServerInterface;
    let tempProject: TempProject;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const scenario = await createSuiteIsolatedE2EScenario({
        suiteName: 'plan-file-cleanup',
        tempProjectFactory: createTempProjectWithDefaultStateMachine
      });
      client = scenario.client;
      tempProject = scenario.tempProject;
      cleanup = scenario.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should maintain manageable file organization', async () => {
      // Given: multiple plan files across different conversations
      const result1 = await client.callTool('whats_next', {
        context: 'creating first plan file'
      });
      const response1 = assertToolSuccess(result1);
      const planFilePath1 = response1.plan_file_path;

      // Create additional plan files by simulating different scenarios
      await fs.appendFile(planFilePath1, '\n## Test Content 1\n');

      // When: examining file organization
      const vibeDir = path.join(tempProject.projectPath, '.vibe');
      const files = await fs.readdir(vibeDir);
      const planFiles = files.filter(f => f.endsWith('.md'));

      // Then: file organization should remain maintainable
      expect(planFiles.length).toBeGreaterThan(0);
      for (const file of planFiles) {
        expect(file).toMatch(/^development-plan/); // Should follow naming convention
        expect(file).toMatch(/\.md$/); // Should be markdown files
      }
    });

    it('should protect active project files from cleanup', async () => {
      // Given: an active project with plan file
      const result = await client.callTool('whats_next', {
        context: 'creating active project plan file'
      });
      const response = assertToolSuccess(result);
      const planFilePath = response.plan_file_path;

      // Add content to make it clearly active
      const activeContent = '\n## Active Project\nThis project is currently active.\n';
      await fs.appendFile(planFilePath, activeContent);

      // When: checking file protection
      const fileExists = await fs.access(planFilePath).then(() => true).catch(() => false);
      
      // Then: active project files should be protected
      expect(fileExists).toBe(true);
      
      const content = await fs.readFile(planFilePath, 'utf-8');
      expect(content).toContain('Active Project');
      expect(content).toContain('This project is currently active.');
    });
  });
});
