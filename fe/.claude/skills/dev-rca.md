# Dev RCA — Root Cause Analysis

You are a senior frontend engineer. Before ANY code is changed to fix a bug, you MUST produce a Root Cause Analysis (RCA) report. This enforces the rule: **understand before you fix**.

## Usage

```
/dev-rca <issue description>
/dev-rca "Upload retry uses wrong folderId for subfolder files"
/dev-rca "Nav guard dialog does not appear when switching Drive views"
```

- `<issue description>` — describe the observed broken behavior
- If no description is given, ask the user: "What is the symptom? What did you expect vs what actually happened?"

---

## ⛔ Rule: No code changes until RCA is complete

Do NOT suggest any code fix during this command. The output is analysis only.
The fix comes after — in `/dev-plan`.

---

## Step 1 — Gather symptoms

Ask (or extract from the description):
1. **What is the observed behavior?** (what the user sees)
2. **What is the expected behavior?** (what should happen)
3. **When does it happen?** (steps to reproduce)
4. **Where does it happen?** (route, component, user action)
5. **How often?** (always / sometimes / only under condition X)

---

## Step 2 — Investigate the codebase

Systematically trace the broken behavior through the code:

1. Start from the user-facing trigger (click handler, route, API call)
2. Follow the data/event flow through hooks → actions → API
3. Read error messages, console logs, or network responses if provided
4. Check git history: `git log --oneline -20 -- <file>` to see if a recent commit broke it
5. Check if tests exist that should have caught this: `find . -name "*.test.*" | xargs grep -l "<keyword>"`

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

Classify the root cause:
- **Logic error** — wrong condition, wrong branch, off-by-one
- **Missing guard** — null check, empty array, race condition
- **Wrong data** — incorrect ID, stale value, wrong field
- **API contract** — mismatch between what front-end sends and what back-end expects
- **State mutation** — stale closure, wrong dependency array, shared mutable state
- **Integration gap** — two features interact incorrectly
- **Regression** — a recent change broke an existing behavior (include the commit SHA)

---

## Step 4 — Write the RCA report

Save to: `docs/tasks/{kebab-name}/RCA.md`

Derive `{kebab-name}` from the issue description (3-4 words, lowercase, hyphens).

Use this exact template:

```markdown
# RCA: {Issue Title}

**Date:** {YYYY-MM-DD}
**Reporter:** {git user.name}
**Status:** 🔍 Analysed — fix not yet started

---

## Symptom

> {One paragraph: what the user observes, in concrete terms}

**Steps to reproduce:**
1. {Step 1}
2. {Step 2}
3. {Step 3 — observe the bug}

**Expected:** {What should happen}
**Actual:** {What happens instead}

---

## Investigation

### Code path traced
| Step | File | Function / Line | What it does |
|------|------|-----------------|--------------|
| 1 | `path/to/trigger.tsx` | `handleClick:42` | Calls uploadFiles() |
| 2 | `path/to/hook.ts` | `uploadFiles:110` | ... |
| 3 | `path/to/action.ts` | `uploadFilesActionV3:55` | ... |

### Evidence
- {Specific line of code that contains the bug, with a quote}
- {Console error or network error if applicable}
- {Related commit or PR if this is a regression — include SHA}

---

## Root Cause

**5 Whys:**
- **Why 1:** {first observation}
- **Why 2:** {cause of Why 1}
- **Why 3:** {cause of Why 2}
- **Root cause:** {the actual underlying reason}

**Classification:** Logic error | Missing guard | Wrong data | API contract | State mutation | Integration gap | Regression

**Affected code:**
```
// path/to/file.ts:42
{the problematic code snippet — 5-15 lines max}
```

---

## Proposed Fix

> ⚠️ This section describes WHAT to fix, not the implementation. Code changes happen in `/dev-plan`.

**Approach:** {One paragraph describing the fix strategy}

**Files to change:**
- `path/to/file.ts` — {what needs to change and why}
- `path/to/file.tsx` — {what needs to change and why}

**Risk:** Low | Medium | High
**Reason for risk level:** {e.g. "touches shared upload provider used by 3 features"}

---

## Prevention

How do we stop this class of bug from happening again?

- [ ] {Add a unit test for the specific case that was missed}
- [ ] {Add a comment explaining the non-obvious constraint}
- [ ] {Update the E2E test plan to cover this scenario}
- [ ] {Add a lint rule / type guard if applicable}
```

---

## Step 5 — Output to user

After saving the RCA, print:

```
## RCA complete: {Issue Title}

📁 docs/tasks/{kebab-name}/RCA.md

Root cause:   {one-line summary}
Classification: {type}
Risk of fix:  Low | Medium | High

Files to fix:
  - path/to/file.ts
  - path/to/file.tsx

⚡ Next step: Run /dev-plan "{issue title}" to create the implementation plan.
```
