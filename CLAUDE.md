# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MANDATORY WORKFLOW RULES

**1. Auto-commit and Push After File Edits**:
- ALWAYS commit and push immediately after editing any file
- Do not wait for user instruction to commit
- Use descriptive commit messages following the established format

**2. Session Reflection and Learning**:
- After EVERY user prompt, reflect on the work done in that interaction
- If there are improvements, insights, or workflow preferences discovered, immediately update this CLAUDE.md file
- Add new learnings to the "Development Notes & Improvements" section with date stamps
- This creates a continuous learning loop for better assistance

## Project Overview

This is a Neovim plugin built with **Denops** (Deno-based plugin system) that provides commands to update test snapshots. The current implementation runs `npm run test:fix` to update all snapshots, with planned enhancements to update specific tests at cursor position.

## Development Commands

All development uses Deno tasks defined in `deno.json`:

```bash
# Run all tests
deno task test

# Run tests in watch mode during development
deno task test:watch

# Type checking
deno task check

# Format code
deno task fmt

# Lint code
deno task lint

# Run a single test file
deno test test/getTestAtCursor.test.ts --allow-read --allow-write --allow-run --allow-env
```

## Architecture

**Denops Plugin Structure**: The plugin follows Denops conventions with a specific directory layout that must be maintained:

- `denops/snapshot-runner/main.ts` - Main plugin logic using Denops API
- `plugin/snapshot-runner.vim` - Vim plugin initialization (minimal boilerplate)
- `test/` - Deno-based tests using BDD style testing
- `test/helper.ts` - Test utilities for creating mock file content

**Key Architectural Concepts**:

1. **Denops Dispatcher Pattern**: The main plugin exports a `main()` function that registers command handlers via `denops.dispatcher`
2. **Vim Command Registration**: Commands are registered using `denops.cmd()` to create Vim commands like `:Snapshot`
3. **Process Execution**: Uses `Deno.Command` to execute npm/yarn/pnpm commands in the current working directory
4. **Error Handling**: Uses Vim's `echohl` for colored error messages in the command line

## Current Implementation

The plugin currently provides:
- `:Snapshot` command that runs `npm run test:fix` in the current directory
- Basic error handling with success/failure feedback
- Asynchronous execution without blocking Neovim UI

## Development Roadmap

See `ROADMAP.md` for detailed implementation plan. Key upcoming features:

1. **`:SnapshotTest`** - Update snapshot for test at cursor position
2. **Package Manager Detection** - Auto-detect npm/yarn/pnpm from lock files
3. **Test File Detection** - Parse JavaScript/TypeScript test files to extract test names
4. **Cursor Position Analysis** - Use Neovim API to find which test the cursor is in

## Testing Strategy

The project uses **TDD (Test-Driven Development)**:
- Tests are written using Deno's standard testing library with BDD style
- Test files are in `test/` directory with `.test.ts` extension
- Helper functions in `test/helper.ts` create mock file content for testing
- Run tests frequently during development with `deno task test:watch`

## Key Functions to Implement

Based on test files, these functions need TDD implementation:

1. **`getTestAtCursor()`** - Detect test name at cursor position by parsing file content
2. **`detectPackageManager()`** - Auto-detect npm/yarn/pnpm from lock files in project directory
3. **`executeTestCommand()`** - Run package manager with appropriate test update flags

## Plugin Testing in Neovim

To test the plugin locally in Neovim:
1. Ensure Denops.vim is installed and working
2. Add this plugin to your Neovim configuration
3. Use `:messages` to see any Denops errors  
4. Test commands in a JavaScript/TypeScript project with test files

## Development Notes & Improvements

### 2024-12-26 Session Learnings:

**Workflow Rule Clarification**:
- User emphasized that auto-commit/push after file edits should be a MANDATORY rule, not just a preference
- Session reflection and CLAUDE.md updates should also be MANDATORY after every user interaction
- These are strong enforcement rules, not suggestions

**Git Workflow Preferences**:
- User prefers commits organized by file categories rather than logical features
- Example: separate commits for 1) roadmap, 2) config files, 3) helpers, 4) tests
- Always ask before committing and respect user's categorization preferences

**Testing Approach**:
- User values TDD and wants comprehensive test coverage for Denops plugins
- Tests should be written before implementation using Deno's BDD testing framework
- Test helper functions may seem unused initially but are essential for actual TDD implementation
- Explain the purpose and timing of helper function usage clearly

**User Feedback Integration**:
- User asked for continuous improvement tracking in CLAUDE.md after each interaction
- This creates a learning loop for better assistance in future sessions
- Document both technical decisions and workflow preferences

**Denops Development Insights**:
- Denops plugins require specific directory structure (`denops/plugin-name/main.ts`)
- Import map configuration in `deno.json` is crucial for testing dependencies
- BDD testing style with `@std/testing/bdd` works well for Denops plugin testing
- TDD approach helps clarify plugin architecture before implementation

**TDD Implementation Success**:
- Successfully implemented getTestAtCursor() and detectPackageManager() functions using TDD
- Created utility functions in src/utils.ts separate from Denops plugin code for easier testing
- All tests pass - test file detection, test name extraction, and package manager detection work correctly
- Key learning: Test file names in test cases must match the regex pattern for proper validation

**README Documentation Update**:
- Updated README to reflect current features and planned functionality
- Added comprehensive features section with clear descriptions
- Documented both current (:Snapshot) and planned (:SnapshotTest) commands
- Added development section with Deno task commands for contributors
- README now accurately represents the project's capabilities and roadmap

**Complete TDD Implementation Cycle**:
- Successfully completed full TDD cycle from test cases to working implementation
- Integrated testable dispatcher functions into Denops plugin
- Implemented :SnapshotTest command for cursor-based test snapshot updates
- Added :SnapshotAll command as alias for backward compatibility
- All 22 test cases pass with comprehensive coverage
- Updated README to reflect completed SnapshotTest feature (changed from "Coming Soon" to "New!")
- Plugin now supports both global and specific test snapshot updates with auto package manager detection