# Live validation transcript: titled Claude composer (issues #5601, #5558)

Change: `bin/fm-composer-lib.sh` recognizes a Claude composer whose TOP border
carries a session title (`─── Firstmate operational input 1790546042 ─`) as the
composer edge, so an idle empty composer reads `empty` (not `unknown`) on every
cursorless backend; plus `bin/backends/herdr.sh` keeps Claude's muted-grey
(38;2;112;112;112) typed slash command in the Herdr payload proof.

Lab: isolated Herdr session `fm-lab-composer5601-*` via `bin/fm-herdr-lab.sh`
(prepare/provision/run/teardown contract, default session untouched), real
Claude Code 2.1.283 on Herdr 0.9.1. Titled shape reproduced with
`claude -n "Firstmate operational input 1790546042"` (`-n` burns the display
name into the prompt box top rule — the exact reported condition).

| # | Live check | Result |
|---|------------|--------|
| 1 | Idle titled composer via repo path `fm_backend_herdr_composer_state` | `empty` (same capture through pre-fix lib: `unknown`) |
| 2 | Normal steer via `fm_backend_herdr_send_text_submit` on titled pane | verdict `empty`, reply rendered (2 token occurrences) |
| 3 | Manually typed draft on titled pane | state `pending`, content == draft verbatim |
| 4 | Enter on that draft (no retype) | composer `empty`, transcript keeps exactly 1 occurrence — submitted, neither overwritten nor duplicated |
| 5 | Non-ASCII title (`-n "✳ ..."`) live | `unknown` — refuses rather than guessing width |
| 6 | Typed `/exit` in muted grey 38;2;112;112;112 + popup on titled pane | content proof retains `/exit` (pre-fix strip: empty); Enter exits Claude, no Ctrl+U clear |
| 7 | Titled Claude on isolated tmux server via `fm_tmux_composer_state` | `empty` (cursor-anchored and cursorless both `empty`; pre-fix cursorless: `unknown`) |

Not exercised live: zellij, cmux, orca — none installed on this machine.
Their caps shapes are covered by the byte-exact matrix test only.
Not producible via real Claude rendering (stated explicitly, covered by
byte-exact fixtures in `test_matrix_claude_titled_top_rule`): scrollback
sandwich, width-mismatched rule, flush-at-start title, blank row under titled
rule — Claude always renders matching-width rules around its own live `❯` row.

Supporting byte-exact runs (both files fully green):
`tests/fm-composer-lib.test.sh` incl. `test_matrix_claude_titled_top_rule`;
`tests/fm-backend-herdr.test.sh` incl.
`test_send_text_submit_claude_grey_slash_command_is_proven_and_submitted`.

Raw captures alongside this file: `live-titled-ansi.txt` (the reported border),
`live-titled-draft-ansi.txt`, `live-nonascii-ansi.txt`,
`live-grey-exit-ansi.txt` (grey `/exit` + popup), `live-tmux-titled-ansi.txt`.
