# Test-phase evidence: fm/firstmate-5601-composer-pr (35f7861 vs base 3c2a91d)

Intent: an idle Claude Code worker whose composer top border carries a session
title (`─── Firstmate operational input 1790546042 ─`) read `unknown` on every
cursorless backend, refusing fm-send / fm-control exit / relaunch (#5601, #5558).
Fix: `_fm_composer_titled_rule_row` + `_fm_composer_bare_rule_sandwich` in
bin/fm-composer-lib.sh, plus FM_COMPOSER_GHOST_LUMA_MAX=0 for the Herdr Claude
payload proof in bin/backends/herdr.sh (Claude 2.1.283 draws typed `/exit` in
muted grey 38;2;112;112;112, which the grok-tuned ghost strip dropped).

## Fail-before (base 3c2a91d, production code only, tests at target)
- `titled claude idle on herdr: expected empty, got 'unknown'` (composer suite exits 1)
- `a typed /exit drawn in Claude's grey slash-command colour must be proven and
  submitted, got 'unknown'` (herdr grey-slash test fails)

## Pass-after (target 35f7861)
- tests/fm-composer-lib.test.sh: exit 0, 41 ok, 0 not-ok.
  Includes `matrix: claude's titled top rule proves an idle composer empty and a
  draft pending (#5601, #5558)` — idle empty on herdr/zellij/cmux-orca/tmux,
  typed pending, scrollback sandwich / width mismatch / non-ASCII title /
  flush title / blank row all stay unknown, untitled pair unchanged.
- tests/fm-backend-herdr.test.sh: exit 0, 227 ok, 0 not-ok, with ONE
  environment exclusion: `test_version_check_refuses_missing_herdr` assumes
  no `herdr` on /usr/bin:/bin, but this host has real herdr at /usr/bin/herdr,
  so it fails identically on base and target (verified: base code returns
  status 0 with real herdr on PATH). Excluded via transient suite copy only;
  tracked files untouched, worktree left clean.
  Includes `a typed slash command Claude draws in muted truecolor grey is
  proven and submitted`.
- tests/fm-backend-herdr-smoke.test.sh (LIVE, real herdr 0.9.1 server, private
  throwaway HERDR_SESSION, trap cleanup): exit 0, 17 ok, 0 not-ok.

## Not driven live
Interactive titled-Claude TUI end-to-end (named session, real Claude Code pane,
capture + classify): needs an interactive Claude session with API spend and TUI
pty driving. Covered instead by byte-exact regression tests built from live
captures (claude 2.1.283 grey verified live per code comments). To run live:
provision an fm-lab-* Herdr session, start a named interactive Claude worker,
and classify its captured composer.
