if exists('g:loaded_snapshot_runner')
  finish
endif
let g:loaded_snapshot_runner = 1

augroup snapshot_runner
  autocmd!
augroup END