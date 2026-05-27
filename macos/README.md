# Run Cherry locally on a Mac (double‑click)

You can’t fit Node, Git, and the whole app into a single “magic” file. This folder gives you a **launcher** you can put in **Applications** (or the Dock): it opens Terminal, checks your setup, runs `npm install`, then `npm run dev`.

## One-time setup (she does this once)

1. **Install Node.js LTS** from [nodejs.org](https://nodejs.org/) (needed to run the app).

2. **Clone the repo** to the default location (or anywhere she prefers):

   ```bash
   cd ~
   git clone https://github.com/mateusmdias/cherry-app-saas.git cherry-app-saas
   ```

   Default path the launcher uses: **`~/cherry-app-saas`**.

   If the repo lives somewhere else, create a one-line config file:

   ```bash
   echo "/full/path/to/cherry-app-saas" > ~/.cherry-app-root
   ```

   Or set `CHERRY_APP_ROOT` before opening the launcher (advanced).

3. **Supabase env file** (inside the clone):

   ```bash
   cd ~/cherry-app-saas
   cp .env.example apps/web/.env.local
   ```

   Edit **`apps/web/.env.local`** with **Project URL** and **anon / public** key from Supabase → **Settings → API**.

4. **Apply migrations** to that Supabase project (once): see **`supabase/README.md`** in the repo.

## Install the launcher in Applications

1. From the clone, copy **`macos/Run-Cherry-Local.command`** to **`/Applications`** (or leave it in the repo and make an **alias** there).

2. Make it executable (Terminal, one line — adjust the path if needed):

   ```bash
   chmod +x "/Applications/Run-Cherry-Local.command"
   ```

3. **First double‑click:** macOS may block unknown developers. If it does: **System Settings → Privacy & Security** and allow it, or right‑click → **Open** once.

4. If macOS added a quarantine flag (downloaded zip):

   ```bash
   xattr -d com.apple.quarantine "/Applications/Run-Cherry-Local.command" 2>/dev/null || true
   ```

## Every day

Double‑click **Run-Cherry-Local.command** → Terminal opens → wait for “Local: http://localhost:…” → open that URL in the browser. **Supabase stays in the cloud**; only the app runs on her Mac.

Stop the server: go to that Terminal window and press **Ctrl+C**.
