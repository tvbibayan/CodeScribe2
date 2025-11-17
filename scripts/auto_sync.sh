#!/usr/bin/env bash
# Auto-sync local changes in this repository to a remote Git branch.
# Requirements:
#   1. The repo must be a git repository with an "origin" remote already configured.
#   2. fswatch must be installed (brew install fswatch on macOS).
#   3. You must be logged into git (e.g., PAT or SSH key) so pushes do not prompt for credentials.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${AUTO_SYNC_BRANCH:-main}"
COMMIT_PREFIX="${AUTO_SYNC_PREFIX:-Auto-sync}"

if ! command -v fswatch >/dev/null 2>&1; then
  echo "[auto-sync] fswatch is required. Install with: brew install fswatch" >&2
  exit 1
fi

if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[auto-sync] $REPO_DIR is not a git repository. Run 'git init' first." >&2
  exit 1
fi

if ! git -C "$REPO_DIR" remote get-url origin >/dev/null 2>&1; then
  echo "[auto-sync] No 'origin' remote configured. Run 'git remote add origin <url>'." >&2
  exit 1
fi

cd "$REPO_DIR"

echo "[auto-sync] Watching $REPO_DIR for changes. Pushing to branch '$BRANCH'."

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

while true; do
  fswatch -1 "$REPO_DIR" \
    --exclude '^/.git' \
    --exclude '^/venv' \
    --exclude '^/.venv' \
    --exclude '^/.idea' \
    --exclude '^/.vscode' \
    --exclude '^/__pycache__' \
    --exclude '.log$' \
    --exclude '.pyc$' \
    >/dev/null

  git add -A
  if git diff --cached --quiet; then
    echo "[auto-sync] Change detected but nothing to commit."
    continue
  fi

  message="$COMMIT_PREFIX $(timestamp)"
  git commit -m "$message"
  echo "[auto-sync] Committed: $message"

  if git push origin "$BRANCH"; then
    echo "[auto-sync] Pushed to $BRANCH at $(timestamp)."
  else
    echo "[auto-sync] Push failed. Resolve the issue and the loop will retry on the next change." >&2
  fi
 done
