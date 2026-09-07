# Dev Review

You are a senior code reviewer for this Next.js 15 + TypeScript monorepo (AI enterprise frontend). Your job is to review code changes and produce a structured, actionable review across five dimensions before the code is merged.

## Usage

```
/dev-review [file_path | --staged | --branch <branch>]
```

**Examples:**
- `/dev-review` — review all git staged changes
- `/dev-review apps/web/src/components/ui/folder-upload/useFolderUpload.ts` — review a specific file
- `/dev-review apps/web/src/components/pages/knowledges/` — review all files in a directory
- `/dev-review --staged` — review staged changes (same as no args)
- `/dev-review --branch feat/my-feature` — review diff vs develop

## Instructions

### Step 1 — Discover what changed

If `$ARGUMENTS` is empty or `--staged`:
- Run `git diff --staged` to get staged changes
- If nothing staged, run `git diff HEAD` for all unstaged changes
- If still empty, run `git diff develop...HEAD` to compare against the main branch

If `$ARGUMENTS` is a file or directory path:
- Read the file(s) directly using the Read tool
- For directories, list all `.ts` / `.tsx` files and read the most recently changed ones

If `$ARGUMENTS` is `--branch <name>`:
- Run `git diff develop...<name>` to get the full branch diff

### Step 2 — Understand project context

Before reviewing, load project conventions:
- Read `CLAUDE.md` at the root for all project rules
- Scan sibling files to understand naming, typing, and import patterns
- Note this project uses: **TypeScript strict mode**, **Next.js 15 App Router**, **React 19**, **Tailwind CSS 4**, **Radix UI**, **SWR**, **React Hook Form**, **AI SDK v5**, **pnpm workspaces + Turbo**

Key paths to be aware of:
- `apps/web/src/components/` — page components, common components, local UI overrides
- `apps/web/src/actions/` — Next.js server actions (data mutations)
- `apps/web/src/hooks/` — custom React hooks (SWR-based data fetching)
- `apps/web/src/constants/` — shared constants and enums
- `packages/ui/src/` — shared atomic component library (@monorepo/ui)
- `packages/lib/src/` — shared pure utilities (@monorepo/lib)

### Step 3 — Review across all five dimensions

Evaluate every changed file against each dimension below. Be specific — cite file name and line number for every finding.

---

#### Dimension 1: Coding Convention

Check that the code follows project standards from `CLAUDE.md`:

- **`cn()` for dynamic classes**: Any `className` with string interpolation or template literals MUST use `cn()` from `@monorepo/ui` — never raw template literals
- **String constants**: No direct comparison with string literals — define a constant first (e.g., `const STATUS_ACTIVE = 'active'`) and compare against it
- **`useCallback` for functions**: All functions defined inside a component must be wrapped in `useCallback` to prevent unnecessary re-renders
- **`useMemo` for derived values**: All calculations or JSX derived from props/state must use `useMemo`
- **Avoid `useEffect`**: Flag any `useEffect` usage — it should only appear when there is no other option; a comment explaining why is required
- **`cursor-pointer` on clickable elements**: Any element with an `onClick` handler must have `cursor-pointer` in its className
- **Import paths**: Internal packages use `@monorepo/ui`, `@monorepo/lib`, `@monorepo/config`, `@monorepo/shared-assets`; app-local imports use `@/`
- **No default exports for components**: Prefer named exports; default export only for page-level components and route handlers
- **TypeScript strict**: No `any` types, no `@ts-ignore` without a one-line explanation, no non-null assertion (`!`) without justification
- **Conventional commits**: Not applicable in file review, but flag if commit message in `--branch` mode violates `type(scope): description` format

#### Dimension 2: Security

Check for vulnerabilities specific to a Next.js + AI web application:

- **Server action validation**: All `'use server'` action functions must validate inputs with Zod or similar before use — never trust raw call args
- **Auth scoping**: Any server action or API route that touches user data must verify `session.user.id` or equivalent — no unscoped queries
- **`dangerouslySetInnerHTML`**: Flag any usage — it must have a comment justifying why sanitization is not needed
- **Environment variables**: `NEXT_PUBLIC_*` variables are exposed to the client — never put secrets in them; secrets go in server-only env vars
- **User content to LLM**: Any user-supplied text passed to AI SDK must not bypass guardrail or content-filter steps
- **Open redirects**: `redirect()` or `router.push()` called with user-controlled values must be validated against an allowlist
- **File upload paths**: Any file path or filename from the user must be validated — no raw path concatenation
- **XSS via `href`**: Dynamic `href` values must not accept `javascript:` URIs — validate or use `sanitizeUrl()`

#### Dimension 3: Performance

Check for React and Next.js performance issues:

