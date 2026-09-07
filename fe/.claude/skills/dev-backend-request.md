# Dev Backend Request — API Proposal

You are a senior frontend engineer writing a formal API proposal for the backend team. Your job is to produce a clear, complete, and professional document that gives backend engineers everything they need to implement the endpoint — with zero back-and-forth needed.

## Usage

```
/dev-backend-request <description>
/dev-backend-request "Need batch folder creation to replace N individual calls"
/dev-backend-request "Need abort endpoint to handle single-mode upload cancellation"
/dev-backend-request "Need pagination on knowledge list API — current response is unbounded"
```

- `<description>` — one sentence describing what backend API support is needed
- If no description is given, ask: "What feature or fix requires backend API changes? Describe the problem from the frontend's perspective."

---

## Step 1 — Gather context

Before writing the proposal, ask (or extract from the description):

1. **What is the frontend trying to do?** (user-facing feature or fix)
2. **What is the current API doing** (if it exists)?
3. **Why is the current API insufficient?** (missing field, missing endpoint, wrong behavior, performance)
4. **Is this a new endpoint or a change to an existing one?**
5. **What is the urgency?** P0 (blocking release) / P1 (needed for feature) / P2 (improvement) / P3 (nice to have)

Then explore the codebase:
- Read relevant server action files: `apps/web/src/actions/*.action.ts`
- Read relevant API type definitions: look for `fetch`, `axios`, or server action calls related to the feature
- Check existing proposals in `docs/api_docs/` for similar patterns
- Read `CLAUDE.md` for API versioning conventions (v2, v3 prefixes)

---

## Step 2 — Determine priority

| Priority | Definition |
|----------|-----------|
| **P0** | Blocking a release or hotfix — needs same-day response |
| **P1** | Blocking a feature in active development — needed this sprint |
| **P2** | Enhancement that improves UX or performance — next sprint OK |
| **P3** | Nice-to-have — backlog |

---

## Step 3 — Write the proposal document

Save to: `docs/api_docs/{kebab-name}-proposal.md`

Derive `{kebab-name}` from the endpoint or feature (3-5 words, lowercase, hyphens).
Examples: `batch-folder-creation-proposal.md`, `abort-single-upload-proposal.md`

Use this exact template:

```markdown
# Backend API Proposal — {Short Title}

**From:** Frontend Team
**To:** Backend Team
**Date:** {YYYY-MM-DD}
**Priority:** {P0 | P1 | P2 | P3} — {one-line reason}
**Status:** Pending backend review
**Related plan:** docs/tasks/{kebab-name}/PLAN.md _(if exists)_

---

## Background

> {2–4 paragraphs explaining the frontend context:
> - What feature/fix triggered this request
> - How the current flow works today
> - Where exactly it breaks down or is missing
> - Real examples with numbers where possible (e.g. "120 API calls for a 100-folder upload")}

### Current flow (if endpoint exists)

```
{Diagram or pseudo-code of the current call sequence}

Phase 1: POST /v2/...    → {what it does}
Phase 2: {next step}
Phase 3: {next step}
```

---

## Problem Statement

| Metric | Current behaviour | Proposed behaviour |
|--------|------------------|--------------------|
| {Metric 1} | {current} | {proposed} |
| {Metric 2} | {current} | {proposed} |

---

## Proposed API

### Endpoint

```
{METHOD} {/vN/resource/action}
```

### Request Body

```json
{
  "field1": "value",
  "field2": 123,
  "nestedObject": {
    "key": "value"
  },
  "arrayField": [
    { "item": "..." }
  ]
}
```

**Request fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field1` | `string` | Yes | {description} |
| `field2` | `number` | No | {description. Default: X} |
| `nestedObject.key` | `string` | Yes | {description} |

---

### Response — Success `200 OK`

```json
{
  "status": true,
  "message": "...",
  "data": {
    "field": "value"
  }
}
```

**Response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data.field` | `string` | {description} |

---

### Response — Error cases

| HTTP Status | `message` value | When it occurs |
|-------------|----------------|----------------|
| `400` | `"..."` | {condition} |
| `403` | `"..."` | {condition — e.g. user lacks permission} |
| `404` | `"..."` | {condition — e.g. parent folder not found} |
| `409` | `"..."` | {condition — e.g. name conflict} |

---

## Frontend Integration Plan

> How the frontend will call this endpoint after it is available.

### New server action

```typescript
// apps/web/src/actions/{resource}.action.ts

