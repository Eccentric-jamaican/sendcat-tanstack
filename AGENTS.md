# Engineering Practices

## Type Safety Standards

- Do not use `as any`, `<any>`, or `Promise<any>` in application code.
- Prefer explicit domain types (`Id<"threads">`, payload interfaces, discriminated unions).
- For browser events, define typed `CustomEvent<Detail>` payloads instead of loose casts.
- For external API responses, create local response types and narrow unknown data before use.
- Replace nullable/optional assumptions with runtime guards (`if (!value) throw ...`) at boundaries.
- Keep generated files and test-only mocks as exceptions when strict typing is impractical.

## `as any` Cleanup Workflow

- Search:
  - `rg -n "\\bas any\\b|as\\s+any\\b|<any>"`
- Triage:
  - skip generated files (for example `src/routeTree.gen.ts`)
  - skip test-only files unless explicitly requested
- Refactor:
  - add focused types near use-sites
  - remove cast-by-cast and re-run typecheck
- Validate:
  - `npx tsc --noEmit`
  - if the repo has unrelated legacy errors, confirm touched files compile cleanly.
