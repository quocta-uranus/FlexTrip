---
allowed-tools: Bash, Read, Grep, Glob, WebFetch
description: Review a GitHub Pull Request against NestJS backend best practices 2026 (ai-enterprise-backend)
---

# Review GitHub Pull Request — NestJS Backend (2026 best practices)

Review the GitHub Pull Request: **$ARGUMENTS**

This skill is scoped to `ai-enterprise-backend` (NestJS API + queue worker + scheduler). For non-backend repos use a different reviewer.

## Workflow

1. **Fetch PR metadata** with `gh pr view <url-or-number> --json title,body,author,state,additions,deletions,changedFiles,baseRefName,headRefName,labels,createdAt,mergedAt,files,reviews,comments`.
2. **Read the full diff** with `gh pr diff <url-or-number>`. For large diffs (>800 lines) page through with `sed -n` ranges.
3. **Pull relevant files locally** if you need broader context (`gh pr checkout` or `git fetch origin pull/<N>/head:pr-<N>-review` + `git checkout pr-<N>-review -- <path>`).
4. **Cross-reference**: when a DTO changes, also check the Prisma schema column and the wiki doc (`wiki/docs/*.md`) — three sources of truth must agree.
5. **Analyze** against the checklist below.
6. **Post the review** with `gh pr review <url-or-number> --request-changes|--approve|--comment --body "<markdown>"`. Use heredoc to preserve formatting and avoid shell-quoting issues.
7. **Verify** the review landed with `gh pr view <url-or-number> --json reviews`.

## Review checklist — NestJS Backend 2026

Adapt sections to what the diff actually changed. Skip anything irrelevant. Order findings by severity, not by checklist order.

### 1. Architecture & Module Structure
- DDD layering respected: `controllers/` only HTTP, `features/` or `use-cases/` for business logic, `services/` for shared concerns, `dtos/` for input shape, `repositories/`/Prisma services for data.
- Feature folder organized by capability (`features-v2/create-folder-batch-v2.feature.ts`), not by type only.
- NestJS module registers all providers correctly; `exports` matches what other modules need.
- No circular deps (avoid `forwardRef` unless justified).
- One controller per resource; controllers never touch Prisma directly.

### 2. TypeScript Discipline
- Strict mode honored. No `any` except at confined third-party boundaries; prefer `unknown` + narrowing.
- DTOs are classes with `class-validator` + `class-transformer` decorators (not interfaces).
- Use `readonly` on DTO fields that should not mutate.
- Discriminated unions for state; branded types for IDs when collision risk is real.
- Types/interfaces co-located with consumer, not in a giant `types.ts`.

### 3. DTO & Input Validation
- Every endpoint has a DTO; no raw `@Body() body: any`.
- `ValidationPipe` configured globally with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- `@IsString`, `@IsNotEmpty`, `@MaxLength`, `@Matches`, `@ValidateNested({ each: true })`, `@Type(() => Class)` used appropriately.
- **DTO field length matches DB column** (`@db.VarChar(N)`). Mismatch = silent contract drift between v1/v2/wiki.
- Path/segment limits: regex enforces per-segment cap, not just total length.
- Swagger `@ApiProperty` describes every field (frontend reads OpenAPI).
- Custom `Validator` classes for business invariants that can't be expressed via decorators.

### 4. Controllers & Routing
- Thin: parse request → call feature → return response. No business logic.
- Use `@Version('2')` for versioning, not URL prefix hacks.
- Guards (`@UseGuards`) handle auth/authz; no inline `if (!user.isAdmin)`.
- `@CurrentUser()` / `@CurrentOrgId()` decorators consistent with codebase.
- Consistent route naming: `POST /resource`, `POST /resource/batch`.

### 5. Services, Features, Use-Cases
- Single Responsibility — one feature = one user action.
- File > 400 lines is a smell; split into private methods or sub-services.
- Stateless (no instance fields that change per request).
- Dependencies injected via constructor only.
- Don't pass `prisma` around when transactional client is what's needed — pass the `Prisma.TransactionClient` explicitly.