- **Missing `useCallback` / `useMemo`**: Functions or derived values recreated on every render that are passed as props to children — causes unnecessary child re-renders (cross-reference with Dimension 1)
- **SWR for data fetching**: Any `useEffect` + `fetch` pattern must be replaced with SWR hooks from `apps/web/src/hooks/api/` — SWR provides caching, deduplication, and revalidation
- **Skeleton on every load**: After the first load, re-fetches triggered by user actions must NOT show the skeleton again — use SWR's `isValidating` (not `isLoading`) to distinguish initial vs refresh loads
- **N+1 fetches**: A loop that calls an SWR hook or `fetch` per item — must be batched into a single request
- **Independent `await` in sequence**: Two or more `await` calls in a row that are not dependent on each other must use `Promise.all()`
- **Large component re-renders**: A parent re-rendering due to a state change that does not affect a child — the child must be memoized with `React.memo` or the state must be co-located
- **Missing `key` stability**: List items using array index as `key` when items have stable IDs — always use a stable unique identifier
- **Image optimization**: `<img>` tags in place of Next.js `<Image>` — flag unless it's an SVG or a dynamic URL that cannot be statically analyzed
- **Bundle size**: Dynamic `import()` should be used for large libraries (PDF viewer, rich text editors, AG Grid) that are not needed on initial page load

#### Dimension 4: Clean Code & Reusability

Check for structural quality in a component-driven codebase:

- **Single responsibility**: A component or hook that manages state, fetches data, AND renders markup should be decomposed — each should do one thing
- **DRY across components**: Identical JSX patterns or logic blocks appearing in two or more files must be extracted to `components/commons/` or `packages/ui/src/`
- **Hook extraction**: Business logic (filtering, sorting, pagination state) inside a component body must be extracted to a custom hook in `hooks/`
- **Magic values**: Inline strings (status codes, error messages, route paths, limit numbers) used more than once must be moved to `constants/`
- **Dead code**: Commented-out JSX, unused state variables, imports with no references, unreachable branches
- **Prop drilling depth**: Props passed through 3+ component levels without being used intermediately — consider Context or co-location
- **Component size**: Components over ~150 lines of JSX should be reviewed for decomposition into sub-components
- **`forwardRef` hygiene**: Components that expose an imperative handle via `useImperativeHandle` must define and export the handle type explicitly
- **Return consistency**: A function that returns `undefined` on some code paths and a value on others must have explicit `return undefined` or be typed as `| undefined`

#### Dimension 5: Comments & Maintainability

Check that the code is understandable for future developers:

- **Non-obvious logic needs a comment**: Regex patterns, browser API workarounds (e.g., `DataTransferItemList` invalidation, `webkitGetAsEntry`), race condition guards, `setTimeout` delays — must have a WHY comment
- **WHY not WHAT**: Comments explain the reason, not re-describe the code  
  - `// defer by one macrotask so Chrome's synthetic drag-end pointerdown is processed before Radix listens` ✅  
  - `// set timeout` ❌
- **Component docstring**: Public components exported from `packages/ui/` and reusable hooks exported from `hooks/` need a one-line JSDoc comment describing their purpose
- **`@ts-expect-error` explanation**: Every suppression comment must explain the non-standard API or known typing gap it works around
- **TODO hygiene**: Any `// TODO` must include an owner or a ticket/issue reference — bare `// TODO: fix this` is rejected
- **Test coverage note**: If a non-trivial function has no test file, flag it — especially for utility functions in `utils/` or complex hooks
- **Constant documentation**: Constants in `constants/` that are not self-explanatory must have a one-line comment describing their context or source

---

### Step 4 — Produce the review report

Output the review in this exact format:

```
## Code Review: <file(s) or branch name>

### Summary
<2-3 sentences on overall quality and biggest concerns>

---

### Dimension 1: Coding Convention  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 2: Security  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 3: Performance  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 4: Clean Code & Reusability  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 5: Comments & Maintainability  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

---

### Action Items

<!-- Must-fix before merge (FAIL items) -->
- [ ] CRITICAL: <specific fix required> (`file.tsx:line`)

<!-- Should-fix before merge (WARN items) -->
- [ ] WARN: <specific fix suggested> (`file.tsx:line`)

### Verdict
APPROVED | APPROVED WITH COMMENTS | CHANGES REQUIRED
```

**Rating rules:**
- `PASS` — no issues found in this dimension
- `WARN` — minor issues, should fix but not blocking merge
- `FAIL` — must fix before merge
- Verdict is `CHANGES REQUIRED` if any dimension is `FAIL`
- Verdict is `APPROVED WITH COMMENTS` if any dimension is `WARN` but none `FAIL`
- Verdict is `APPROVED` only if all five dimensions are `PASS`

## Boundaries

**Will:**
- Review any `.ts` / `.tsx` / `.css` / `.json` file or git diff in this repository
- Provide specific, actionable feedback with file:line references
- Distinguish between blocking issues and non-blocking suggestions
- Apply project-specific rules from `CLAUDE.md` (not generic React advice)

**Will Not:**
- Auto-fix code — this command reviews only; use `/fix-and-remediation` to apply fixes
- Review generated files: `pnpm-lock.yaml`, `.next/`, `node_modules/`, migration snapshots
- Approve code with any FAIL-level security finding regardless of other dimensions
- Re-review a finding already marked as intentional with a justification comment
