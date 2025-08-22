# Long-Term Memory System

The Responsible Vibe MCP Server features a comprehensive long-term memory system built around two core components that maintain project context across conversations and sessions:

- **Project Artifacts**: Structured documents (architecture, requirements, design) that serve as persistent project knowledge
- **Development Plans**: Central process memory tracking progress, decisions, and workflow state

## Overview

This memory system enables workflows to dynamically reference specific project information through variables, allowing the LLM to pull in contextual documentation during development phases. The system supports both template-based document creation and linking of existing project documentation.

## Project Artifacts

Project artifacts are structured documents that capture and preserve project knowledge. These documents are created in `.vibe/docs/` and can be generated from templates or linked to existing project files.

### Document Types

#### Architecture Documents

- **Purpose**: System design, component relationships, technical decisions
- **Templates Available**:
  - `arc42`: Comprehensive software architecture documentation with quality requirements, building blocks, deployment views
  - `freestyle`: Minimal architecture documentation for simple projects
- **Workflow Variable**: `$ARCHITECTURE_DOC`

#### Requirements Documents

- **Purpose**: Feature specifications, user stories, acceptance criteria
- **Templates Available**:
  - `ears`: Easy Approach to Requirements Syntax - structured format with "The system SHALL [requirement] WHEN [condition]"
  - `freestyle`: Flexible requirements documentation
- **Workflow Variable**: `$REQUIREMENTS_DOC`

#### Design Documents

- **Purpose**: UI/UX design, API design, implementation details
- **Templates Available**:
  - `comprehensive`: Detailed design documentation covering UI, API, and implementation specifications
  - `freestyle`: Simple design documentation
- **Workflow Variable**: `$DESIGN_DOC`

### Setting Up Project Artifacts

Use the `setup_project_docs` tool to create or link project documentation:

```javascript
// Create documents from templates
setup_project_docs({
  architecture: 'arc42',
  requirements: 'ears',
  design: 'comprehensive',
});

// Link existing documentation files
setup_project_docs({
  architecture: 'ARCHITECTURE.md',
  requirements: 'README.md',
  design: 'docs/design.md',
});

// Mixed approach: templates + existing files + disabled docs
setup_project_docs({
  architecture: 'README.md', // Link existing file
  requirements: 'ears', // Use template
  design: 'none', // Disable with placeholder
});
```

The LLM will be instructed to use this tool when it first-time starts a development process and does not find those files.

### File Linking Capabilities

The system supports linking existing project documentation instead of creating new files:

**Supported File Patterns:**

- Root level: `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `REQUIREMENTS.md`
- Docs folder: `docs/architecture.md`, `docs/requirements.md`, `docs/design.md`
- Absolute and relative file paths
- Multiple document types can reference the same source file

**How Linking Works:**

1. **Detection**: System automatically detects existing documentation files
2. **Symlink Creation**: Creates symbolic links in `.vibe/docs/` pointing to existing files
3. **Standard Integration**: Workflows continue to work with standard document paths
4. **"none" Option**: Creates placeholder that instructs LLM to use plan file instead

### Template System

Templates provide standardized structures for consistent documentation:

- **Dynamic Discovery**: Templates are automatically discovered from the file system
- **Zero Maintenance**: Add new templates by dropping files in `resources/templates/`
- **Rich Content**: Templates can include images and additional files (e.g., Arc42 includes diagrams)
- **Structured Format**: Each template provides a specific documentation approach
- **LLM Maintained**: The LLM is instructed to maintain and update documents as development progresses
- **No Upgrades**: Template types cannot be upgraded - choose the right methodology upfront as the LLM can only replace entire document content

## Development Plans

The development plan file serves as the central process memory, tracking the evolution of your project through its development lifecycle.

### Plan File Structure

**Location**: `.vibe/development-plan-{project-name}.md`

**Purpose**:

- Track completed and current tasks
- Record architectural and design decisions
- Maintain project context across conversations
- Serve as fallback documentation when specific artifacts are disabled

**Example Structure:**

```markdown
# Development Plan: User Authentication System

## Project Overview

Implementing secure user authentication with JWT tokens and role-based access control.

## Completed Tasks

- [x] Architecture document created using Arc42 template
- [x] Requirements gathered using EARS format
- [x] Database schema designed
- [x] User model implemented

