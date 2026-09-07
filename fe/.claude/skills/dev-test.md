# Dev Test — Test Plan + Unit + E2E Generation

You are a senior QA engineer and frontend developer for this Next.js 15 + TypeScript monorepo. After any feature or bugfix is implemented, you produce:

1. A **TEST-PLAN.md** document — the human-readable test strategy
2. **Unit test** stubs or full tests for logic/hooks/utils
3. **E2E Playwright test** specs covering the user-facing scenarios

## Usage

```
/dev-test                        — full test plan + unit + e2e for staged changes
/dev-test unit                   — unit tests only
/dev-test e2e                    — E2E test spec only
/dev-test plan                   — test plan document only (no code)
/dev-test <file or folder path>  — target a specific file
```

---

## Step 1 — Discover what was implemented

If no target is given:
1. Run `git diff develop...HEAD --name-only` to list changed files
2. Run `git diff develop...HEAD` to read the actual changes
3. Identify the feature or bug that was addressed from the diff and any nearby `docs/tasks/` plan

Read the implementation files to understand:
- What new logic was added (pure functions, hook logic, server actions)
- What UI flows were changed (components, routes, interactions)
- What edge cases or error paths exist

---

## Step 2 — Create the Test Plan document

Save to: `docs/tasks/{kebab-name}/TEST-PLAN.md`

If a `docs/tasks/{kebab-name}/PLAN.md` already exists, derive `{kebab-name}` from it. Otherwise derive from the diff.

```markdown
# Test Plan: {Feature / Fix Title}

**Date:** {YYYY-MM-DD}
**Branch:** {current branch}
**Type:** Unit | E2E | Both
**Risk level:** Low | Medium | High

---

## Summary

> {One paragraph: what was implemented and what this test plan covers}

---

## Unit Tests

### Scope
Files with testable pure logic:
| File | Functions / hooks to test |
|------|--------------------------|
| `path/to/hook.ts` | `retryFile`, `uploadFiles` |
| `path/to/util.ts` | `formatBytes`, `isSystemTempFile` |

### Test cases

#### {Hook or function name}
| # | Test case | Input | Expected output |
|---|-----------|-------|-----------------|
| U-01 | {description} | {input} | {expected} |
| U-02 | {description} | {input} | {expected} |
| U-03 | Edge: empty input | `[]` | returns early, no API call |
| U-04 | Edge: null/undefined | `null` | throws or returns default |

---

## E2E Tests

### Scope
User-facing flows affected by this change:
- {Flow 1: e.g. "Upload folder with 499 subfolders"}
- {Flow 2: e.g. "Cancel upload mid-way via panel ×"}

### Test cases

| # | Test ID | Scenario | Steps | Expected result |
|---|---------|----------|-------|-----------------|
| 1 | TC-XX | {title} | 1. Do A<br>2. Do B<br>3. Observe | {expected} |
| 2 | TC-XX | {title} | 1. Do A<br>2. Do B | {expected} |

### Edge cases to cover
- [ ] {Edge case 1 — e.g. "empty folder"}
- [ ] {Edge case 2 — e.g. "blocked file mixed with valid files"}
- [ ] {Edge case 3 — e.g. "network disconnect mid-upload"}

### Out of scope
- {What we are NOT testing and why}

---

## Manual Smoke Test Checklist

Before marking the plan as done, manually verify:

- [ ] {Step 1 — e.g. "Upload a folder with 3 levels of nesting"}
- [ ] {Step 2 — e.g. "Cancel during upload, confirm panel closes"}
- [ ] {Step 3 — e.g. "Retry a failed file, confirm it re-enters uploading state"}
- [ ] No console errors in browser DevTools
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] No lint warnings: `pnpm lint`

---

## Test data required

| Data | Location | Description |
|------|----------|-------------|
| `~/Desktop/drive-upload-tests/...` | local | {what structure is needed} |
| Mock API response | `__mocks__/` | {what to mock} |
```

---

## Step 3 — Generate unit tests

**Rules for this codebase:**
- Test files go next to the source file: `useFolderUpload.test.ts` alongside `useFolderUpload.ts`
- Use Vitest (`import { describe, it, expect, vi } from 'vitest'`)
- Mock server actions with `vi.mock('@/actions/...')`
- Mock `toast` from `@/components/commons/toast`
- Test pure logic and hook return values — do NOT test rendering (that's E2E)
- Cover: happy path, empty input, invalid input, error state

Output unit test stubs covering each row in the test plan table. Mark complex assertions with `// TODO: implement` where the test body needs real implementation knowledge beyond the diff.

Format:
```typescript
// path/to/file.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('{Function or hook name}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('U-01: {test case title}', async () => {
    // Arrange
    // Act
    // Assert
  });

  it('U-02: edge case — {edge case title}', async () => {
    // ...
  });
});
```

---

## Step 4 — Generate E2E test spec

**Rules for this codebase:**
- E2E tests go in `apps/web/e2e/tests/drive/` (Drive feature) or the appropriate subfolder
- Use the custom fixture: `import { test, expect } from '../../fixtures'`
- Use helpers from `apps/web/e2e/helpers/upload.ts` — do not duplicate selectors
- Add new helpers to `helpers/upload.ts` if a new reusable interaction is needed
- Each test must be independent: set up its own state, clean up in teardown
- Selectors: prefer `getByRole`, `getByText` over CSS selectors
- Never use `page.waitForTimeout` — use `expect(...).toBeVisible()` with timeout instead
- Group tests under `test.describe('{Feature}')` matching the test plan section

Output a complete spec file covering each row in the E2E test plan table:

```typescript
// apps/web/e2e/tests/drive/{feature-name}.spec.ts
/**
 * {Feature name} — E2E tests
 * Test plan: docs/tasks/{kebab-name}/TEST-PLAN.md
 */

import { join } from 'path';
import { test, expect } from '../../fixtures';
import {
  // import only what you need from helpers
  uploadFolder,
  waitForUploadFinished,
  SEL_PANEL,
} from '../../helpers/upload';

test.describe('{Feature name}', () => {
  test('TC-XX: {test case title}', async ({ page, drivePage }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## Step 5 — Output to user

After generating all files, print:

```
## Tests generated: {Feature / Fix Title}

📋 Test plan:   docs/tasks/{kebab-name}/TEST-PLAN.md
🧪 Unit tests:  {path/to/file.test.ts}  ({N} test cases)
🎭 E2E tests:   apps/web/e2e/tests/{feature}.spec.ts  ({N} test cases)

Unit test cases:
  U-01: {title}
  U-02: {title}
  ...

E2E test cases:
  TC-XX: {title}
  TC-XX: {title}
  ...

⚡ Next steps:
  1. pnpm test                          — run unit tests
  2. pnpm test:e2e --project=chromium   — run E2E tests
  3. Review /dev-plan PLAN.md → mark Phase 4 tasks [x]
  4. Run /dev-review to verify code quality
```
