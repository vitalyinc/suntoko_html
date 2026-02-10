#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <pr-number-or-url> [output-dir]" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh command is required." >&2
  exit 1
fi

pr_input="$1"
out_dir="${2:-.codex/skills/pr-comment-fixer/tmp}"
mkdir -p "$out_dir"

repo=""
pr_number=""

if [[ "$pr_input" =~ ^https?://github\.com/([^/]+)/([^/]+)/pull/([0-9]+) ]]; then
  repo="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  pr_number="${BASH_REMATCH[3]}"
else
  pr_number="${pr_input##*/}"
  repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
fi

meta_file="${out_dir}/pr_${pr_number}_meta.json"
review_file="${out_dir}/pr_${pr_number}_review_comments.json"
issue_file="${out_dir}/pr_${pr_number}_issue_comments.json"

gh api "repos/${repo}/pulls/${pr_number}" >"${meta_file}"
gh api --paginate "repos/${repo}/pulls/${pr_number}/comments?per_page=100" >"${review_file}"
gh api --paginate "repos/${repo}/issues/${pr_number}/comments?per_page=100" >"${issue_file}"

echo "Saved:"
echo "  ${meta_file}"
echo "  ${review_file}"
echo "  ${issue_file}"