## Current Tasks

- [ ] Implement JWT token generation
- [ ] Add password hashing with bcrypt
- [ ] Create login/logout endpoints
- [ ] Add role-based middleware

## Decisions Made

- Using PostgreSQL for user data storage
- JWT tokens with 24-hour expiration
- bcrypt for password hashing (cost factor 12)
- Role-based access control with admin/user roles

## Next Steps

- Complete authentication endpoints
- Add input validation
- Write comprehensive tests
- Update API documentation
```

### Process Memory Features

- **LLM-Maintained**: The LLM automatically updates the plan as work progresses
- **Decision Tracking**: Records why certain technical choices were made
- **Context Preservation**: Maintains project state across conversation breaks
- **Fallback Documentation**: Used when specific document types are set to "none"
- **User Review**: Users should regularly review LLM updates to ensure accuracy and approve major changes

## Workflow Integration

The power of the memory system lies in how workflows dynamically reference project documentation through variables, enabling the LLM to pull in specific contextual information during each development phase.

### Document Variables in Workflows

Workflows reference project documents using standardized variables:

- `$ARCHITECTURE_DOC`: References the architecture document content
- `$REQUIREMENTS_DOC`: References the requirements document content
- `$DESIGN_DOC`: References the design document content

### How Variables Work in Practice

**Example Workflow Phase:**

```yaml
- name: 'implementation'
  instructions: |
    Implement the feature according to the specifications:

    **Architecture Guidelines:**
    Refer to $ARCHITECTURE_DOC for:
    - System architecture and component relationships
    - Technology stack decisions
    - Integration patterns and data flow

    **Requirements:**
    Follow $REQUIREMENTS_DOC for:
    - Functional requirements and acceptance criteria
    - User stories and use cases
    - Business rules and constraints

    **Design Specifications:**
    Implement according to $DESIGN_DOC for:
    - UI/UX design specifications
    - API design and data models
    - Implementation details and patterns

    Ensure your implementation aligns with all documented specifications.
```

### Dynamic Content Injection

When the LLM receives workflow instructions, the variables are automatically replaced with actual document content:

1. **Variable Detection**: Workflow engine identifies `$DOCUMENT_VAR` patterns
2. **Content Retrieval**: System reads the corresponding document from `.vibe/docs/`
3. **Content Injection**: Variable is replaced with actual document content
4. **Context Delivery**: LLM receives instructions with full document context

### Supporting the Development Process

This variable system supports development by:

**Phase-Specific Context:**

- **Requirements Phase**: LLM has access to existing architecture decisions via `$ARCHITECTURE_DOC`
- **Design Phase**: LLM references both `$ARCHITECTURE_DOC` and `$REQUIREMENTS_DOC` for informed design decisions
- **Implementation Phase**: LLM has complete context from all three document types
- **Testing Phase**: LLM can verify against requirements and design specifications

**Contextual Decision Making:**

```yaml
- name: 'design'
  instructions: |
    Create detailed design specifications considering:

    **Existing Architecture** (from $ARCHITECTURE_DOC):
    - Follow established architectural patterns
    - Respect component boundaries and interfaces
    - Align with technology stack decisions

    **Requirements to Address** (from $REQUIREMENTS_DOC):
    - Ensure all functional requirements are covered
    - Address non-functional requirements
    - Consider user experience requirements
```

**Consistency Enforcement:**

```yaml
- name: 'qa'
  instructions: |
    Review the implementation for consistency with project documentation:

    1. **Architecture Compliance**: Verify implementation follows $ARCHITECTURE_DOC
    2. **Requirements Coverage**: Ensure all items in $REQUIREMENTS_DOC are addressed
    3. **Design Adherence**: Check implementation matches $DESIGN_DOC specifications
```

### Fallback to Plan File

When a document type is set to "none", workflows automatically fall back to the development plan file:

```yaml
# If $REQUIREMENTS_DOC is set to "none"
- name: 'implementation'
  instructions: |
    Implement the feature according to:
    - Architecture guidelines in $ARCHITECTURE_DOC
    - Requirements from the development plan file (requirements doc disabled)
    - Design specifications in $DESIGN_DOC
