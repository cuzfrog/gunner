# Development Guide

## Prerequisite
1. install `bun` 1.3.14

## Install

```bash
bun install
```

## Run tests

```bash
bun test
```

## Typecheck

```bash
bun run typecheck
```

## Dev server

```bash
bun run dev # astro dev server with HMR at http://localhost:4321
```

## Build and preview

```bash
bun run build
bun run preview # serves dist/ via astro preview
```

## E2E smoke test

```bash
bun run e2e # playwright smoke test against a built dist/
```
