# snapshot-runner

A Neovim plugin using Denops that provides intelligent test snapshot updating commands. Automatically detects package managers (npm/yarn/pnpm) and supports updating specific test snapshots at cursor position.

## Features

- 🚀 **Smart Package Manager Detection** - Automatically detects npm, yarn, or pnpm from lock files
- 🎯 **Cursor-based Test Detection** - Update snapshots for specific tests at your cursor position
- 📁 **Test File Recognition** - Supports `.test.js`, `.spec.ts`, and other common test file patterns
- ⚡ **Fast Execution** - Non-blocking asynchronous command execution
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

### Supported Test Patterns

The plugin recognizes these test patterns:
- `it('test name', () => { ... })`
- `test('test name', () => { ... })`
- Nested tests inside `describe` blocks

### Supported File Extensions

- `.test.js`, `.test.ts`, `.test.jsx`, `.test.tsx`
- `.spec.js`, `.spec.ts`, `.spec.jsx`, `.spec.tsx`

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