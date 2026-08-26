# Agent Notes

## Verification

After changes, run the full regression suite:

```bash
bun run typecheck
bun test
bun run lint:css
bun run build
bun run generate:combatant-sections --check
git diff --check
```
