# Dev RCA — Root Cause Analysis

You are a senior backend engineer on this NestJS/Fastify + Prisma + PostgreSQL multi-tenant platform. Before ANY code is changed to fix a bug, you MUST produce a Root Cause Analysis (RCA) report. This enforces the rule: **understand before you fix**.

## Usage

```
/dev-rca <issue description>
/dev-rca "Document sync job leaves orphaned S3 objects on retry"
/dev-rca "Org member sees another org's folders after switching X-Org-Id"
```

- `<issue description>` — describe the observed broken behavior
- If no description is given, ask the user: "What is the symptom? What did you expect vs what actually happened?"

---

## ⛔ Rule: No code changes until RCA is complete

Do NOT suggest any code fix during this command. The output is analysis only.

---

## Step 1 — Gather symptoms

Ask (or extract from the description):
1. **What is the observed behavior?** (error response, wrong data, job failure, timeout)
2. **What is the expected behavior?**
3. **When does it happen?** (steps to reproduce — endpoint, payload, org/user context)
4. **Where does it happen?** (controller/route, Feature class, queue job, scheduler, external provider)
5. **How often?** (always / sometimes / only under condition X — e.g. concurrent requests, large payload, specific org)

---

## Step 2 — Investigate the codebase

Systematically trace the broken behavior through this repo's layers:

1. Start from the entry point: HTTP route (`*.controller.ts`) or trigger (queue job in `src/core/queue/`, cron job in `src/commands/`, webhook)
2. Follow into the `Feature` class (`features/`, `features-v2/`, `features-v3/`) that owns the business logic — controllers must not contain logic themselves
3. Trace Prisma calls: check `reader` vs `writer` usage, whether `orgId`/`ownerId` scoping is present on every query touching tenant data, and whether the operation is inside a `$transaction`
4. Check `BaseAgentService` calls if the symptom involves chat/AI — the bug may be on the agent side (`ai-enterprise-agent`), not here; use the exact endpoint/error string to search that sibling repo too
5. Check external providers (`src/core/provider/`: Google, Gmail, Slack) for OAuth/rate-limit/retry issues if the symptom involves a connector or sync job
6. Read error messages/stack traces; if a `BusinessException` error code is involved, grep its usages (`error.snake_case` format) to find every raise site
7. Check git history: `git log --oneline -20 -- <file>` to see if a recent commit broke it
8. Check for an existing `.spec.ts` that should have caught this: `find src -name "*.spec.ts" | xargs grep -l "<keyword>"`

---

## Step 3 — Identify root cause

Apply the **5 Whys** technique:

```
Symptom:  {observed broken behavior}
Why 1:    {first level cause}
Why 2:    {cause of Why 1}
Why 3:    {cause of Why 2}
...
Root cause: {the actual underlying reason — code, logic, assumption}
```

Classify the root cause using categories relevant to this stack:
- **Multi-tenancy leak** — a Prisma query missing `orgId`/`ownerId` scoping (treat as highest severity)
- **Logic error** — wrong condition, wrong branch, off-by-one
- **Missing guard** — null check, missing `@ApiAuth()`/`@SkipOrgHeader()` justification, permission check bypassed
- **Race condition / transaction gap** — multi-step write not wrapped in `$transaction`, missing timeout on a batch operation, concurrent job double-processing
- **Reader/writer mismatch** — read-after-write on `prismaService.reader` seeing stale replica data
- **Queue/job failure** — BullMQ job not retried correctly, job payload shape mismatch, worker crash swallowed silently
- **External API contract** — mismatch between this backend and the agent service, or an external provider (Google/Slack/Gmail) response shape changed
- **DTO/validation gap** — request body accepted without the validation that should have rejected it
- **Regression** — a recent change broke existing behavior (include the commit SHA)

---

## Step 4 — Write the RCA report

Save to: `docs/plans/{feature-name}/RCA-{yyyy-mm-dd}-{slug}.md`

Derive `{feature-name}` from the affected domain (e.g. `document-sync`, `org-permissions`); derive `{slug}` from the issue description (3-4 words, lowercase, hyphens). If `docs/plans/{feature-name}/` already has a `PLAN-*.md`, reuse that same `{feature-name}`.

Use this exact template:

```markdown
# RCA: {Issue Title}

**Date:** {YYYY-MM-DD}
**Reporter:** {git user.name}
**Status:** 🔍 Analysed — fix not yet started

---

## Symptom

> {One paragraph: what happens, in concrete terms — endpoint, payload, org/user context}

**Steps to reproduce:**
1. {Step 1}
2. {Step 2}
3. {Step 3 — observe the bug}

**Expected:** {What should happen}
**Actual:** {What happens instead}

---

## Investigation

### Code path traced
| Step | File | Class / Method | What it does |
|------|------|-----------------|--------------|
| 1 | `src/domains/.../x.controller.ts` | `XController.handle:42` | Receives request |
| 2 | `src/domains/.../x.feature.ts` | `XFeature.handle:55` | Business logic |
| 3 | Prisma | `prismaService.reader.x.findMany` | Query — check orgId scoping |

### Evidence
- {Specific line of code containing the bug, with a quote}
- {Error response / log line / BusinessException code if applicable}
- {Related commit or PR if this is a regression — include SHA}

---

## Root Cause

**5 Whys:**
- **Why 1:** {first observation}
- **Why 2:** {cause of Why 1}
- **Why 3:** {cause of Why 2}
- **Root cause:** {the actual underlying reason}

**Classification:** Multi-tenancy leak | Logic error | Missing guard | Race condition / transaction gap | Reader/writer mismatch | Queue/job failure | External API contract | DTO/validation gap | Regression

**Affected code:**
```
// src/domains/.../x.feature.ts:55
{the problematic code snippet — 5-15 lines max}
```

---

## Proposed Fix

> ⚠️ This section describes WHAT to fix, not the implementation.

**Approach:** {One paragraph describing the fix strategy}

**Files to change:**
- `src/domains/.../x.feature.ts` — {what needs to change and why}
- `src/domains/.../x.controller.ts` — {what needs to change and why}

**Risk:** Low | Medium | High
**Reason for risk level:** {e.g. "touches org-scoped query used by 4 other features"}

---

## Prevention

- [ ] {Add a `.spec.ts` case for the specific scenario missed}
- [ ] {Add explicit `orgId`/`ownerId` scoping where it was implicit}
- [ ] {Add a `$transaction` around the multi-step write}
- [ ] {Add a comment explaining the non-obvious constraint}
```

---

## Step 5 — Output to user

After saving the RCA, print:

```
## RCA complete: {Issue Title}

📁 docs/plans/{feature-name}/RCA-{yyyy-mm-dd}-{slug}.md

Root cause:     {one-line summary}
Classification: {type}
Risk of fix:    Low | Medium | High

Files to fix:
  - src/domains/.../x.feature.ts
  - src/domains/.../x.controller.ts

⚡ Next step: implement the fix, then run /review-change before committing.
```
