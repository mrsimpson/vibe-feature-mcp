# Development Plan: responsible-vibe (files-in-c4-analysis branch)

*Generated on 2025-08-13 by Vibe Feature MCP*
*Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)*

## Goal
Fix c4-analysis workflow issues: discovery template content not being respected and missing architecture/design document setup after discovery phase.

## Reproduce
### Tasks
- [x] Examine the c4-analysis workflow implementation (commit 413b0f928cdb2e6ec559cefa0f44b0d0306b8880)
- [x] Found discovery template at `.vibe/docs/discovery-template.md` 
- [x] Found c4 architecture template at `.vibe/docs/c4-architecture-template.md`
- [x] Identified Issue 1: Discovery template content not accessible to LLM
- [x] Identified Issue 2: No setup_project_docs call in workflow transitions
- [x] Document the exact reproduction steps for both issues
- [x] Test the current workflow behavior to confirm issues

### Reproduction Steps

#### Issue 1 Reproduction:
1. Start c4-analysis workflow 
2. LLM receives instruction: "Create discovery notes file at .vibe/docs/DISCOVERY.md to serve as long-term memory"
3. LLM also receives: "Use the discovery template structure with comment-instructions"
4. **Problem**: LLM has no access to the actual template content from `.vibe/docs/discovery-template.md`
5. **Result**: LLM creates empty or incorrectly structured DISCOVERY.md file

#### Issue 2 Reproduction:
1. Complete discovery phase in c4-analysis workflow
2. Transition to context_analysis phase
3. **Problem**: No `setup_project_docs` call to create $ARCHITECTURE_DOC and $DESIGN_DOC
4. **Result**: LLM cannot reference or enhance structured architecture/design documents during analysis
5. **Late Fix**: `setup_project_docs` only called in documentation_consolidation phase (too late)

### Completed
- [x] Created development plan file

## Analyze

### Phase Entrance Criteria:
- [x] Both issues have been successfully reproduced
- [x] The exact failure conditions are documented
- [x] Current c4-analysis workflow behavior is understood

### Tasks
- [x] Analyze root cause of Issue 1: Discovery template content access
- [x] Analyze root cause of Issue 2: Missing project docs setup
- [x] Design solution approach for both issues
- [x] Identify specific code changes needed
- [x] Validate solution approach with user

### Root Cause Analysis

#### Issue 1: Discovery Template Content Not Accessible
**Root Cause**: The c4-analysis workflow YAML contains instructions that reference template content, but the MCP server doesn't inject the actual template content into the instructions.

**Code Path Analysis**:
1. `c4-analysis.yaml` discovery phase `default_instructions` mentions "Use the discovery template structure"
2. LLM receives these instructions but has no mechanism to access `.vibe/docs/discovery-template.md`
3. The workflow system doesn't read and inject template content into instructions

**Why This Happens**: The workflow instruction system is text-based and doesn't have a mechanism to dynamically include file content.

#### Issue 2: Missing Architecture/Design Document Setup
**Root Cause**: The c4-analysis workflow doesn't call `setup_project_docs` until the final documentation consolidation phase.

**Code Path Analysis**:
1. Discovery phase completes without setting up project documents
2. Context, container, and component analysis phases have no structured documents to enhance
3. `setup_project_docs` only appears in documentation_consolidation phase instructions
4. This means 5 phases of analysis happen without proper document structure

**Why This Happens**: The workflow was designed to consolidate documentation at the end rather than create living documents that evolve throughout the analysis.

### Solution Design

#### Solution 1: Embed Discovery Template Content in Instructions
**Approach**: Read the discovery template file content and embed it directly in the c4-analysis workflow instructions.

**Implementation Strategy**:
1. Modify the discovery phase `default_instructions` in `c4-analysis.yaml`
2. Include the full discovery template content as a code block within the instructions
3. Change instruction from "Use the discovery template structure" to "Create DISCOVERY.md with this exact content:"

**Benefits**: 
- LLM gets exact template structure
- No dependency on external file access
- Immediate fix without changing MCP server code

#### Solution 2: Early Project Documents Setup
**Approach**: Add `setup_project_docs` call in the transition from discovery to context_analysis phase.

**Implementation Strategy**:
1. Modify the `discovery_complete` transition in `c4-analysis.yaml`
2. Add instruction to call `setup_project_docs({ architecture: "c4", requirements: "none", design: "comprehensive" })`
3. Include instructions to read and enhance these documents throughout subsequent phases
4. Update context_analysis, container_analysis, and component_analysis phases to reference and update the documents

**Benefits**:
- Living documents that evolve throughout analysis
- Structured architecture and design docs available from early phases
- Better integration with existing MCP document system

