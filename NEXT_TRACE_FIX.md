# Fix: ".next/trace" access denied (Next.js file trace)

## What the trace is

During `next build`, Next.js writes a **file trace** under `.next/`. It records which files each route depends on, so production/standalone builds only bundle what’s needed. If something on your machine has the `.next` folder (or the `trace` file) open, the build can fail with **EACCES** or **EPERM** and you’ll see "access denied" or "operation not permitted" for `.next/trace`.

## Why you see "no access"

- **OneDrive**: The project is under OneDrive; sync can lock files in `.next`.
- **IDE / Cursor**: The editor or a terminal may be holding the folder or file open.
- **Antivirus**: Scanning or locking `.next` during build.
- **Stale Node process**: A previous `next dev` or `next build` still running.

## Fix (do in order)

1. **Stop anything using the project**
   - Close any terminal that’s running `npm run dev` or `next dev`.
   - Save and close files in the project, then close Cursor (or at least close the project folder and reopen it).

2. **Delete `.next`**
   - In File Explorer go to:  
     `c:\Users\ereza\OneDrive\Desktop\WORK\KALK\Task helper`
   - Delete the `.next` folder (right‑click → Delete).  
   - If it says "in use" or "access denied", restart Windows and try again, or see step 3.

3. **If it’s still locked (often OneDrive)**
   - **Option A:** Right‑click the `Task helper` folder in OneDrive → **Free up space** (so `.next` isn’t synced), then delete `.next` again.
   - **Option B:** Move the project to a folder **outside** OneDrive (e.g. `C:\dev\Task helper`), then delete `.next` there and run `npm run build`.

4. **Rebuild**
   ```bash
   cd "c:\Users\ereza\OneDrive\Desktop\WORK\KALK\Task helper"
   npm run build
   ```

`.next` is in `.gitignore`, so deleting it doesn’t affect your repo. Next.js will recreate it on the next build.

## Reduce future locks

- A **`.cursorignore`** was added so Cursor is less likely to index `.next` (and lock it).
- Prefer running the app from a path **outside** OneDrive if you keep hitting this.
