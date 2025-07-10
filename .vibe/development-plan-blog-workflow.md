# Development Plan: responsible-vibe-2 (blog-workflow branch)

*Generated on 2025-07-10 by Vibe Feature MCP*
*Workflow: epcc*

## Goal
Create a comprehensive workflow for writing posts, adapted from the EPCC methodology to focus on text-focused content creation with research and differentiation components.

## Explore
### Tasks
- [ ] Research existing post-writing workflows and methodologies
- [ ] Understand the specific needs for text-focused content creation
- [ ] Identify key differences from presentation workflows
- [ ] Explore research and linking requirements for posts
- [ ] Document findings and insights
- [ ] Gather user requirements for post types and scope
- [ ] Understand current pain points and desired improvements
- [ ] Explore SEO and content optimization needs
- [ ] Finalize workflow adaptation decisions

### Completed
- [x] Created development plan file
- [x] Added entrance criteria for all workflow phases
- [x] Initiated user requirements gathering
- [x] Gathered detailed user requirements and pain points
- [x] Analyzed existing blog posts for style and structure patterns
- [x] Documented current 7-step process
- [x] Clarified workflow adaptation preferences (single adaptive workflow)
- [x] Determined research integration approach (early phase)
- [x] Confirmed need for story outline phase
- [x] Established SEO timing (late optimization)
- [x] Confirmed originality analysis approach (early phase)
- [x] Understood multi-platform publishing needs
- [x] Designed proposed workflow structure adapting EPCC for post writing

## Plan
### Phase Entrance Criteria:
- [x] The post-writing domain has been thoroughly explored
- [x] Key differences from presentation workflows are documented
- [x] Research and linking requirements are understood
- [x] Text-focused content creation needs are clear

### Tasks
- [x] Design detailed workflow phases with specific steps
- [ ] Define entrance and exit criteria for each workflow phase
- [ ] Create format decision framework (long-form vs short posts)
- [ ] Design research and originality analysis process
- [ ] Plan story outline and structure methodology
- [ ] Define SEO optimization checklist and timing
- [ ] Create multi-platform adaptation strategy
- [x] Design workflow state machine and transitions
- [ ] Plan integration with existing tools and processes
- [ ] Define success metrics and quality gates
- [ ] Create workflow documentation structure
- [ ] Plan user guidance and instructions for each phase

### Completed
- [x] Received user feedback on workflow structure
- [x] Refined phase naming to be meaningful (Discovery->Story->Writing->Illustration->Distribution)
- [x] Decided to separate visual creation from content writing
- [x] Determined to use prompt-based guidance instead of dynamic decision trees
- [x] Examined existing workflow structure (slides.yaml) to understand proper format
- [x] Designed 5-phase workflow structure with static instructions and transitions

## Code
### Phase Entrance Criteria:
- [x] A detailed implementation strategy has been created
- [x] Workflow phases and transitions are planned
- [x] Specific tasks for each phase are defined
- [x] Research and differentiation processes are planned

### Tasks
- [x] Create posts.yaml workflow file in resources/workflows directory
- [x] Implement all 5 workflow phases (discovery, story, writing, illustration, distribution)
- [x] Add proper state transitions with triggers and instructions
- [x] Test workflow file syntax and structure
- [x] Verify workflow loads correctly in the system
- [x] Run existing tests to ensure no regressions
- [x] Update any necessary configuration or documentation

### Completed
- [x] Created complete posts.yaml workflow with all 5 phases
- [x] Implemented proper state machine structure matching existing workflows
- [x] Added comprehensive instructions for each phase
- [x] Included all necessary transitions and triggers
- [x] Verified YAML syntax is valid
- [x] Confirmed workflow loads successfully via StateMachineLoader
- [x] Ran all tests - 154/154 passed with no regressions
- [x] Verified workflow structure matches existing system patterns
- [x] Built project successfully - implementation complete

**Note**: The posts workflow is successfully implemented and loads correctly. It may require a server restart to appear in the workflow list, but the core functionality is complete and tested.

## Commit
### Phase Entrance Criteria:
- [x] The post-writing workflow is fully implemented
- [x] All workflow phases are properly defined
- [x] Research and linking processes are integrated
- [x] The workflow is tested and validated

### Tasks
- [ ] Final code review and quality check
- [ ] Commit the posts workflow implementation
- [ ] Update documentation if needed
- [ ] Verify final deliverable is complete

### Completed
- [x] Final code review and quality check
- [x] Commit the posts workflow implementation (commit 06fb7a6)
- [x] Verified final deliverable is complete
- [x] All entrance criteria met and implementation successful

