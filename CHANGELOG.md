# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Project Documentation System**: Complete intelligent artifact management system
  - Dynamic template discovery from file system structure
  - Support for Arc42, EARS, Comprehensive, and Freestyle documentation templates
  - `setup_project_docs` tool for creating project documentation artifacts
  - Workflow integration with document variable substitution (`$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`, `$DESIGN_DOC`)
  - Intelligent setup guidance that analyzes workflows to detect missing documents
  - Zero-maintenance template system - add new templates by dropping files in templates directory
  - Comprehensive error handling and validation for template operations
  - Full test coverage for template system and artifact management

### Changed
- All workflows now include contextual document references in their instructions
- `start_development` tool now provides targeted guidance for missing project documents
- Enhanced workflow analysis to detect document requirements dynamically

### Technical
- New `TemplateManager` class for dynamic template loading and rendering
- New `ProjectDocsManager` class for centralized artifact management
- Template system uses resource path resolution strategy for proper build inclusion
- Workflow instruction variable substitution system
- Dynamic enum generation for MCP tool configuration based on discovered templates
