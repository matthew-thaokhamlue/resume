#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

require_phrase() {
  local path="$1"
  local phrase="$2"
  if ! grep -Fq "$phrase" "$path"; then
    printf '[validate] missing phrase in %s: %s\n' "$path" "$phrase" >&2
    exit 1
  fi
}

reject_phrase() {
  local path="$1"
  local phrase="$2"
  if grep -Fq "$phrase" "$path"; then
    printf '[validate] forbidden phrase in %s: %s\n' "$path" "$phrase" >&2
    exit 1
  fi
}

# Content pages that must carry GA tracking.
# Excludes about.html (redirect to index) and cv.html (generated export file).
CONTENT_PAGES=(
  index.html experience.html certificates.html portfolio.html
  portfolio/automation-tools.html portfolio/interview-prep.html
  portfolio/labforward.html portfolio/labtwin.html
  portfolio/mcp-server.html portfolio/thryve.html
)

for page in "${CONTENT_PAGES[@]}"; do
  require_phrase "$page" "G-D11HKMWFB4"
done

# Main page must guard every gtag() call and preserve brand positioning.
require_phrase index.html "typeof gtag==='function'"
require_phrase index.html "AI Workflow Architect"

# Public-safe content: internal metrics must not appear in any content page.
for page in "${CONTENT_PAGES[@]}"; do
  reject_phrase "$page" " DAU"
done

printf '[validate] Resume harness invariants hold for %s\n' "$REPO_ROOT"