## Key Decisions
- Using EPCC workflow methodology as the foundation
- Commits will be made after each phase completion
- Focus on text-focused content creation vs. visual presentations
- Research and linking components are core requirements
- **Post format should be clarified early in workflow** (long-form blog vs short HN posts)
- Target platforms: LinkedIn, Medium, Hacker News
- Content should avoid 1:1 copying but can summarize and link to existing content
- **Single adaptive workflow** that branches based on format decision (not separate workflows)
- **Research integration** in early phase (not separate research phase)
- **Story outline phase** needed to address consistency challenges
- **SEO optimization** happens late in process (focus on writing first)
- **Originality analysis** integrated in early phase
- **Multi-platform publishing** using same core content with length adaptations
- **5-phase workflow structure**: Discovery → Story → Writing → Illustration → Distribution
- **Prompt-based guidance** for LLM adaptation (not dynamic decision trees)
- **Visual creation separated** from content writing phase

## Notes
**User's Current Process (7 steps):**
1. Start with motivation
2. Explore field of current approaches  
3. Ideate storyline and metaphors
4. Creative writing
5. Add visuals
6. Publish
7. (implied: platform-specific formatting)

**Post Types & Platforms:**
- **Long-form**: Blog posts for LinkedIn, Medium (existing posts at ~/projects/privat/blog/src/content/blog)
- **Short-form**: 3-10 liner posts for Hacker News
- Format decision should happen early in workflow

**Research Requirements:**
- Competitor analysis (depending on topic)
- Fact-checking
- Finding supporting sources
- SEO considerations
- Avoiding 1:1 duplication while allowing summarization and linking

**Pain Points:**
- Challenge to write something new/original
- Maintaining consistent story without diving into adjacent topics
- SEO optimization needs improvement

**Analysis of Existing Posts:**
- **Structure Pattern**: Title → tl;dr → Personal intro/motivation → Problem exploration → Solution/insights → Conclusion
- **Style**: Personal, conversational German, uses metaphors (Lego building, driving analogies)
- **Length**: 2000-5000+ words for long-form posts
- **Visuals**: Screenshots, diagrams, metaphorical images
- **Frontmatter**: title, pubDate, description, tags
- **Topics**: Technical (AI, development) with personal perspective and practical insights

**Workflow Design Insights:**

**Proposed Workflow Structure (adapting EPCC for posts):**
1. **Explore Phase**: 
   - Format decision (long-form vs short)
   - Topic motivation & research
   - Originality analysis & competitive landscape
   - Target audience clarification

2. **Plan Phase**:
   - Story outline & structure design
   - Key messages & metaphors
   - Content scope boundaries (avoid adjacent topics)
   - Platform adaptation strategy

3. **Code Phase** (Writing):
   - Creative writing following outline
   - Content creation with consistent narrative
   - Visual integration (for long-form)
   - Draft completion

4. **Commit Phase** (Publish):
   - SEO optimization
   - Platform-specific formatting
   - Final review & polish
   - Multi-platform publishing

**Post-Writing Workflow Specification (posts.yaml):**

