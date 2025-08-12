# Dynamic Template Discovery

This example demonstrates how the template system automatically discovers available templates from the file system structure, eliminating the need for hardcoded template names.

## How It Works

1. **File System Scanning**: The `TemplateManager` scans the `resources/templates/` directory
2. **Dynamic Discovery**: Templates are discovered based on file and directory structure
3. **Automatic Registration**: MCP tool schemas are built dynamically from discovered templates
4. **Extensible**: Adding new templates requires no code changes

## Template Structure

```
resources/templates/
├── architecture/
│   ├── arc42/                    # Directory-based template
│   │   ├── arc42-template-EN.md
│   │   └── images/
│   └── freestyle.md              # File-based template
├── requirements/
│   ├── ears.md                   # File-based template
│   └── freestyle.md              # File-based template
└── design/
    ├── comprehensive.md          # File-based template
    └── freestyle.md              # File-based template
```

## Dynamic Discovery Process

### 1. Template Scanning
```typescript
async getAvailableTemplates(): Promise<{
  architecture: string[];
  requirements: string[];
  design: string[];
}> {
  const result = {
    architecture: [] as string[],
    requirements: [] as string[],
    design: [] as string[]
  };

  // Scan each template type directory
  for (const [type, templates] of Object.entries(result)) {
    const typePath = join(this.templatesPath, type);
    const entries = await readdir(typePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Directory-based template (like arc42)
        templates.push(entry.name);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // File-based template (like freestyle.md)
        const templateName = entry.name.replace('.md', '');
        templates.push(templateName);
      }
    }
    
    templates.sort(); // Consistent ordering
  }
  
  return result;
}
```

### 2. Dynamic MCP Tool Registration
```typescript
// Register setup_project_docs tool with dynamic template discovery
const templateManager = new TemplateManager();
const availableTemplates = await templateManager.getAvailableTemplates();

mcpServer.registerTool(
  'setup_project_docs',
  {
    inputSchema: {
      architecture: z.enum(buildTemplateEnum(availableTemplates.architecture))
        .describe(generateTemplateDescription(availableTemplates.architecture, 'Architecture')),
      requirements: z.enum(buildTemplateEnum(availableTemplates.requirements))
        .describe(generateTemplateDescription(availableTemplates.requirements, 'Requirements')),
      design: z.enum(buildTemplateEnum(availableTemplates.design))
        .describe(generateTemplateDescription(availableTemplates.design, 'Design'))
    }
  }
);
```

### 3. Dynamic Validation
```typescript
async validateOptions(options: TemplateOptions): Promise<void> {
  const availableTemplates = await this.getAvailableTemplates();

  if (options.architecture && !availableTemplates.architecture.includes(options.architecture)) {
    throw new Error(`Invalid architecture template: ${options.architecture}. Valid options: ${availableTemplates.architecture.join(', ')}`);
  }
  // ... similar for requirements and design
}
```

## Benefits

### ✅ **Zero Maintenance**
- Adding new templates requires no code changes
- Removing templates automatically updates available options
- Template descriptions generated automatically

### ✅ **Extensibility**
- Support for custom templates without modification
- Easy to add new template types
- File system is the single source of truth

### ✅ **Consistency**
- Same discovery logic used everywhere
- No risk of hardcoded lists getting out of sync
- Automatic alphabetical ordering

### ✅ **Developer Experience**
- Clear error messages with actual available options
- Dynamic help text in MCP tool descriptions
- Self-documenting through file structure

## Example Usage

### Adding a New Template

1. **Create the template file**:
   ```bash
   echo "# Custom Architecture Template" > resources/templates/architecture/custom.md
   ```

2. **Restart the server** - template is automatically discovered

3. **Use the new template**:
   ```javascript
   setup_project_docs({
     architecture: "custom",  // Now available automatically
     requirements: "ears",
     design: "comprehensive"
   })
   ```

### Template Discovery Results

Based on the file structure above, the system discovers:

```javascript
{
  architecture: ['arc42', 'freestyle'],
  requirements: ['ears', 'freestyle'], 
  design: ['comprehensive', 'freestyle']
}
```

### Dynamic Tool Schema

The MCP tool schema is built automatically:

```javascript
{
  architecture: z.enum(['arc42', 'freestyle'])
    .describe('Architecture documentation template format. Options: arc42 (comprehensive software architecture template), freestyle (flexible format)'),
  requirements: z.enum(['ears', 'freestyle'])
    .describe('Requirements documentation template format. Options: ears (WHEN...THEN format), freestyle (flexible format)'),
  design: z.enum(['comprehensive', 'freestyle'])
    .describe('Design documentation template format. Options: comprehensive (full implementation guide with testing strategy), freestyle (flexible format)')
}
```

This dynamic approach ensures the template system is both flexible and maintainable, adapting automatically to changes in the template collection without requiring code updates.
