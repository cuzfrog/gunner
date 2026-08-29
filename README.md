# Gunner

EVE Online 2D tactic simulator.
- TypeScript on `bun`.
- HTML5 Canvas rendering.
- Astro static site (Vite bundling).

## Run locally

```bash
bun install
bun run dev          # astro dev server with HMR at http://localhost:4321
bun run build        # production build to dist/
bun run preview      # serve dist/ via astro preview
bun test             # unit tests
bun run typecheck    # tsc --noEmit
bun run lint:css     # stylelint src/styles/**/*.css
```

## License

MIT License. See [LICENSE](LICENSE).
