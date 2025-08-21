# Consolidated E2E Test Suite

This directory contains the consolidated end-to-end test suite that replaces the original 9 test files with 4 semantically organized test files, reducing from 144 tests to approximately 60 focused tests while maintaining comprehensive coverage.

## Test Organization

### 1. Core Functionality (`core-functionality.test.ts`)

**Purpose**: Tests essential server operations and basic functionality

- Server initialization and tool/resource availability
- Basic tool operations (whats_next, proceed_to_phase)
- Resource access (plan and state resources)
- Error handling and graceful failures
- Basic conversation management

**Coverage**: Replaces functionality from:

- `01-server-initialization.test.ts`
- `02-whats-next-tool.test.ts` (basic operations)
- `03-proceed-to-phase-tool.test.ts` (basic operations)
- `04-resource-access.test.ts` (basic access)

### 2. State Management (`state-management.test.ts`)

**Purpose**: Tests state machine functionality and conversation state

- Phase transitions and state machine logic
- Custom state machine loading and validation
- State persistence and consistency
- Conversation context management

**Coverage**: Replaces functionality from:

- `05-conversation-state-management.test.ts`
- `07-stage-transition-engine.test.ts`
- `09-declarative-state-machine.test.ts`
- Advanced state operations from other files

### 3. Plan Management (`plan-management.test.ts`)

**Purpose**: Tests plan file functionality and content management

- Plan file creation and structure
- Content management and updates
- File path handling and organization
- Integration with development phases

**Coverage**: Replaces functionality from:

- `06-plan-file-management.test.ts`
- Plan-related tests from other files

### 4. Workflow Integration (`workflow-integration.test.ts`)

**Purpose**: Tests complete end-to-end workflows and real-world scenarios

- Full development lifecycle scenarios
- Multi-phase project progression
- Real-world usage patterns
- Error recovery and resilience
- Custom workflow integration

**Coverage**: Replaces functionality from:

- `08-end-to-end-workflows.test.ts`
- Integration scenarios from all other files

## Benefits of Consolidation

### Reduced Redundancy

- **Before**: 144 tests across 9 files with significant overlap
- **After**: ~60 focused tests across 4 files
- **Eliminated**: Duplicate conversation creation, database operations, error handling, and state management tests

### Improved Maintainability

- Semantic organization makes it easier to find and update related tests
- Reduced code duplication means fewer places to update when functionality changes
- Clear separation of concerns between test files

### Preserved Coverage

- All critical functionality remains tested
- Edge cases and error scenarios are maintained
- Integration scenarios are consolidated but comprehensive

## Running the Tests

```bash
# Run all consolidated tests
npm test test/e2e/consolidated

# Run specific test suites
npm test test/e2e/consolidated/core-functionality.test.ts
npm test test/e2e/consolidated/state-management.test.ts
npm test test/e2e/consolidated/plan-management.test.ts
npm test test/e2e/consolidated/workflow-integration.test.ts
```

## Migration from Original Tests

The original test files in `/test/e2e/` can be safely removed after verifying the consolidated tests provide equivalent coverage. The consolidated tests are designed to be drop-in replacements that maintain all critical test scenarios while eliminating redundancy.

### Test Count Reduction

- **Server Initialization**: 8 tests → 2 tests (in core-functionality)
- **Tool Operations**: 24 tests → 6 tests (distributed across files)
- **Resource Access**: 20 tests → 4 tests (in core-functionality)
- **State Management**: 40 tests → 16 tests (in state-management)
- **Plan Management**: 22 tests → 12 tests (in plan-management)
- **Workflows**: 30 tests → 20 tests (in workflow-integration)

**Total**: 144 tests → ~60 tests (58% reduction while maintaining coverage)