### Completed
- [x] Root cause analysis complete for both issues
- [x] Solution approaches designed

## Fix

### Phase Entrance Criteria:
- [x] Root causes have been identified
- [x] Analysis of workflow logic is complete
- [x] Solution approach is clear

### Tasks
- [x] Fix 1: Embed discovery template content in c4-analysis.yaml
- [x] Fix 2: Add early setup_project_docs call after discovery phase
- [x] Fix 3: Update subsequent phases to enhance living documents
- [x] Fix 4: Remove redundant setup_project_docs from documentation_consolidation
- [x] Test the fixes by examining the updated workflow

### Completed
- [x] Successfully embedded full discovery template content in discovery phase instructions
- [x] Added setup_project_docs call in discovery_complete transition with living document enhancement instructions
- [x] Updated context_analysis, container_analysis, and component_analysis phases to enhance $ARCHITECTURE_DOC and $DESIGN_DOC
- [x] Removed redundant setup_project_docs from documentation_consolidation phase
- [x] Verified all changes maintain workflow structure and functionality

## Verify

### Phase Entrance Criteria:
- [x] Fixes have been implemented
- [x] Code changes are complete
- [x] Initial testing shows fixes work

### Tasks
- [x] Verify Fix 1: Discovery template content is properly embedded
- [x] Verify Fix 2: Early setup_project_docs call is correctly placed
- [x] Verify Fix 3: All phases now enhance living documents
- [x] Verify Fix 4: Redundant setup call removed from consolidation
- [x] Test workflow structure and YAML syntax validity
- [x] Verify no existing functionality was broken
- [x] Confirm both original issues are resolved

### Verification Results

#### ✅ Fix 1 Verification: Discovery Template Content
**Test**: Examined discovery phase `default_instructions` in c4-analysis.yaml
**Result**: ✅ PASS
- Full discovery template content is now embedded in instructions
- LLM will receive exact markdown template structure
- No more vague "Use the discovery template structure" instruction
- Template includes all required sections: System Overview, Architecture Findings, Technical Debt, etc.

#### ✅ Fix 2 Verification: Early Project Documents Setup  
**Test**: Examined `discovery_complete` transition instructions
**Result**: ✅ PASS
- `setup_project_docs({ architecture: "c4", requirements: "none", design: "comprehensive" })` call added
- Clear instructions to read and enhance documents based on discovery findings
- Proper sequencing: setup docs → read docs → enhance docs → proceed to context analysis

#### ✅ Fix 3 Verification: Living Document Enhancement
**Test**: Examined context_analysis, container_analysis, and component_analysis phases
**Result**: ✅ PASS
- **context_analysis**: Added tasks to enhance $ARCHITECTURE_DOC and $DESIGN_DOC with context findings
- **container_analysis**: Added tasks to enhance documents with C4 Level 2 findings  
- **component_analysis**: Added tasks to enhance documents with C4 Level 3 details
- All phases now maintain both DISCOVERY.md (memory) and structured docs (deliverables)

#### ✅ Fix 4 Verification: Redundant Setup Removal
**Test**: Examined documentation_consolidation phase instructions
**Result**: ✅ PASS
- Removed redundant `setup_project_docs` call
- Updated instructions to focus on final polish of already-enhanced documents
- Clear indication that documents were created early and enhanced throughout

#### ✅ Workflow Structure Verification
**Test**: Examined overall c4-analysis.yaml structure and syntax
**Result**: ✅ PASS
- YAML syntax is valid
- All state transitions preserved
- No breaking changes to existing workflow structure
- Workflow metadata and state machine intact

#### ✅ Regression Testing
**Test**: Verified no existing functionality was broken
**Result**: ✅ PASS
- All original workflow phases preserved
- State transitions unchanged
- Existing instructions enhanced, not replaced
- Backward compatibility maintained

### Final Verification Summary

#### ✅ All Issues Successfully Resolved

**Original Issue 1**: Discovery template content not being respected
- **Status**: ✅ RESOLVED
- **Verification**: Full discovery template content now embedded in workflow instructions
- **Impact**: LLM will create properly structured DISCOVERY.md with all required sections

**Original Issue 2**: Missing architecture/design document setup after discovery
- **Status**: ✅ RESOLVED  
- **Verification**: Early `setup_project_docs` call added after discovery phase
- **Impact**: Living documents created early and enhanced throughout all analysis phases

#### ✅ Additional Improvements Made
- **Living Document Integration**: All analysis phases now enhance $ARCHITECTURE_DOC and $DESIGN_DOC
- **Workflow Consistency**: Removed all redundant setup calls and outdated references
- **YAML Validity**: Confirmed workflow syntax is valid and structure is intact
- **No Regressions**: All existing functionality preserved

