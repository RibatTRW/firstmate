# Test evidence: fm/firstmate-watcher-successor-gap-fix

## 1. New regression tests on fixed code (pass)
```
ok - Pi confirm failure retires the named arm with distinct watcher pid
ok - Pi superseded handling delivery carries no rejection appendix and is logged
ok - Pi repair starts a fresh arm instead of no-opping on a dead child
```
Selectors: `test_pi_confirm_failure_retires_arm_with_distinct_watcher_pid`,
`test_pi_superseded_delivery_has_no_rejection_appendix`,
`test_pi_repair_starts_fresh_arm_over_dead_child` in
`tests/fm-pi-watch-extension.test.sh` (driven via filtered runner; real
extension module loaded in node with real spawned arm-child processes).

## 2. Pre-fix reproduction (base 9284978 extension, same dead-child test)
```
not ok - Pi repair must start a fresh arm over a dead child handle
Error: repair did not start a fresh arm: watcher: unchanged - Pi extension
already owns an arm child; no manual re-arm needed; ...
```
Proves the test fails before the fix and passes after it.

## 3. Neighboring guards (no over-correction)
```
ok - Pi redundant tool call returns ownership guidance and spawns no second child
ok - Pi scheduled retry remains extension-owned after another tool call
ok - Pi refused handling handshake is classified and not swallowed
ok - Pi hung successor falls back to one typed actionable wake
ok - Pi clean empty close triggers a bounded continuity retry
```

## 4. Shell-level acked/superseded contract (bin/fm-wake-lib.sh)
```
ok - watch-arm: an already-acknowledged handling confirmation succeeds as a no-op
ok - watch-arm: a superseded handling confirmation reports a mismatch without churning successors
```

Worktree left clean (no transient test files remain).
