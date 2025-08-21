# Variable Substitution Example

This example demonstrates how workflow instructions can reference project documentation artifacts using variables.

## Before Substitution (in workflow YAML):

```yaml
states:
  design:
    description: 'Create detailed technical design'
    instructions: |
      Review the system architecture documented in $ARCHITECTURE_DOC and create a detailed technical design.

      Ensure your design addresses all requirements listed in $REQUIREMENTS_DOC.

      Document your design decisions in $DESIGN_DOC, including:
      - Component interfaces and responsibilities
      - Data models and API contracts
      - Testing strategy and approach

      Reference the architecture document ($ARCHITECTURE_DOC) for high-level context and constraints.
```

## After Substitution (runtime):

```
Review the system architecture documented in /project/path/.vibe/docs/architecture.md and create a detailed technical design.

Ensure your design addresses all requirements listed in /project/path/.vibe/docs/requirements.md.

Document your design decisions in /project/path/.vibe/docs/design.md, including:
- Component interfaces and responsibilities
- Data models and API contracts
- Testing strategy and approach

Reference the architecture document (/project/path/.vibe/docs/architecture.md) for high-level context and constraints.
```

## Supported Variables:

- `$ARCHITECTURE_DOC` → `.vibe/docs/architecture.md`
- `$REQUIREMENTS_DOC` → `.vibe/docs/requirements.md`
- `$DESIGN_DOC` → `.vibe/docs/design.md`

## Benefits:

1. **Dynamic Path Resolution**: Paths are resolved at runtime based on actual project location
2. **Workflow Portability**: Same workflow works across different projects and environments
3. **Consistent Structure**: All projects use the same `.vibe/docs/` structure
4. **Template Integration**: Works seamlessly with `setup_project_docs` tool
