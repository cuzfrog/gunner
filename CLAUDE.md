# Context Rules

- IMPORTANT: adhere to Code Conventions and Coding Principles
- Be positve. All difficulties will be address together with me.

## Document rules
- Be simple and consise. Code itself is doc, avoid doc if you can.
- Do not keep intermediate, transient history or reference.
- Do not reference doc in the code. Code should be agnostic of any external doc.
- No emojis in commits, issues, PR comments, or code
- Do not use newline to break sentences, no newline in the same paragraph. Let IDE wrap text.
- Follow @doc/UI_STYLE_GUIDE.md and @doc/CSS_GUIDE.md whenever style/ui is touched.
- Refer to @doc/EFT_FORMAT.md when dealing with ship fittings.

## Conversation style
- Be concise, but must explain the reason and provide context information.
- When the user ask a question, answer it before any actions.
- When the user make a decision, reason it thoroughly, then express your opinion. Only when we both agree, we move on.
- Stick to fact. Our purpose is to build good software, don't fluff, challenge my ideas.
- Do not ask trivial questions where the answer is recoverable.

## Code Conventions
- No `any`, `unknown` types, no unsafe `as`, code must be strongly typed. No `enum` keyword.
- Prefer plain function over arrow functions. No class static functions, use file level private functions.
- Fields default to be `readonly` in public types. On an interface, use methods instead of field arrow functions, methods are natively readonly.
- Public types, contract, methods, higher-level abstractions should be at the top of the files, private implementation details should be at the bottom. If a private function only is used in the same file, it should be below its callers. See below section `Single file layout`.
- Inline oneline trivial functions.
- Consolidate imports into one statement: do not split `import { a } from 'x'; import { type b } from 'x';` into two.
- Code identifiers (variables, parameters, class fields, function names) use camelCase. Names must be full words, no abbreviations beyond common ones (id, url, db, ts, cwd, pid, ctx, deps). Only serialized events/messages use snake_case. Module-level compile-time constants (e.g. `DEFAULT_COLS`, `MAX_RETRIES`) use SCREAMING_SNAKE_CASE.
- Keep code in one line if the line is < 140 chars. Do not break into multiple lines if the line is < 140 chars. Ensure a newline at the end of the file.
- Use `as const` for tuples and object-literals. Do not use `// @ts-expect-error` or `// @ts-ignore`, fix the type.
- `override` must be added for functions that overrides functions in a supertype.

### Test
- Favor TDD, update/add tests before implementing actual logic.
- use mocks for unit test. Do not mock global objects. See @doc/HOW_TO_MOCK.md
- for e2e test, see @doc/DEVELOPMENT.md
- unit tests should align with the test target file. E.g. a test `function1.test.ts` should test and only test `function1.ts`. If `function1.test.ts` is testing `index.ts`, it is a smell of coding principle violation. Unit tests should not test dependencies.
- do not import `bun:test`, all test utilities have been added to global namespace and are compatible with `vi`.

### Single file layout (ordered from top to bottom)
1. imports (all imports must be at the top, no inline imports)
2. optional public domain/DTO types
3. one exported interface (one abstraction type)
4. one exported class/function (implementation type should only be seen in its unit test and the `module.ts` registration)
5. private functions (at bottom, caller should be above callee)

### Git
- When involving git operations, refer to @doc/AGENTS_GIT.md.
- Use `./scripts/gh-bot.mjs` with your identity `abao-bot`. Do not use the `gh` CLI directly unless the user asks you to merge PRs.
- Do not add agent info into the commit message.
- If there are dev branch/PRs, do not create new branch/PRs.

