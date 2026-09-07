# /dev-review — NestJS Backend Code Review

Review code changes in this repository against project conventions, security rules,
performance patterns, and maintainability standards before merge.

## Usage

```
/dev-review                        # review all uncommitted changes (git diff HEAD)
/dev-review --staged               # review staged changes only (git diff --cached)
/dev-review --branch <name>        # review branch diff vs main
/dev-review <file-or-dir>          # review a specific file or directory
/dev-review pr:<number>            # review a GitHub PR by number
/dev-review <commit-hash>          # review a single commit
```

---

## Step 1 — Discover what changed

Choose the discovery strategy based on `$ARGUMENTS`:

**No args or `--staged`:**
```bash
git diff --cached          # staged only
git diff HEAD              # fallback if nothing staged
git log --oneline -5       # recent commit context
```

**`--branch <name>`:**
```bash
git diff main...<name> --stat
git diff main...<name>
```

**File or directory path:**
- Read the file(s) directly with the Read tool
- Also run `git diff HEAD -- <path>` to see what changed

**`pr:<number>`:**
```bash
gh pr diff <number>
gh pr view <number> --json title,body,author,files,commits
```

**`<commit-hash>`:**
```bash
git show <hash>
git show --stat <hash>
git log --oneline -1 <hash>
```

---

## Step 2 — Load project context

Before scoring, always do these reads:
1. Read `CLAUDE.md` for hard project rules
2. Check 1–2 sibling files of any changed file to understand local conventions
3. Note the branch name — features on `feat/*` are new functionality; `fix/*` or `hotfix-*` are bug fixes

---

## Step 3 — Review across all six dimensions

Evaluate every changed file against each dimension. **Cite file name and line number for every finding.**

---

### Dimension 1: NestJS Architecture & Conventions  [PASS / WARN / FAIL]

Check that the code follows this project's specific architecture patterns:

**Structure rules:**
- Controllers handle HTTP only — no business logic, no direct DB calls, no service calls other than injected Features
- Business logic lives in `features/` or `features-v2/` or `features-v3/` classes decorated with `@Injectable()`
- Services in `services/` are shared utilities (e.g., `FolderService`, `KnowledgeNameConflictService`) — not feature runners
- New modules must register all providers in `handlers` array and export them
- DTOs go in `dtos/` and must use custom field decorators from `src/core/decorators/field.decorators.ts` (`@StringField`, `@BooleanFieldOptional`, etc.) or standard class-validator where appropriate

**TypeScript rules:**
- No `any` — use explicit types or interfaces; `as any` requires a comment explaining why
- All public method signatures have explicit return type annotations
- Interfaces/types used across modules MUST be exported — unexported types cause TS4053 build errors on controller return types
- No `// @ts-ignore` without a comment explaining the root cause and tracking note

**Decorator rules:**
- Every new endpoint must have `@ApiAuth()` unless `@Public()` or `@SkipOrgHeader()` is explicitly justified in a comment
- Version decorator `@Version('N')` required on every route — never omit
- `@ApiTags(...)` required on every new controller class
- Swagger `@ApiProperty`/`@ApiPropertyOptional` on all DTO fields exposed to clients

**Logging rules (critical — from CLAUDE.md):**
- Use `console.log` — NEVER `import { Logger } from '@nestjs/common'`
- `console.error` for exceptions/errors caught in try/catch
- Never log PII (email, name, tokens) — log IDs only (`userId=`, `orgId=`, `docId=`)

**Error handling rules:**
- Use `BusinessException` from `src/core/exceptions/business.exception.ts` for all domain errors
- Error codes must be strings in `error.snake_case` format (e.g., `error.folder_not_found_or_no_permission`)
- Never `throw new Error('...')` or `throw new HttpException(...)` in Feature classes
- S3/external service calls must be wrapped in try/catch (best-effort, errors logged not rethrown)

**Import rules:**
- Import `User`, `Prisma`, `EntityType`, `PermissionType` etc. from `@app/prisma`
- Import `PrismaService` from `src/core/prisma/prisma.service`
- No circular imports — if a feature needs another feature's helper, extract it to a shared Service

---

### Dimension 2: Security & Multi-tenancy  [PASS / WARN / FAIL]

This is a multi-tenant SaaS — org isolation is the most critical security property.

**Multi-tenancy (CRITICAL):**
- Every Prisma query on tenant data MUST include `orgId` in the `where` clause
- Never fetch data using only `id` without also scoping to `orgId` — a leaked `id` could expose another org's data
- `@CurrentOrgId()` must be used to inject `orgId` — never trust it from the request body
- Background jobs and scheduled tasks must also scope all queries to `orgId`

