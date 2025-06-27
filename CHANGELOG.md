# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Progress tracking with real-time updates during test execution
- Animated spinner display with customizable update interval
- Elapsed time tracking for all operations
- Test completion percentage display when available
- Cancellation support with proper cleanup (Ctrl+C)
- Execution logging system with timestamped entries
- `:SnapshotLogs` command to view execution history
- `:SnapshotClearLogs` command to clear log history
- `:SnapshotDiff` command for interactive diff preview and selective updates
- Interactive diff viewer with syntax highlighting and keyboard shortcuts
- Selective approval/rejection of individual snapshot changes
- Before/after comparison view for updated snapshots
- Comprehensive configuration options via `g:snapshot_runner`
- Improved async execution with progress feedback

## [1.0.0] - 2024-12-26

### Added
- Initial release of snapshot-runner
- `:Snapshot` command to update all test snapshots
- `:SnapshotTest` command to update snapshot for test at cursor position
- `:SnapshotAll` command as alias for `:Snapshot`
- Automatic package manager detection (npm/yarn/pnpm)
- Test file recognition for common patterns (.test.js, .spec.ts, etc.)
- Cursor-based test name detection
- Comprehensive error handling and user feedback
- Full test coverage with TDD approach

### Technical Details
- Built with Denops (Deno-based Neovim plugin framework)
- Testable architecture with separated dispatcher functions
- TypeScript implementation with full type safety
- 22 test cases covering all functionality

[1.0.0]: https://github.com/lil-shimon/snapshot-runner/releases/tag/v1.0.0