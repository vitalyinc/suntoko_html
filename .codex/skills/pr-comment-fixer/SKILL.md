---
name: pr-comment-fixer
description: Review GitHub pull request comments and apply targeted code fixes, then run repository-appropriate validation before reporting what changed.
---

# PR Comment Fixer

Use this skill when the user asks to check PR comments and implement fixes.
This workflow is repository-agnostic and does not assume a specific language or framework.

## Inputs

- PR number or PR URL (required for remote comment retrieval)
- Optional scope constraints from the user (files, labels, deadline)
- Optional validation command(s) from the user

## Workflow

1. Fetch comment context.
   - Run `bash .codex/skills/pr-comment-fixer/fetch_pr_context.sh <pr-number-or-url>`.
   - If `gh` is unavailable or unauthenticated, ask the user for exported comments.
2. Build an actionable checklist from comments.
   - Include only unresolved/actionable items.
   - Group by file/path when possible.
   - Note assumptions and items that need user decisions.
3. Implement minimal code changes.
   - Keep edits focused on comment intent.
   - Avoid unrelated refactors and formatting churn.
4. Validate changes.
   - Prefer user-provided validation commands.
   - Otherwise, run repository-native checks only when they are clearly defined in project files.
   - If no reliable check exists, report validation as not run.
5. Report result.
   - For each handled comment: `comment -> change -> validation result`.
   - Call out skipped comments with reason (`already resolved`, `needs product decision`, `cannot reproduce`, etc).

## Guardrails

- Do not mark a comment as fixed without a corresponding code diff or explicit rationale.
- Keep behavior changes explicit; avoid hidden side effects.
- If requirements conflict between comments, ask the user before proceeding.
- Never rewrite broad parts of the codebase to satisfy a local review note.

## Quick Commands

- Fetch PR context:
  - `bash .codex/skills/pr-comment-fixer/fetch_pr_context.sh 123`
  - `bash .codex/skills/pr-comment-fixer/fetch_pr_context.sh https://github.com/org/repo/pull/123`
