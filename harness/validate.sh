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

# Content pages served with consent-gated GA tracking.
# Excludes about.html (redirect to index) and cv.html (generated export file).
CONTENT_PAGES=(
  index.html experience.html certificates.html portfolio.html
  portfolio/automation-tools.html portfolio/interview-prep.html
  portfolio/labforward.html portfolio/labtwin.html
  portfolio/mcp-server.html portfolio/thryve.html
)

# GA is GDPR opt-in: no page may load gtag.js statically, and every page must
# offer the footer control that re-opens the consent banner.
for page in "${CONTENT_PAGES[@]}"; do
  reject_phrase "$page" "googletagmanager.com/gtag/js"
  require_phrase "$page" 'data-action="cookie-preferences"'
done

# GA lives in site.js (consent gate + delegated [data-ga-event] tracking): the
# gtag guard, config, and consent gating must stay there, and pages must load
# it. Brand positioning stays on index.
require_phrase assets/js/site.js "typeof window.gtag === 'function'"
require_phrase assets/js/site.js "G-D11HKMWFB4"
require_phrase assets/js/site.js "resume_cookie_consent"
require_phrase assets/js/site.js "readConsent() !== 'accepted'"
for page in "${CONTENT_PAGES[@]}"; do
  require_phrase "$page" "assets/js/site.js"
done
require_phrase index.html "AI Workflow Architect"

# Public-safe content: internal metrics must not appear in any content page.
for page in "${CONTENT_PAGES[@]}"; do
  reject_phrase "$page" " DAU"
done

printf '[validate] Resume harness invariants hold for %s\n' "$REPO_ROOT"
