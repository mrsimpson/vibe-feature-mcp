# Development Plan: responsible-vibe-2 (i18n branch)

*Generated on 2025-07-10 by Vibe Feature MCP*
*Workflow: minor*

## Goal
Add internationalization (i18n) support to responsible-vibe-mcp by detecting user language and translating plan files immediately after creation during development start, before asking for entrance criteria formulation.

## Explore
### Tasks
- [x] Analyze the current development start flow in start_development tool
- [x] Identify where plan file creation happens in the codebase
- [x] Determine how to detect user language from conversation context
- [x] Design the translation instruction flow
- [x] Assess impact on existing start_development workflow
- [x] Define the new instruction sequence: plan creation → language detection → translation → entrance criteria

### Completed
- [x] Created development plan file
- [x] Defined feature goal and requirements
- [x] Analyzed start_development tool handler (lines 120-140 handle plan file creation)
- [x] Found plan file creation in PlanManager.ensurePlanFile() method
- [x] Identified insertion point: after plan file creation, before entrance criteria instruction

## Implement

### Phase Entrance Criteria:
- [x] The i18n feature requirements have been thoroughly analyzed
- [x] The implementation approach has been designed and documented
- [x] The impact on existing code has been assessed
- [x] The integration points have been identified

### Tasks
- [x] ~~Create language detection utility function~~ (over-engineered)
- [x] ~~Add i18n instruction generation logic~~ (over-engineered)
- [x] ~~Modify start_development tool handler to include i18n instructions~~ (over-engineered)
- [x] **NEW: Add simple static i18n instruction to start_development response**
- [x] **NEW: Test the simplified approach with different languages**
- [x] Remove the complex language detection code (cleanup)
- [x] Update tests to reflect the simplified approach
- [x] Verify no breaking changes to existing functionality

### Completed
- [x] ~~Created language-detector.ts with detectLanguage() and generateI18nInstruction() functions~~ (over-engineered)
- [x] ~~Added language detection support for Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese~~ (over-engineered)
- [x] ~~Modified StartDevelopmentHandler to include user_input parameter and language detection~~ (over-engineered)
- [x] ~~Updated server configuration to accept user_input parameter~~ (over-engineered)
- [x] ~~Created comprehensive test suite with 11 test cases~~ (over-engineered)
- [x] Verified all existing tests still pass (154 tests passed)
- [x] **INSIGHT: Recognized that the approach was over-engineered**
- [x] **IMPLEMENTED: Simple static i18n instruction in start_development response**
- [x] **CLEANED UP: Removed over-engineered language detection files**
- [x] **VERIFIED: All tests pass with simplified approach**

## Key Decisions
**PIVOT: Simplified Static Approach**: User correctly identified that the complex language detection approach is over-engineered. Much simpler solution:
- Just add a static instruction to the LLM: "If the user is communicating in a non-English language, translate the plan file skeleton to that language and continue the conversation in the user's language"
- No need for complex language detection algorithms or dynamic instruction generation
- The LLM is already capable of detecting languages and translating content
- This approach is simpler, more maintainable, and leverages the LLM's existing capabilities

**Original Complex Approach**: Language detection utility with heuristics and dynamic instruction generation (over-engineered)

**New Simple Approach**: Static instruction in system prompt or tool response telling LLM to handle i18n naturally

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