**Authentication & authorization:**
- All endpoints missing `@ApiAuth()` must have `@Public()` with a documented reason
- `@SkipOrgHeader()` must have a comment explaining why org context is not required
- Permission checks (owner/editor/viewer on folders or documents) must use the established pattern from `EntityPermissionService` or direct `folderPermissions: { some: {...} }` filtering — no ad-hoc permission logic

**Ownership checks:**
- Document/folder lookups involving user data must include `ownerId: user.id` OR validate via permission system — never rely on `orgId` alone for owner-level operations

**Input validation:**
- All request bodies must be typed DTO classes with validators — no `@Body() body: any` or `@Body() body: Record<string, unknown>` without validation
- Array inputs must have `@ArrayMaxSize(N)` to prevent DoS via oversized payloads
- String fields must have `@MaxLength(N)` matching the DB column size

**Secrets & data exposure:**
- No API keys, JWT secrets, or tokens hardcoded — use `src/config/` configuration
- No Prisma `select` omissions that could return sensitive fields (e.g., password hashes, internal metadata) to API callers

**Injection:**
- No raw SQL via `$queryRaw` with unsanitized user input (use Prisma parameterized queries)
- No `eval()` or dynamic code execution

---

### Dimension 3: Database & Performance  [PASS / WARN / FAIL]

**Prisma reader vs writer:**
- Use `prismaService.reader` for all reads unless replica lag is a concern (e.g., immediately after a write in the same flow)
- Use `prismaService.writer` only when you must see the write you just made (document reads right after init)
- Never use `prismaService` directly for reads that could be on the reader — this routes to the writer unnecessarily

**N+1 patterns:**
- No `findFirst`/`findUnique` inside a loop — batch with `findMany` + `Map` lookup
- No `create` inside a loop — batch with `createMany`
- No `update` inside a loop for the same table — batch with `updateMany` or accumulate and call once
- `deleteMany` + single quota `decrement` over N × `delete` + N × `decrement`

**Transactions:**
- Multi-step write operations (create + permission + knowledge) must use `$transaction`
- Interactive transactions (multiple queries inside callback) must set explicit timeout: `{ timeout: 30_000, maxWait: 5_000 }` for any batch operation touching >10 rows
- Understand FK delete order: delete child records (knowledge, permissions) before parent (document, folder)

**Select clause:**
- Always use `select: { ... }` or `include: { ... }` — never fetch the full row when only 2–3 fields are needed
- Prisma `findMany` without `select` on large tables is a memory leak

**Parallelism:**
- Independent async operations must use `Promise.all()` or `Promise.allSettled()` — never sequential `await` when there is no data dependency
- S3 operations in a batch must be parallelized with `Promise.allSettled()` (best-effort pattern)

**Indexes:**
- New `where` clause fields on high-frequency queries should be covered by an index — check `prisma/schema.prisma` for `@@index`

---

### Dimension 4: Clean Code & Reusability  [PASS / WARN / FAIL]

**Single responsibility:**
- One Feature class = one use case (one `handle()` method, one public API method)
- If `handle()` exceeds ~80 lines, it must be decomposed into private helper methods
- Private helpers are prefixed with `_` or named clearly as private (TypeScript `private` keyword)

**DRY — reuse existing utilities before writing new code:**
- `FolderService.inheritPermissionsFromParent()` — for permission cascade
- `FolderService.getAllSubFoldersRecursive()` — for subtree traversal
- `KnowledgeNameConflictService.resolveConflictNameBatch()` — for naming conflict resolution
- `EntityPermissionService.getUserGroupIds()` — for group membership
- `GeneratorService.generateId(IDPrefix.*)` — for ID generation
- `generateFolderPermissionKey()` from `src/libs/utils/permission-key.util` — for permission uniqueKey
- Check `src/domains/document/constants/` for existing constants before defining new ones

**Dead code:**
- No commented-out code blocks
- No unused imports, variables, or parameters
- No unreachable branches after `return` or `throw`

**Magic values:**
- Status strings (`'uploading'`, `'active'`) must use the Prisma enum (`DocumentStatus.uploading`)
- Numeric limits (`500`, `100`, `10`) must be named constants in `constants/` files
- Error code strings must be consistent — check for existing codes before inventing new ones

**Interface exports:**
- Any `interface` or `type` returned by a Feature's `handle()` MUST be exported — unexported return types break `tsc --declaration` and cause TS4053 build failures in the controller layer (see history: `FailedEntry` bug)