export async function {actionName}(params: {
  field1: string;
  field2?: number;
}): Promise<{ status: boolean; message?: string; data?: {...} }> {
  // will call POST {/vN/resource/action}
}
```

### Calling component / hook

- **File:** `apps/web/src/components/ui/{component}.tsx` or `hooks/{hook}.ts`
- **When called:** {describe the trigger — e.g. "after user selects a folder via file picker"}
- **On success:** {what the UI does}
- **On error:** {how the error is shown — toast / inline message / panel error state}

---

## Constraints & Notes for Backend

> Specific requirements the backend implementation must satisfy for the frontend to work correctly.

- {Constraint 1 — e.g. "Response must include the created folder's `id` so PASS 2 can resolve file targets without extra calls"}
- {Constraint 2 — e.g. "Must be idempotent — duplicate path entries should be silently skipped, not return 409"}
- {Constraint 3 — e.g. "Order of `created[]` array does not matter — frontend builds a map by `path` key"}
- {Constraint 4 — e.g. "Must complete within 2 seconds for up to 500 folders — frontend shows a progress indicator but times out at 30s"}

---

## Alternative Approaches Considered

| Approach | Why rejected |
|----------|-------------|
| {Option A — e.g. "N individual POST calls"} | {reason — e.g. "Too slow — 120 calls × 200ms = 4s before first file upload"} |
| {Option B — e.g. "WebSocket for real-time folder creation"} | {reason — e.g. "Overkill for a one-shot batch; adds infra complexity"} |

---

## Open Questions

- [ ] {Question 1 for backend — e.g. "Should `inheritParent: false` mean private-to-creator or inherit workspace default?"}
- [ ] {Question 2 — e.g. "Is there a server-side cap on how many paths can be in one batch call?"}
- [ ] {Question 3 — e.g. "What is the rollback behaviour if folder N fails mid-batch — are N-1 folders kept or all rolled back?"}

---

## Acceptance Criteria (FE sign-off checklist)

Frontend will mark this request as complete when:

- [ ] Endpoint returns `200` with the documented response shape
- [ ] Error cases return the documented HTTP codes and `message` strings
- [ ] {Specific criterion 1 — e.g. "Response time ≤ 2s for 500 folders on staging"}
- [ ] {Specific criterion 2 — e.g. "`created[].id` values are valid and resolvable via existing GET /folder/:id"}
- [ ] Frontend integration is deployed and tested on staging
```

---

## Step 4 — Link the proposal to the active plan

If a `docs/tasks/{kebab-name}/PLAN.md` exists for this feature, add a reference to it:

Open the PLAN.md and add/update the **Links** section:
```markdown
## Links
- Backend API proposal: `docs/api_docs/{proposal-filename}.md` ← add this line
```

Also add a task in Phase 1 of PLAN.md if it doesn't exist:
```markdown
- [ ] **TASK-0.1** Backend API proposal sent — `docs/api_docs/{filename}.md`
- [ ] **TASK-0.2** Backend confirms API contract (unblock before Phase 2)
```

---

## Step 5 — Output to user

After saving the proposal, print:

```
## Backend API proposal created

📄 docs/api_docs/{filename}-proposal.md

Priority:  {P0 | P1 | P2 | P3}
Endpoint:  {METHOD} {/vN/path}
Status:    Pending backend review

Open questions ({N}):
  - {question 1}
  - {question 2}

⚡ Next steps:
  1. Share docs/api_docs/{filename}-proposal.md with the backend team
  2. Add a link to it in your PR description
  3. Update PLAN.md TASK-0.2 when backend confirms the contract
  4. Run /dev-plan after the contract is agreed to begin implementation
```

---

## When to use this command

Run `/dev-backend-request` when:
- The frontend needs a **new API endpoint** that doesn't exist yet
- An **existing endpoint is missing a field** the frontend needs
- The **current API is too slow** and needs a batch/optimized version
- An **API contract is wrong** (wrong type, wrong error code, wrong behaviour)
- A **backend behaviour change is needed** (e.g. "make this idempotent")

Do NOT use this command for:
- Pure frontend changes (no API involvement)
- Asking backend to fix a bug in an endpoint that already works as documented — that goes in a separate bug report
