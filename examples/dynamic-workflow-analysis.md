# Dynamic Workflow Analysis

This example demonstrates how the enhanced `start_development` tool dynamically analyzes workflows to detect document variable references and validates only the required documents.

## How It Works

1. **Load Workflow**: The selected workflow is loaded and analyzed
2. **Detect Variables**: Search workflow content for `$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`, `$DESIGN_DOC`
3. **Validate Referenced Docs**: Check only the documents that are actually referenced
4. **Targeted Guidance**: Provide setup guidance only for missing referenced documents

## Example Scenarios

### Scenario 1: Workflow with Architecture Focus

**Workflow Content:**

```yaml
states:
  design:
    instructions: |
      Review the system architecture documented in $ARCHITECTURE_DOC 
      and create detailed component designs.
```

**Analysis Result:**

- **Detected Variables**: `$ARCHITECTURE_DOC`
- **Validation**: Only checks if `architecture.md` exists
- **Guidance**: Only prompts for architecture document if missing

### Scenario 2: Comprehensive Workflow

**Workflow Content:**

```yaml
states:
  implementation:
    instructions: |
      Follow the architecture in $ARCHITECTURE_DOC and implement 
      according to $DESIGN_DOC requirements.
  testing:
    instructions: |
      Verify all requirements from $REQUIREMENTS_DOC are met.
```

**Analysis Result:**

- **Detected Variables**: `$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`, `$DESIGN_DOC`
- **Validation**: Checks all three documents
- **Guidance**: Prompts for any missing documents

### Scenario 3: Simple Workflow

**Workflow Content:**

```yaml
states:
  bugfix:
    instructions: |
      Identify the bug, create a fix, and test the solution.
```

**Analysis Result:**

- **Detected Variables**: None
- **Validation**: Skipped entirely
- **Guidance**: Proceeds directly to workflow execution

## Benefits of Dynamic Analysis

### ✅ **Flexibility**

- No hardcoded workflow restrictions
- Automatically adapts to workflow changes
- Supports custom workflows without code changes

### ✅ **Accuracy**

- Only validates documents that are actually needed
- Reduces false positives for workflows that don't need docs
- Provides targeted guidance based on actual usage

### ✅ **Maintainability**

- Workflow changes don't require code updates
- Self-documenting through variable usage
- Clear separation between workflow definition and validation logic

### ✅ **User Experience**

- Precise guidance for missing documents
- Shows exactly which variables are referenced
- No unnecessary prompts for unused document types

## Implementation Details

### Variable Detection

```typescript
private analyzeWorkflowDocumentReferences(stateMachine: any, projectPath: string): string[] {
  // Get available document variables from ProjectDocsManager
  const variableSubstitutions = this.projectDocsManager.getVariableSubstitutions(projectPath);
  const documentVariables = Object.keys(variableSubstitutions);
  const referencedVariables: Set<string> = new Set();

  // Convert the entire state machine to a string for analysis
  const workflowContent = JSON.stringify(stateMachine);

  // Check for each document variable
  for (const variable of documentVariables) {
    if (workflowContent.includes(variable)) {
      referencedVariables.add(variable);
    }
  }

  return Array.from(referencedVariables);
}
```

### Centralized Variable Management

```typescript
// Variables are defined once in ProjectDocsManager
getVariableSubstitutions(projectPath: string): Record<string, string> {
  const paths = this.getDocumentPaths(projectPath);

  return {
    '$ARCHITECTURE_DOC': paths.architecture,
    '$REQUIREMENTS_DOC': paths.requirements,
    '$DESIGN_DOC': paths.design
  };
}
```

### Targeted Validation

```typescript
private getMissingReferencedDocuments(
  referencedVariables: string[],
  docsInfo: any,
  projectPath: string
): string[] {
  const missingDocs: string[] = [];

  // Get variable substitutions to derive the mapping
  const variableSubstitutions = this.projectDocsManager.getVariableSubstitutions(projectPath);

  // Create reverse mapping from variable to document type
  const variableToDocMap: { [key: string]: string } = {};
  for (const [variable, path] of Object.entries(variableSubstitutions)) {
    const filename = path.split('/').pop() || '';
    const docType = filename.replace('.md', '');
    variableToDocMap[variable] = docType;
  }

  for (const variable of referencedVariables) {
    const docType = variableToDocMap[variable];
    if (docType && docsInfo[docType] && !docsInfo[docType].exists) {
      missingDocs.push(`${docType}.md`);
    }
  }

  return missingDocs;
}
```

This dynamic approach ensures that the artifact validation system is both flexible and precise, adapting automatically to different workflow requirements without manual configuration.