**Constants consistency:**
- `MAX_FOLDER_DEPTH = 10` in `src/domains/document/constants/folder.constants.ts`
- DTO max lengths must match DB column sizes (e.g., `VarChar(255)` → `@MaxLength(255)`, not an arbitrary lower value unless intentional)
- If a deliberate lower limit is chosen, add a comment explaining why

---

### Dimension 5: API Contract & Versioning  [PASS / WARN / FAIL]

**Versioning:**
- New endpoints must be on the latest version (`@Version('3')` for document uploads, `@Version('2')` for knowledge/folder)
- Never add new behavior to an existing versioned endpoint — create a new version
- Old version endpoints can be commented out but should not be deleted until confirmed safe

**Response shape:**
- New endpoints must return a consistent shape — check `FormatResponseInterceptor` wraps responses
- Batch endpoints must use `{ created/aborted/failed/skipped }` array pattern (not `{ success: boolean }`)
- Per-item failure reasons must be machine-readable string codes (`reason: 'already_confirmed'`), not human sentences

**DTO constraints documented in wiki:**
- Every new endpoint that the FE team will integrate must have a corresponding doc in `wiki/docs/`
- Wiki docs must correctly reflect actual DTO constraints (maxLength, enum values, required/optional)
- Error codes in wiki must match actual thrown `BusinessException` codes — no divergence

**Backward compatibility:**
- Removing or renaming a field from a response is a breaking change — flag it
- Adding required fields to a request body is a breaking change — flag it

---

### Dimension 6: Test Coverage  [PASS / WARN / FAIL]

**What must be tested:**
- New Feature classes with non-trivial branching must have a `.spec.ts` file in the same directory
- Critical paths that must be covered: happy path, auth/permission denial, idempotent retry, boundary conditions (max depth, empty array, max size)
- Batch features must test: all-new, all-existing, mixed new+existing, empty input, partial failure

**Test quality:**
- Mocks follow the project pattern: `prismaService = { reader: { ... }, writer: { ... }, $transaction: jest.fn(...) }` with `_mocks` helper
- `jest.clearAllMocks()` called in `beforeEach`
- Each test has ONE assertion focus — no mega-tests testing 10 things at once
- `expect(...).rejects.toBeInstanceOf(BusinessException)` for error paths — not just `rejects.toBeTruthy()`

**What does NOT need tests:**
- Trivial pass-through controller methods
- DTO classes (validated by class-validator itself)
- Module registration files

---

## Step 4 — Produce the review report

Output the review in this exact format:

```
## Code Review: <file(s) / branch / PR>

### Summary
<2-3 sentences on overall quality and the one or two biggest concerns>

---

### Dimension 1: NestJS Architecture & Conventions  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 2: Security & Multi-tenancy  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 3: Database & Performance  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 4: Clean Code & Reusability  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 5: API Contract & Versioning  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

### Dimension 6: Test Coverage  [PASS / WARN / FAIL]
<findings with file:line citations, or "No issues found.">

---

### Action Items

<!-- CRITICAL — must fix before merge (any FAIL) -->
- [ ] CRITICAL: <specific fix> (`file.ts:line`)

<!-- WARN — should fix before merge -->
- [ ] WARN: <specific fix> (`file.ts:line`)

<!-- NIT — optional improvements -->
- [ ] NIT: <suggestion> (`file.ts:line`)

---

### Verdict
APPROVED | APPROVED WITH COMMENTS | CHANGES REQUIRED
```

**Rating rules:**
- `PASS` — no issues in this dimension
- `WARN` — minor issues; should fix but not merge-blocking
- `FAIL` — must fix before merge
- `CHANGES REQUIRED` — any dimension is `FAIL`
- `APPROVED WITH COMMENTS` — any `WARN`, no `FAIL`
- `APPROVED` — all six dimensions are `PASS`

---

## Quick reference — common FAIL patterns in this codebase

| Pattern | Dimension | Severity |
|---------|-----------|----------|
| DB query missing `orgId` in where clause | Security | FAIL |
| `import { Logger } from '@nestjs/common'` | Convention | FAIL |
| Unexported interface returned by Feature `handle()` | Convention | FAIL (TS4053 build break) |
| `findFirst` in a loop | Performance | FAIL |
| No `@ApiAuth()` on new endpoint | Security | FAIL |
| Prisma `$transaction` without timeout on batch ops | Performance | WARN |
| DTO constraint (maxLength) doesn't match wiki doc | API Contract | WARN |
| Missing wiki doc for new public endpoint | API Contract | WARN |
| No `.spec.ts` for new Feature with branching logic | Testing | WARN |
| `console.error` missing for caught S3 exception | Convention | WARN |
| `any` type without comment | Convention | WARN |
| Error code in code differs from error code in wiki | API Contract | FAIL |