### Coding Principles
- Read files in full before making wide-ranging changes, before editing files you have not already fully inspected, and when the user asks you to investigate or audit something. Do not rely only on search snippets for broad changes. Given a change, do not first attempt to insert into current code base. First look at it from a higher perspective, discover refactor opportunities.
- Check node_modules for external API type definitions instead of guessing
- NEVER remove or downgrade code to fix type errors from outdated dependencies; upgrade the dependency instead
- Naming must reflect the abstraction level. If a newly introduced function violates this, consider renaming the existing function to maintain correct abstraction levels, no matter how many files need to be changed.
- Use OOP + DI. Avoid helper functions, helpers are bad, they are where code is coupled out of class hierarchy. helper functions are functions that are outside the abstraction hierarchy, containing domain logic, serving the only purpose of code reuse. ("utility/support" functions are not helpers, because they are purely technical without complex domain logic.)
- A function's parameters should be data it consumes, parameters should not be its dependencies. A higher-order function should only be used for pure transformation; orchestration with side effects should be a regular function. Context and config types are exempted from this rule.
- A responsibility should belong to an earlier performer. E.g. if type `Config` can parse the configuration into ready-to-use types, it shouldn't pass raw strings to its clients. A producer's return type is the one its consumer can use directly — no further parsing, validation, or normalization.
- Class logic should be extracted into private pure functions (at the file bottom) as much as possible. For complex logic, you can export the private function using `export {fun as _fun}` for unit testing. But do not export or share private functions.
- A feature cannot ship by deferring an NFR(non-functional requirement); the NFR must be met in the same change. Do not be scared of change scopes, divide and conquer. Maintain good code architecture, follow context rules even if changes are big.
- No cyclical dependencies.

#### Module visibility
Minimal visibility or public surface of a type or a module. This ensures loose coupling and separation of concerns. If this is violated, e.g. a type or a module exposes multiple functions, it usually means the design is wrong. Do not add `export` unless it's proven neccessary.
- A *module* is a directory containing code. The `MODULE.md` lives at the module's root and gates its branching point in the tree.
- A single file should ideally have only 1 exported function and necessary types, all other things in the file should be file private. For unit testing complex logic, use `export as` at the file bottom with `_` prefix to the function, meaning only "visible for testing" (the underscore signals "internal seam", not part of the public API).
- - External imports must be from a module without specific file, e.g., `import { foo } from "../module"`. Not `"../module/index.ts"`. Refer to `Module gates` glossary. For siblings in the immediate directory, directly import from the sibling, e.g. `import { foo } from "./foo"`. For internal files, imports from specific files within the same module are allowed.
- In each module, search `MODULE.md`. You should follow its specifications. Any new exposure should be carefully reasoned and justified. If you are blocked, you can ask the user for approval and temporiarily disable the gate on a file by commenting out the file in `MODULE.md`. Check Module Gates glossary for the keyword meanings.
- DI is used in this project, `module.ts` is where dependencies are registered for a particular module. Implementation types should not been seen outside of the module, it should only be known by its unit tests and `module.ts` registration. Use `asClass` as possible, which auto resolves dependencies.
- Cross boundary domain types, config types, global DTOs are exempted from the visibility rule.

#### SOLID principles:
- **Single Responsibility Principle**: A function, class, or module should have one, and only one, reason to change.
- **Open/Closed Principle**: Hide implementations behind interfaces. So that modifications happen without the client code needing to know.
- **Liskov Substitution Principle**: Switching implementation should not violate the interface's contract, including implicit ones like side effects and error handling.
- **Interface Segregation Principle**: A client should not be forced to depend on interfaces it does not use.
- **Dependency Inversion Principle**: High-level modules should not depend on low-level modules. Abstractions should not depend on detailed implementations.

## Things to avoid
- do not `find` from the root dir, it's slow and unnecessary. Use `pwd` to figure out where you are.
- do not write test-only production code, testability should be achieved by adhering to above coding principles.
- do not skip tests, problems must be resolved.
- do not ignore tech debt you encountered, fix them at the end of your current work.
- avoid worktrees.
- avoid direct usage of `console`, use our interface abstraction `Console` instead. So that tests can supply a mock console and don't need to mock global objects.
- do not remove outstanding file or changes, these could be added by the user.

## Best practices
- write down your plan before execution (but do not enter plan mode, it will block your further execution).
- when you have multiple steps in your execution, use a todo-list, divide and conquer.
- use subagents to explore to save your context window.

(Write temporary files to `./tmp/` only if you want me to reivew, otherwise write to `/tmp/<space>/`)

## File Edit Checklist
Pre-action:
- Before adding utility functions/logic, check existing utils for reuse.
- Before adding logic to existing files, check opportunity for refactoring.
- Before any semantic or logic change, update or add tests to ensure coverage.

Post-action:
- After file edit (semantic or logic change), run tests.
