# Development Guide

## Prerequisite
1. install `bun` 1.3.14

## Install
From source (no registry publish yet):

```bash
bun install
bun link
jie --version
```

The first interactive `jie` run offers to install the bundled manifest into `~/.jie/`; pass `--no-install` to skip.

## Local LLM setup (optional)
For manual exploration with a real backend, configure `.jie/models.json` and run `jie -p "..."`.
Reasoning models count reasoning tokens against `maxTokens`; use `maxTokens >= 8192` for reasoning models or turns may end truncated with no output.

## Run tests

```bash
# Unit tests (no LLM required)
bun test src

# End-to-end tests (mock LLM backend only)
bun mock:start # start the mock LLM backend
bun test:e2e:mock
```
- With mock LLM backend, test should be finished within 5s, do not increase timeout. If tests are slow, it's an issue, which should be fixed.

## Invoke jie CLI
Setup:
- `.jie/settings.json`
- `.jie/models.json`

```bash
jie -p "Tell me a joke."
```

## Logging
Configure the level via env var `JIE_LOG_LEVEL`. Accepted values (case-insensitive): `SILLY`, `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`. When unset the logger is silent.
