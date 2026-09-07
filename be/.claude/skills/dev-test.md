# Dev Test — Test Plan + Unit Test Generation

You are a senior QA engineer and NestJS backend developer for this multi-tenant platform. After any feature or bugfix is implemented, you produce:

1. A **TEST-PLAN.md** document — the human-readable test strategy
2. **Jest unit/integration tests** for Feature classes, services, and DTO validation

## Usage

```
/dev-test                        — full test plan + tests for uncommitted changes
/dev-test unit                   — unit tests only
/dev-test plan                   — test plan document only (no code)
/dev-test <file or folder path>  — target a specific file (e.g. a Feature class)
```

---

## Step 1 — Discover what was implemented

If no target is given:
1. Run `git diff HEAD --name-only` (fallback `git diff main...HEAD --name-only`) to list changed files
2. Run `git diff HEAD` to read the actual changes
3. Identify the feature/domain from the diff (`src/domains/<domain>/...`) and any nearby `docs/plans/<feature-name>/PLAN-*.md`

Read the implementation files to understand:
- What business logic was added (Feature class `handle()` methods, Service helpers)
- Whether org/owner scoping, permission checks, or plan-feature gating were added
- What Prisma queries, `$transaction` blocks, or queue jobs are involved
- What DTO validation was added/changed

---

## Step 2 — Create the Test Plan document

Save to: `docs/plans/{feature-name}/TEST-PLAN-{yyyy-mm-dd}.md`

Derive `{feature-name}` from the domain touched. If `docs/plans/{feature-name}/PLAN-*.md` already exists, reuse that same folder.

```markdown
# Test Plan: {Feature / Fix Title}

**Date:** {YYYY-MM-DD}
**Branch:** {current branch}
**Domain:** {src/domains/<domain>}
**Risk level:** Low | Medium | High

---

## Summary

> {One paragraph: what was implemented and what this test plan covers}

---

## Unit / Integration Tests (Jest)

### Scope
Feature classes / services with testable logic:
| File | Class / Method to test |
|------|--------------------------|
| `src/domains/x/features/x.feature.ts` | `XFeature.handle` |
| `src/domains/x/services/x.service.ts` | `XService.someMethod` |

### Test cases

#### {Feature or method name}
| # | Test case | Setup (mocks) | Expected outcome |
|---|-----------|----------------|-------------------|
| U-01 | happy path | valid orgId/userId, mocked Prisma returns X | resolves with Y |
| U-02 | multi-tenancy: query scoped to orgId | mocked Prisma called with orgId in where | `expect(prisma.x.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ orgId }) }))` |
| U-03 | permission denial | user without required role/permission | `rejects.toBeInstanceOf(BusinessException)` with `error.x_forbidden` |
| U-04 | boundary: max array size / max depth | oversized payload | rejects with validation error |
| U-05 | empty input | `[]` / `undefined` | returns early, no DB call |
| U-06 | partial failure (batch ops) | mixed valid/invalid items | `{ created, aborted, failed, skipped }` shape matches |

---

## Cross-repo contract check (if this change touches a DTO/endpoint the frontend or agent depend on)

- [ ] `wiki/docs/` entry updated to match new DTO constraints
- [ ] Frontend/agent repo checked for the same contract shape (name the sibling file if found)

---

## Manual Smoke Test Checklist

- [ ] {Step 1 — hit the endpoint with Postman/curl using a real org context}
- [ ] {Step 2 — verify a second org cannot see the data}
- [ ] No unhandled promise rejections in server logs
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes

---

## Test data required

| Data | Location | Description |
|------|----------|--------------|
| Seeded org/user | test DB or mocked | {what's needed} |
| Mock Prisma responses | inline in spec | {what to mock} |
```

---

## Step 3 — Generate unit/integration tests

**Rules for this codebase (from existing `.spec.ts` files, e.g. `chat-completion.feature.spec.ts`):**
- Test files are colocated: `x.feature.spec.ts` next to `x.feature.ts`, matching Jest's `testRegex: ".*\\.spec\\.ts$"`
- Mock all constructor dependencies manually (`prisma`, `generatorService`, etc. as plain objects with `jest.fn()`), do NOT use NestJS's `Test.createTestingModule` unless the existing spec for that domain already does
- `prismaService.reader` / `prismaService.writer` are separate mock objects — assert the correct one is used
- Call `jest.clearAllMocks()` in `beforeEach`
- If a dependency is irrelevant to the test, pass `{} as any` with a comment naming the parameter (matches existing style)
- Assert `BusinessException` error codes exactly: `rejects.toMatchObject({ errorCode: 'error.x_not_found' })` or `rejects.toBeInstanceOf(BusinessException)` — never `rejects.toBeTruthy()`
- Cover: happy path, org/owner scoping, permission denial, boundary conditions, batch partial-failure shape where applicable
- Each test asserts ONE behavior — no mega-tests

Output tests covering each row in the test plan table. Mark complex assertions needing implementation-specific knowledge with `// TODO: implement`.

Format:
```typescript
// src/domains/x/features/x.feature.spec.ts
import { XFeature } from './x.feature';

describe('XFeature', () => {
  const orgId = 'org_1';
  const userId = 'user_1';

  let prisma: any;
  let feature: XFeature;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      reader: { x: { findMany: jest.fn() } },
      writer: { x: { create: jest.fn() } },
    };
    feature = new XFeature(prisma /* , ...other deps as {} as any */);
  });

  it('U-01: {test case title}', async () => {
    // Arrange
    // Act
    // Assert
  });

  it('U-02: scopes query to orgId', async () => {
    // ...
  });
});
```

---

## Step 4 — Run and iterate

```bash
pnpm test -- <path/to/x.feature.spec.ts>   # target the new spec
pnpm test                                   # full suite before reporting done
```

Report pre-existing failures as pre-existing — never absorb them into this change's scope.

---

## Step 5 — Output to user

After generating all files, print:

```
## Tests generated: {Feature / Fix Title}

📋 Test plan: docs/plans/{feature-name}/TEST-PLAN-{yyyy-mm-dd}.md
🧪 Tests:     {path/to/x.feature.spec.ts}  ({N} test cases)

Test cases:
  U-01: {title}
  U-02: {title}
  ...

Run results: {N} passed / {N} failed (pre-existing: {N})

⚡ Next steps:
  1. pnpm test              — run full suite
  2. pnpm lint               — verify lint passes
  3. Run /review-change to verify code quality before commit
```