```yaml
name: posts
description: "A comprehensive workflow for writing posts - from blog posts to short-form content, with research, story development, and multi-platform publishing"
initial_state: discovery

states:
  discovery:
    description: "Research topic, decide format, and analyze competitive landscape"
    default_instructions: |
      Starting discovery phase for post development. This is where you define the foundation of your post.

      Focus on understanding the topic and format:
      - Help user decide post format: Ask about goal (quick insight vs deep exploration), topic complexity, available time
      - Research existing content on this topic to identify gaps and opportunities
      - Guide user to articulate personal motivation and unique angle
      - Conduct competitive landscape analysis to avoid duplication
      - Define target audience and platform considerations
      - Gather initial sources and reference materials

      Work with the user to establish clear direction before moving to story development.
      Update the plan file with discovery progress and key decisions.

    transitions:
      - trigger: discovery_complete
        to: story
        instructions: |
          Discovery complete! ✅ You have clear format decision, unique angle, and research foundation.

          Now transition to story phase to create narrative structure:
          - Create story outline with clear narrative arc
          - Identify key messages and supporting metaphors
          - Define content scope boundaries to avoid adjacent topics
          - Plan platform adaptation strategy
          - Ensure story structure matches chosen format (tight for short, comprehensive for long)

          Update the plan file with story development tasks and mark completed discovery work.
        transition_reason: "Topic researched and format decided, ready for story structure development"

  story:
    description: "Create narrative structure and story outline"
    default_instructions: |
      Working on story development phase. Focus on creating a compelling narrative structure.

      Key activities for this phase:
      - Create detailed story outline with clear beginning, middle, end
      - Identify key messages and memorable metaphors/examples
      - Define content scope boundaries to maintain focus and avoid adjacent topics
      - Plan how content will adapt across different platforms
      - Ensure narrative arc matches chosen format (concise for short posts, comprehensive for long-form)
      - Structure content to maintain user's personal voice and conversational style

      Work with the user to create a solid story foundation before moving to writing.
      Update the plan file with story decisions and structural progress.

    transitions:
      - trigger: story_complete
        to: writing
        instructions: |
          Story complete! ✅ You have a clear narrative structure and content outline.

          Now transition to writing phase for content creation:
          - Write content following the story outline
          - Maintain narrative consistency and personal voice
          - Focus purely on text content creation
          - Ensure length matches chosen format
          - Keep content within defined scope boundaries
          - Create engaging, conversational content that reflects user's style

          Update the plan file with writing tasks and mark completed story work.
        transition_reason: "Story structure and outline complete, ready for content creation"

      - trigger: need_more_discovery
        to: discovery
        additional_instructions: "Story development revealed gaps in research or format clarity. Focus on clarifying these foundational aspects."
        transition_reason: "Story work revealed need for additional discovery or research"

  writing:
    description: "Create the actual post content following story outline"
    default_instructions: |
      Working on writing phase. Focus purely on creating engaging content.

      Key activities for this phase:
      - Write content following the established story outline
      - Maintain consistent narrative flow and personal voice
      - Create engaging, conversational content in user's style
      - Ensure content length matches chosen format (3-10 lines for short, 2000-5000+ words for long)
      - Stay within defined content scope to avoid adjacent topics
      - Include concrete examples and metaphors as planned
      - Create clear section structure with appropriate headings (for long-form)

      Focus on high-quality content creation without visual elements.
      Update the plan file with writing progress and content decisions.

    transitions:
      - trigger: writing_complete
        to: illustration
        instructions: |
          Writing complete! ✅ You have solid content that follows your story outline.

          Now transition to illustration phase for visual enhancement:
          - Identify where visuals would enhance understanding or break up text
          - Plan visual content (screenshots, diagrams, metaphorical images)
          - Consider format-appropriate visual density (minimal for short posts)
          - Create or source appropriate visual elements
          - Ensure visuals support the story and maintain professional appearance

          Update the plan file with illustration tasks and mark completed writing work.
        transition_reason: "Content creation complete, ready for visual enhancement"

      - trigger: need_story_revision
        to: story
        additional_instructions: "Writing revealed issues with story structure or narrative flow. Focus on refining the story foundation."
        transition_reason: "Content creation revealed need for story structure refinement"

  illustration:
    description: "Create and integrate visual elements"
    default_instructions: |
      Working on illustration phase. Focus on visual enhancement of your content.

      Key activities for this phase:
      - Identify strategic locations for visual elements
      - Create or source appropriate visuals (screenshots, diagrams, metaphorical images)
      - Ensure visual density matches format (minimal for short posts, comprehensive for long-form)
      - Maintain visual consistency and professional appearance
      - Ensure visuals support and enhance the written content
      - Consider accessibility and platform compatibility
      - Plan visual integration and placement

      Focus on creating visuals that enhance rather than distract from the content.
      Update the plan file with illustration progress and visual decisions.

    transitions:
      - trigger: illustration_complete
        to: distribution
        instructions: |
          Illustration complete! ✅ You have visually enhanced content ready for publishing.

          Now transition to distribution phase for optimization and publishing:
          - Optimize for SEO (titles, descriptions, tags)
          - Adapt content for different platforms while maintaining core message
          - Format content appropriately for each target platform
          - Conduct final quality review and polish
          - Prepare for multi-platform publishing

          Update the plan file with distribution tasks and mark completed illustration work.
        transition_reason: "Visual elements complete, ready for SEO optimization and publishing"

      - trigger: need_more_content
        to: writing
        additional_instructions: "Illustration work revealed gaps in written content. Focus on completing the content foundation."
        transition_reason: "Visual work revealed need for additional written content"

  distribution:
    description: "Optimize for SEO and publish across platforms"
    default_instructions: |
      Working on distribution phase. Focus on optimization and multi-platform publishing.

      Key activities for this phase:
      - Create compelling, SEO-optimized titles and descriptions
      - Add appropriate tags and metadata for discoverability
      - Adapt content formatting for different platforms (LinkedIn, Medium, HN)
      - Maintain core message while adjusting for platform-specific requirements
      - Conduct final quality review and polish
      - Prepare publishing materials and schedule
      - Execute multi-platform publishing strategy

      Focus on maximizing reach while maintaining content quality and consistency.
      Update the plan file with distribution progress and publishing decisions.

    transitions:
      - trigger: distribution_complete
        to: discovery
        instructions: |
          Distribution complete! ✅ Your post has been successfully published across platforms.

          Return to discovery phase, ready for the next post project:
          - Document lessons learned and successful approaches
          - Archive post materials and research
          - Note improvements for future posts
          - Prepare for new post topics and projects

          Mark all distribution tasks as complete and prepare for new work.
        additional_instructions: "Post successfully published. Ready for next post project."
        transition_reason: "Post publishing completed successfully, ready for new projects"

      - trigger: need_final_review
        to: illustration
        additional_instructions: "Distribution preparation revealed issues with visuals or content presentation. Focus on final refinements."
        transition_reason: "Publishing preparation identified issues requiring visual or content refinement"
```

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
