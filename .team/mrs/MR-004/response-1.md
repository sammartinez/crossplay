### B1 · fixed · 2a6650e
QA added the unmount-guard test to `src/hooks/useConversion.test.ts`, with red/green evidence against the hook before 0bcc5de. No engineer change.

### N1 · fixed · 4f1231d
`convertInput` no longer uses the non-null assertion. It calls `onConvert` only when `inputRef.current` is set, so a paste callback that runs after unmount does nothing.

### N2 · deferred
PLAN-001 rules out behaviour fixes, and the reference page behaves the same way. Per the coordinator, this goes to a follow-up and this MR is unchanged.

### N3 · fixed · 2a6650e
QA fixed the artwork assertions so the "hides the artwork" tests can fail. No engineer change.
