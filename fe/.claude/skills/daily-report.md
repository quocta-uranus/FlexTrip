---
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git branch:*), Bash(find:*), Bash(ls:*), Bash(basename:*), Bash(for *), Read, Glob, Grep
description: Generate daily standup report from git history across all repos
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Day of week: !`date +%A`
- Current working directory: !`pwd`
- User arguments: $ARGUMENTS

## Your Task

Generate a daily standup report by analyzing git activity across the allowed project folders.

### Date Parameter

The user may pass a date or date range as an argument. Parse `$ARGUMENTS` to determine the date window:

- **No argument** → default: from yesterday 00:00 through today 23:59 (local time)
- **Single date** (e.g., `2026-04-25`) → from that date 00:00 through that date 23:59
- **Date range** (e.g., `2026-04-21..2026-04-25` or `2026-04-21 2026-04-25`) → from the start date 00:00 through the end date 23:59

Use the resolved start/end dates for `git log --after` and `--before` flags throughout the steps below. Refer to this resolved window as **the date window**.

### Allowed Project Folders

Only scan repos inside these directories:

- `~/www/src-ai-ent`
- `~/www/ai-enterprise`

### Step 1: Discover all git repos

```
find ~/www/src-ai-ent ~/www/ai-enterprise -maxdepth 2 -name ".git" -type d
```

### Step 2: Identify the user's git author name(s)

Check the global git config and also look for common names: `junior`, `juniorOS`.

### Step 3: Collect commits within the date window

Collect commits authored by the user across all repos within **the date window**. Do NOT include uncommitted changes, WIP, or staged work — commits only.

### Step 4: Read the actual code changes for EACH commit

This is critical - do NOT just list commit messages. For each commit found:

1. Run `git show --stat <commit_hash>` to see which files changed
2. Run `git show <commit_hash>` to read the full diff
3. Analyze the diff to understand:
   - What feature/fix was implemented
   - Which components/services were affected
   - Key technical details (e.g., "added new API endpoint for X", "updated Terraform module to support Y", "fixed bug in Z service where...")

### Step 5: Generate the report

Output the report in this exact format:

```
**{date or date range}**

**What you've planned for today?**
- {repo_name}: {detailed description of commits within the date window, combined}
...

**Blockers?**
- NA
```

### Important Rules

1. **Read the actual diffs** - Do not just copy commit messages. Analyze the code changes to understand what was really done.
2. **Group by repo** - Each bullet should start with the repo name in bold.
3. **Short and meaningful** - Each bullet should be 1–2 sentences max. Describe the outcome/intent, not a changelog. Prefer "fixed web-search toggle being ignored on follow-up clicks" over a paragraph-long explanation.
4. **No file paths or code identifiers** - Do not include source file paths, function names, variable names, or class names in the report. Describe the behavior/feature in plain language.
5. **Skip repos with no activity** - Only include repos that have commits in the date window.
6. **Language** - Write the report in English.
7. **Commits only** - Do not inspect `git status`, `git diff`, staged changes, or WIP branches. If no commits are found in the date window, say so and stop.