```

### Benefits for Development Process

**Informed Decision Making:**

- LLM always has access to relevant project context
- Decisions are made with full awareness of existing documentation
- Reduces inconsistencies between different development phases

**Contextual Guidance:**

- Each workflow phase receives exactly the documentation it needs
- No need to manually copy/paste documentation into conversations
- Automatic synchronization between documentation and development activities

**Progressive Context Building:**

- Early phases (requirements) reference minimal context
- Later phases (implementation, testing) have access to complete project documentation
- Context grows naturally as the project evolves

**Documentation-Driven Development:**

- Workflows enforce reference to project documentation
- Encourages keeping documentation up-to-date
- Creates natural feedback loop between documentation and implementation

## Usage Examples

### Setting Up Project Artifacts

**Template-Based Setup:**

```javascript
setup_project_docs({
  architecture: 'arc42', // Comprehensive architecture template
  requirements: 'ears', // Structured requirements format
  design: 'comprehensive', // Detailed design documentation
});
```

**Linking Existing Documentation:**

```javascript
setup_project_docs({
  architecture: 'ARCHITECTURE.md', // Link existing architecture file
  requirements: 'README.md', // Use README as requirements
  design: 'docs/design.md', // Link existing design doc
});
```

**Mixed Approach:**

```javascript
setup_project_docs({
  architecture: 'README.md', // Link existing file
  requirements: 'ears', // Create from template
  design: 'none', // Use plan file only
});
```

### Workflow Variable Usage

**Example: Implementation Phase with Full Context**

```yaml
- name: 'implementation'
  instructions: |
    Implement the authentication system following these specifications:

    **System Architecture** ($ARCHITECTURE_DOC):
    - Follow the layered architecture pattern
    - Use the defined authentication service interface
    - Integrate with the existing database layer

    **Functional Requirements** ($REQUIREMENTS_DOC):
    - Implement user registration with email validation
    - Support JWT token-based authentication
    - Include role-based access control

    **Design Specifications** ($DESIGN_DOC):
    - Use the defined API endpoints structure
    - Follow the error handling patterns
    - Implement the specified data validation rules
```

## File Structure

The memory system creates this organized file structure:

```
.vibe/
├── development-plan-{project}.md     # Central process memory
├── conversation-state.json           # Current workflow state
└── docs/                            # Project documentation artifacts
    ├── architecture.md              # Architecture document (template or symlink)
    ├── requirements.md              # Requirements document (template or symlink)
    └── design.md                    # Design document (template or symlink)
```

## Best Practices

### Documentation Strategy

**Choose the Right Methodology Upfront:**

- **Arc42**: Select for complex systems requiring comprehensive architecture documentation
- **EARS**: Choose for projects needing formal, structured requirements documentation
- **Comprehensive**: Use for detailed design specifications with UI/UX and API considerations
- **Freestyle**: Pick for simple projects or when flexibility is more important than structure
- **File Linking**: Use when you have existing documentation that should be preserved and referenced

**Important**: There is no upgrade path between template types. The LLM can only replace entire document content, so select the appropriate methodology on first setup.

**LLM Document Maintenance:**

- The LLM is instructed to maintain and update project documents as development progresses
- Documents evolve automatically based on architectural decisions and implementation changes
- The system ensures documents stay synchronized with actual development work

**User Review Responsibility:**

- **Review LLM-generated content**: Regularly review documents maintained by the LLM
- **Validate accuracy**: Ensure architectural decisions and requirements reflect your intentions
- **Approve major changes**: Review significant updates before they become the basis for further development
- **Provide feedback**: Correct any misunderstandings or inaccuracies in the documentation

### Workflow Design

**Design Phases to Reference Appropriate Context:**

- Requirements phase: Minimal context, focus on gathering needs
- Design phase: Reference architecture and requirements
- Implementation phase: Full context from all document types
- Testing phase: Verify against requirements and design specifications

**Use Fallback Strategies:**

- Set non-critical document types to "none" for simpler projects
- Rely on plan file for lightweight documentation approaches
- Combine templates and existing files based on project needs

### Process Memory Management

**Plan File as Living Document:**

- The LLM continuously updates the plan file as work progresses
- Contains decision rationale and project evolution history
- Serves as fallback when specific document types are disabled

**Monitor LLM Updates:**

- Review plan file updates to ensure accuracy
- Verify that completed tasks are properly marked
- Check that decisions are recorded with appropriate context
