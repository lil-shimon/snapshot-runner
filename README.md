# snapshot-runner

A Neovim plugin using Denops that provides intelligent test snapshot updating commands. Automatically detects package managers (npm/yarn/pnpm) and supports updating specific test snapshots at cursor position.

## Features

- 🚀 **Smart Package Manager Detection** - Automatically detects npm, yarn, or pnpm from lock files
- 🎯 **Cursor-based Test Detection** - Update snapshots for specific tests at your cursor position
- 📁 **Test File Recognition** - Supports `.test.js`, `.spec.ts`, and other common test file patterns
- ⚡ **Fast Execution** - Non-blocking asynchronous command execution
- 📊 **Progress Tracking** - Real-time progress display with spinner, elapsed time, and test count
- 🛑 **Cancellation Support** - Cancel long-running operations with Ctrl+C
- 📝 **Execution Logs** - Detailed logging of test execution with `:SnapshotLogs`
- 🔍 **Interactive Diff Preview** - Preview and selectively apply snapshot changes with `:SnapshotDiff`
- ✅ **Selective Updates** - Approve or reject individual snapshot changes before applying
- 🎨 **Syntax Highlighting** - Color-coded diff viewer with before/after comparisons
- 🔧 **TDD Developed** - Built with comprehensive test coverage using Deno testing

## Requirements

- Neovim with Denops support
- [Denops.vim](https://github.com/vim-denops/denops.vim)
- Deno (for Denops functionality)
- Node.js project with test framework (Jest, Vitest, etc.)

## Installation

Using [vim-plug](https://github.com/junegunn/vim-plug):

```vim
Plug 'vim-denops/denops.vim'
Plug 'lil-shimon/snapshot-runner'
```

Using [packer.nvim](https://github.com/wbthomason/packer.nvim):

```lua
use {
  'lil-shimon/snapshot-runner',
  requires = {'vim-denops/denops.vim'}
}
```

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  'lil-shimon/snapshot-runner',
  dependencies = {'vim-denops/denops.vim'}
}
```

## Usage

### Available Commands

#### `:Snapshot` (Current Implementation)
Updates all test snapshots in the project using the detected package manager:

```vim
:Snapshot
```

This automatically detects your package manager (npm/yarn/pnpm) and runs the equivalent of `npm run test:fix`.

#### `:SnapshotTest` ✨ New!
Updates the snapshot for the specific test at your cursor position:

```vim
:SnapshotTest
```

Position your cursor inside a test function and run this command to update only that test's snapshot.

#### `:SnapshotAll`
Alias for `:Snapshot` - updates all test snapshots:

```vim
:SnapshotAll
```

#### `:SnapshotLogs` ✨ New!
View detailed execution logs in a new buffer:

```vim
:SnapshotLogs
```

Shows timestamped logs with syntax highlighting for errors and success messages.

#### `:SnapshotClearLogs` ✨ New!
Clear all execution logs:

```vim
:SnapshotClearLogs
```

#### `:SnapshotDiff` ✨ New!
Preview snapshot changes before applying them:

```vim
:SnapshotDiff
```

Shows an interactive diff viewer where you can:
- See what snapshots will be created, updated, or deleted
- Approve or reject individual changes with `a` and `r`
- Approve all changes with `A` or reject all with `R`
- Apply approved changes with `<Enter>`
- Quit without applying with `q`

The diff viewer includes:
- Syntax highlighting for different change types
- Before/after comparison for updated snapshots
- File paths and test names for each change
- Real-time status updates as you approve/reject changes

### Supported Test Patterns

The plugin recognizes these test patterns:
- `it('test name', () => { ... })`
- `test('test name', () => { ... })`
- Nested tests inside `describe` blocks

### Supported File Extensions

- `.test.js`, `.test.ts`, `.test.jsx`, `.test.tsx`
- `.spec.js`, `.spec.ts`, `.spec.jsx`, `.spec.tsx`

## Configuration

Configure the plugin by setting `g:snapshot_runner` in your Neovim config:

```vim
let g:snapshot_runner = {
  \ 'show_progress': v:true,
  \ 'show_spinner': v:true,
  \ 'show_elapsed_time': v:true,
  \ 'show_percentage': v:true,
  \ 'progress_update_interval': 100,
  \ 'show_execution_log': v:false,
  \ 'async_execution': v:true
  \ }
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `show_progress` | boolean | `true` | Enable/disable progress tracking display |
| `show_spinner` | boolean | `true` | Show animated spinner during execution |
| `show_elapsed_time` | boolean | `true` | Display elapsed time during execution |
| `show_percentage` | boolean | `true` | Show test completion percentage when available |
| `progress_update_interval` | number | `100` | Progress update interval in milliseconds (50-1000) |
| `show_execution_log` | boolean | `false` | Enable real-time logging to messages |
| `async_execution` | boolean | `true` | Run commands asynchronously (non-blocking) |

## Development

This project uses Test-Driven Development with Deno:

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Type check
deno task check

# Format code
deno task fmt
```

## License

MIT