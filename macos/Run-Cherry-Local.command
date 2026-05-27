#!/bin/bash
# Double-click this file in Finder (or run from Terminal) to install deps and start the local dev server.
# One-time: clone this repo, add apps/web/.env.local (see repo .env.example), then either use the default
# path ~/cherry-app-saas or write your repo path into ~/.cherry-app-root (single line, no quotes).

set -e

CONFIG="${HOME}/.cherry-app-root"
if [[ -n "${CHERRY_APP_ROOT:-}" ]]; then
  ROOT="${CHERRY_APP_ROOT}"
elif [[ -f "${CONFIG}" ]]; then
  ROOT="$(head -n 1 "${CONFIG}" | tr -d '\r' | sed 's/[[:space:]]*$//')"
else
  ROOT="${HOME}/cherry-app-saas"
fi

if [[ ! -f "${ROOT}/package.json" ]]; then
  echo ""
  echo "Cherry — repo folder not found at: ${ROOT}"
  echo ""
  echo "Do this once:"
  echo "  1) git clone <your-repo-url> \"${ROOT}\""
  echo "     — or clone elsewhere and put that full path in: ${CONFIG}"
  echo "  2) Copy .env.example to apps/web/.env.local and set VITE_SUPABASE_* (Supabase → Settings → API)"
  echo ""
  read -r -p "Press Enter to close…"
  exit 1
fi

if [[ ! -f "${ROOT}/apps/web/.env.local" ]]; then
  echo ""
  echo "Cherry — missing: ${ROOT}/apps/web/.env.local"
  echo "Copy the repo file .env.example to that path and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  echo ""
  read -r -p "Press Enter to close…"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Cherry — Node.js is not installed."
  echo "Install the LTS build from https://nodejs.org/ then try again."
  echo ""
  read -r -p "Press Enter to close…"
  exit 1
fi

cd "${ROOT}"
echo ""
echo "Cherry — using repo: ${ROOT}"
echo "Installing / updating dependencies (first run may take a minute)…"
npm install

echo ""
echo "Starting dev server. Open the Local URL printed below in your browser (Safari or Chrome)."
echo "Stop the server with Ctrl+C in this window."
echo ""
npm run dev

echo ""
read -r -p "Server stopped. Press Enter to close…"