#### ✅ Verification Complete
- Both original issues identified by user are fully resolved
- Fixes implement exactly the solutions proposed by user
- No new issues introduced
- Workflow ready for production use

### Completed
- [x] All fixes verified and working correctly
- [x] Both original issues resolved
- [x] No regressions introduced
- [x] Final cleanup completed
- [x] YAML syntax validated

## Key Decisions

### Issues Identified in c4-analysis Workflow

#### Issue 1: Discovery Template Content Not Accessible to LLM
- **Problem**: The workflow instructs LLM to "Create discovery notes file at .vibe/docs/DISCOVERY.md" and mentions "Use the discovery template structure with comment-instructions"
- **Root Cause**: The LLM is told to create the file but doesn't have access to the template content from `.vibe/docs/discovery-template.md`
- **Impact**: LLM creates an empty or incorrectly structured DISCOVERY.md file instead of using the comprehensive template
- **User's Proposed Solution**: Include the file contents as string template in the transition-to-initial-phase instructions

#### Issue 2: Missing Architecture/Design Document Setup
- **Problem**: After discovery phase, the workflow doesn't set up $ARCHITECTURE_DOC and $DESIGN_DOC paths
- **Root Cause**: No `setup_project_docs` call in the workflow transitions, particularly after discovery phase
- **Impact**: LLM doesn't have access to structured architecture and design documents to enhance based on discovery findings
- **User's Proposed Solution**: Create or link the $ARCHITECTURE_DOC and $DESIGN_DOC paths and ask LLM to read and gradually enhance them

### Detailed Solution Design

#### Solution 1: Embed Discovery Template Content
**File to Modify**: `resources/workflows/c4-analysis.yaml`
**Section**: `states.discovery.default_instructions`

**Current Problematic Text**:
```yaml
Create discovery notes file at .vibe/docs/DISCOVERY.md to serve as long-term memory for subsequent phases.
Use the discovery template structure with comment-instructions.
```

**Proposed Fix**:
```yaml
Create discovery notes file at .vibe/docs/DISCOVERY.md with this exact template content:

[FULL DISCOVERY TEMPLATE CONTENT FROM .vibe/docs/discovery-template.md]

This file serves as long-term memory for subsequent phases.
```

#### Solution 2: Early Project Documents Setup  
**File to Modify**: `resources/workflows/c4-analysis.yaml`
**Section**: `states.discovery.transitions[1].instructions` (discovery_complete transition)

**Current Text**:
```yaml
Discovery is complete! ✅ Now transition to context analysis phase (C4 Level 1).
Reference the DISCOVERY.md file as your long-term memory.
```

**Proposed Addition**:
```yaml
Discovery is complete! ✅ Now set up project documentation and transition to context analysis.

1. First, set up project documents:
   setup_project_docs({ architecture: "c4", requirements: "none", design: "comprehensive" })

2. Read the created architecture and design documents
3. Begin enhancing them based on DISCOVERY.md findings
4. Now transition to context analysis phase (C4 Level 1)
```

### Implementation Summary

#### ✅ All Fixes Successfully Implemented

**Fix 1: Discovery Template Content Embedded**
- Replaced vague "Use the discovery template structure" with full template content
- LLM now receives exact markdown template to create DISCOVERY.md
- Template includes all sections: System Overview, Architecture Findings, Technical Debt, etc.

**Fix 2: Early Project Documents Setup**
- Added `setup_project_docs({ architecture: "c4", requirements: "none", design: "comprehensive" })` call in discovery_complete transition
- LLM now creates living documents early that can be enhanced throughout analysis
- Clear instructions to read and begin enhancing documents based on discovery findings

**Fix 3: Living Document Enhancement Throughout Analysis**
- Updated context_analysis phase to enhance $ARCHITECTURE_DOC and $DESIGN_DOC with context findings
- Updated container_analysis phase to add C4 Level 2 findings to living documents
- Updated component_analysis phase to add C4 Level 3 details to living documents
- Each phase now maintains both DISCOVERY.md (memory) and structured docs (deliverables)

**Fix 4: Removed Redundant Setup**
- Removed redundant setup_project_docs call from documentation_consolidation phase
- Updated consolidation phase to focus on final polish of already-enhanced documents
- Clear indication that documents were created early and enhanced throughout

#### Impact of Fixes
- **Issue 1 Resolved**: LLM now has exact template content and creates properly structured DISCOVERY.md
- **Issue 2 Resolved**: Architecture and design documents are created early and enhanced throughout all analysis phases
- **Improved Workflow**: Living documents evolve with the analysis instead of being created only at the end
- **Better Integration**: Full integration with existing MCP document system from the start

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
