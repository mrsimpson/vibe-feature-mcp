# Enhanced start_development Flow

This example demonstrates how the enhanced `start_development` tool detects missing project artifacts and guides users through setup.

## Scenario 1: Missing Project Documentation

### User Action:
```javascript
start_development({ workflow: "waterfall" })
```

### System Response (when docs are missing):
```
## Project Documentation Setup Required

The **waterfall** workflow works best with structured project documentation. You're missing some key documents:

**Missing Documents:**
- architecture.md
- requirements.md
- design.md

## 🚀 **Quick Setup**

Use the `setup_project_docs` tool to create these documents with templates:

```
setup_project_docs({
  architecture: "arc42",        // or "freestyle"
  requirements: "ears",         // or "freestyle" 
  design: "comprehensive"       // or "freestyle"
})
```

## 📋 **Template Options**

**Architecture Templates:**
- **arc42**: Comprehensive software architecture template with diagrams
- **freestyle**: Simple, flexible architecture documentation

**Requirements Templates:**
- **ears**: WHEN...THEN format for clear, testable requirements
- **freestyle**: Open-ended requirements documentation

**Design Templates:**
- **comprehensive**: Full implementation guide with testing strategy
- **freestyle**: Flexible design documentation

## ⚡ **Next Steps**

1. **Call `setup_project_docs`** with your preferred templates
2. **Call `start_development`** again to begin the waterfall workflow
3. The workflow will reference these documents using variables like `$ARCHITECTURE_DOC`

**Note:** You can also proceed without structured docs, but the workflow instructions may reference missing files.
```

## Scenario 2: Partial Documentation Exists

### System Response (when some docs exist):
```
**Missing Documents:**
- architecture.md
- design.md

**Existing Documents:**
✅ requirements.md
```

## Scenario 3: All Documentation Exists

### System Response:
Proceeds directly to workflow initialization without artifact setup guidance.

## Workflow Coverage

### **Workflows Requiring Artifacts:**
- `waterfall` - Comprehensive documentation-driven approach
- `greenfield` - New project requiring thorough planning
- `epcc` - Structured development with documentation

### **Workflows NOT Requiring Artifacts:**
- `bugfix` - Focused on specific issue resolution
- `minor` - Small changes not requiring full documentation
- `posts` - Content creation workflow
- `slides` - Presentation creation workflow

## Benefits

1. **Guided Setup**: Users are automatically guided to create missing documentation
2. **Template Recommendations**: Clear guidance on which templates to use
3. **Workflow Integration**: Seamless transition from setup to development
4. **Flexible Approach**: Users can still proceed without docs if needed
5. **Smart Detection**: Only prompts for workflows that benefit from structured docs
