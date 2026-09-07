Analyze git changes and generate a pull request comment in Markdown format.

Detect the input type from `$ARGUMENTS` and run the appropriate commands:

---

### Case 1 — PR number (e.g. `pr:123`)

If `$ARGUMENTS` starts with `pr:`, extract the PR number and fetch the full diff via GitHub CLI:

```bash
gh pr diff <number>                        # full diff of the PR
gh pr view <number>                        # PR title, description, metadata
gh pr view <number> --json commits         # all commits in the PR
```

---

### Case 2 — One or more commit hashes (space-separated)

For a **single commit**:

```bash
git show <hash>                                    # full diff
git show --stat <hash>                             # files changed
git log --oneline -1 <hash>                        # commit message
```

For **multiple commits** (combine into one unified diff):

```bash
git diff <first-hash>^..<last-hash>                # combined diff across the range
git diff --name-only <first-hash>^..<last-hash>    # files changed
git log --oneline <first-hash>^..<last-hash>       # all commit messages for context
```

> If the commits are not sequential, run `git show <hash>` for each one individually and merge the analysis.

---

### Case 3 — No arguments

Analyze current working changes:

```bash
git diff HEAD                  # staged and unstaged changes
git diff --name-only HEAD      # list of changed files
git log --oneline -5           # recent commits for context
```

---

Then produce a concise PR comment using this exact structure.

**IMPORTANT — GitHub markdown rendering rules:**
- The output must be valid GitHub Flavored Markdown (GFM)

---

## 📋 Summary
> One sentence describing what this PR fixes or changes.

---

## 🔍 Root Cause
**Core issue:** [inferred from the diff]

- **What:** ...
- **Where:** `file/module/function`
- **Why:** ...

---

## ✅ Solution

**Steps taken:**
1. ...
2. ...

---

## 🧪 Verification
- [ ] Original failing case tested
- [ ] No regression introduced
- [ ] Successfully deployed/applied

---

*Resolved by: [git author] — [current local datetime of the user in YYYY-MM-DD HH:MM:SS format, detected from system timezone]*

---

Rules:
- Be concise — each section should be 1–3 lines max
- Infer root cause and solution strictly from the diff, do not fabricate
- Output only the Markdown block, ready to copy-paste into a GitHub PR comment
- Ensure the output renders correctly on GitHub without broken formatting