### 6. Database / Prisma
- Use `$transaction` for multi-table writes.
- **Explicit timeout**: `$transaction(cb, { timeout: 30_000, maxWait: 5_000 })` for large batches. Default 5s is too tight.
- Use `createMany` over loops of `create`. `skipDuplicates: true` when idempotency is desired.
- Use `findMany({ where: { id: { in: ids } } })` over N+1 loops.
- Use `select` to limit fields returned.
- Use `reader` replica for SELECT-heavy queries when available.
- Catch `Prisma.PrismaClientKnownRequestError` with `err.code === 'P2002'` for race-safe idempotency on unique constraints — and **don't fall through** to subsequent writes after refetching the survivor.
- Soft delete (`deletedAt`) used consistently in queries.
- No `$queryRawUnsafe` with string concat.

### 7. Error Handling
- Domain-specific exception classes (`BusinessException`) over raw `HttpException`.
- **i18n error codes** (`error.max_folder_depth_exceeded`) — never raw English strings.
- **Reuse error codes** across endpoints for the same concept (don't make FE handle multiple codes for one semantic).
- No silent `?? ''` for required fields (throw instead).
- No empty `catch` blocks.
- Validate at DTO boundary, not deep inside a service.
- Use a global exception filter for consistent HTTP shape.

### 8. Performance
- Batched DB ops over loops (`createMany`, `findMany IN`).
- N+1 detection — biggest red flag in performance-oriented PRs.
- Set transaction timeout explicitly.
- `OR: arr.map(...)` with 500+ entries → consider composite `WHERE (a,b) IN ((...))` via `$queryRaw` for sub-quadratic plans.
- Use cursor pagination over `skip/take` for huge lists.
- Use Redis cache for hot reads; queue (BullMQ) for slow/async operations.
- No await-in-loop when items are independent — use `Promise.all` with bounded concurrency.

### 9. Security
- No secrets/API keys in code. Only env vars.
- Authentication via guards (JWT/OAuth) — never trust caller identity from request body.
- Authorization checked at every entry. For idempotent endpoints, **re-check permission on existing resources** before reusing them (don't let users "claim" someone else's resource).
- All inputs validated at DTO layer.
- Rate limiting (`@nestjs/throttler`) on public endpoints.
- Prisma parameterization (never raw concat).
- PII/tokens never logged.
- CORS configured tightly.
- Idempotency keys signed/verified when accepting client-supplied IDs.

### 10. Logging & Observability
- **Use NestJS `Logger`** (`import { Logger } from '@nestjs/common'`), NOT `console.log`. Integrates with JSON formatter for CloudWatch/Datadog and respects per-module log levels.
- Structured log fields: `this.logger.log({ event: 'batch.done', count, durationMs })`.
- Entry/exit logs for long-running operations (>500ms typical wall-clock).
- Wrap timing in `try/finally` so failures get timing too.
- Trace IDs propagated via interceptor.
- Don't log inside tight loops.

### 11. Concurrency / Race Safety
- Unique DB constraints + P2002 catch over "check then insert" patterns.
- `SELECT ... FOR UPDATE` (via `$queryRaw`) when serialization is genuinely needed.
- Idempotent endpoints return same response on retry — verified by test.
- Transaction isolation level explicit when default insufficient.

### 12. API Contract & Versioning
- OpenAPI/Swagger generated from DTOs.
- `@Version()` for versioning, not URL prefix.
- **Consistency between v1 ↔ v2 ↔ batch endpoints** — same field semantics, same length limits, same error codes for same concepts. Cross-endpoint drift is a frequent regression.
- `@ApiOperation`, `@ApiResponse` describe success/error shapes.
- Wiki doc / `wiki/docs/*.md` matches code (max length, error codes, examples). When in conflict, code wins but wiki is wrong and must be fixed in same PR.
- Don't break field semantics within a version.

### 13. Code Quality / Style
- Naming: `camelCase` for vars/functions, `PascalCase` for classes, `kebab-case` for files.
- File names describe purpose: `create-folder-batch-v2.feature.ts`.
- Magic numbers extracted to constants (in `constants/`).
- Early returns over deep nesting.
- No commented-out code; no `TODO` without ticket reference.
- Comments explain WHY not WHAT.
- Avoid `let` declared outside transaction that gets assigned inside — refactor to return values.

### 14. Module / DI Hygiene
- Providers registered in the correct module's `providers[]`.
- Shared services exported.
- No `new SomeService()` inline — always inject.
- Don't inject `PrismaService` into controllers.

### 15. Documentation & Wiki
- Public APIs documented in `wiki/docs/` with request/response examples.
- Error codes table with user-facing message.
- Idempotency guarantees explicit.
- DTO/schema/doc kept consistent — if DTO maxLength is 100, wiki must say 100, schema must allow 100.
- Migration notes when DTO/contract changes.

### 16. Tests — **OPTIONAL** (do not penalize when absent)
- If tests exist, evaluate quality: mocked at service boundary not internals, covers race/idempotency/partial-failure paths, asserts both happy and error branches.
- If tests are absent, mention as a **suggestion**, not a deduction.
- Suggest specific cases worth testing (especially: race-condition retry, partial failure, idempotent replay, permission denial).

## Severity & Scoring

Order findings by severity, not by checklist order. Use these buckets:

| Severity | When to use |
|---|---|
| **Critical (blocker)** | Data corruption, security hole, broken contract, regression of the very thing PR was meant to fix, missing transaction guard that risks partial commits |
| **High** | Design flaw that will cause prod incident under load; missing edge case in idempotency/race; cross-endpoint contract drift; N+1 inside a perf-oriented PR |
| **Medium** | SRP violation, missing validation, silent-empty fallbacks, suboptimal patterns (`console.log` vs `Logger`), missing permission check on reused resource |
| **Low / Nit** | Naming, style, file length, missing comment, typos, doc gaps |
| **Suggestion** | Test cases worth adding, optional refactors, alternative patterns |

### Scoring rubric (out of 10)

Start at **10/10** and deduct:

- Each **Critical** → −2 to −3
- Each **High** → −0.5 to −1
- Each **Medium** → −0.25
- **Low / Nit** → no deduction (mention only)
- **Tests are OPTIONAL** — do NOT deduct for missing tests. Tests present + meaningful are a +0.5 bonus (cap at 10).

Score guide:
- **9.0 – 10**: Approve
- **7.5 – 8.9**: Approve with comments, or comment-only
- **6.0 – 7.4**: Request changes (Medium-High issues need fix)
- **< 6.0**: Request changes (Critical or many High issues)

## Output format

Structure the review as:

```markdown
## Review summary

<1-2 sentence verdict>

### ✅ Strengths
- <what's done well — specific files/lines>

### ❌ Critical / High issues
**1. <Title>** (`file.ts:line`)
<explanation, why it matters, suggested fix as code snippet>

### 🟡 Medium issues
...

### 🟢 Low / nits
- <one-liners with file:line>

### 💡 Suggestions (optional)
- Tests: <specific cases worth adding — but only as suggestions>
- <other optional improvements>

### Score: X/10

<one-sentence verdict and what would unblock approval>
```

## Verdict & posting

Pick the right `gh pr review` flag based on score:

```bash
# Approve
gh pr review <url> --approve --body "$(cat <<'EOF'
<markdown body>
EOF
)"

# Request changes (score < 7.5)
gh pr review <url> --request-changes --body "$(cat <<'EOF'
<markdown body>
EOF
)"

# Comment only (informative, not blocking)
gh pr review <url> --comment --body "$(cat <<'EOF'
<markdown body>
EOF
)"
```

After posting, verify with `gh pr view <url> --json reviews | jq '.reviews[-1].state'`.

## Tips for follow-up rounds

When the author pushes a fix commit and you re-review:

1. Verify each item from the previous review individually — quote the line/snippet that addresses it.
2. Diff the new commit against the previous head (`git diff <old-sha> <new-sha> -- <file>`) to spot regressions or new bugs introduced by the fix.
3. Common pattern: a race-condition catch block (P2002, ENOTFOUND, etc.) refetches the survivor but **falls through** to subsequent writes — always check the control flow after the catch.
4. Update the score and switch verdict (`--comment` for follow-up commentary, `--approve` when satisfied, `--request-changes` if new issues warrant it).
5. If multiple reviews exist, dismiss duplicates via `gh api -X PUT repos/<owner>/<repo>/pulls/<N>/reviews/<id>/dismissals -f message="..."`.

## Language

Match the language of the PR description and surrounding team comments. If the PR description is English and team writes English on GitHub, write the review in English. Summarize back to the user in their language (Vietnamese if they asked in Vietnamese).
