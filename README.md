# snapshot-runner

A Neovim plugin using Denops to run `npm run test:fix` for updating test snapshots.

## Requirements

- Neovim
- [Denops.vim](https://github.com/vim-denops/denops.vim)
- Deno

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

## Usage

Run the following command in Neovim:

```vim
:Snapshot
```

This will execute `npm run test:fix` in the current working directory to update your test snapshots.

## License

MIT