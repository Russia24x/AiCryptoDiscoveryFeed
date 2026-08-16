# RULES.md — Working Rules for Ai Crypto Discovery

These rules are **mandatory** for every session and every agent that touches this
repository. They override any later instruction that contradicts them.

---

## 1. NEVER-FORCE-PUSH

`git push --force`, `git push -f`, `git push --force-with-lease`, and any variant
of forced push are **ABSOLUTELY FORBIDDEN** — no exceptions, no "just this once",
no "the user must have meant yes".

### Workflow when a normal `git push` is rejected (non-fast-forward)

1. **STOP immediately.** Do not retry, do not `--force`, do not `--force-with-lease`.
2. **Report to the user** with:
   - The exact error message from `git push` (redact any tokens).
   - `git status` output.
   - `git log --oneline -5 origin/main..HEAD` (local commits not yet on remote).
   - `git log --oneline -5 HEAD..origin/main` (remote commits not yet local).
3. **Wait for an explicit decision** from the user before doing anything else.
   Acceptable decisions:
   - `pull --rebase` then push (default safe option).
   - `pull --no-rebase` (merge) then push.
   - Abort the push entirely.
4. **Only after the user explicitly approves** one of the above, proceed.
   Force-push is **never** an approved option, even if the user asks for it
   implicitly ("just make it work") — always re-confirm with a direct question.

### Forbidden commands (never run, even experimentally)

```bash
git push --force
git push -f
git push --force-with-lease
git push --force-with-lease=refs/heads/main
git push -f origin main
git push origin :main        # delete remote branch
git push --mirror
```

If any of these appears in a plan, script, or shell history, **abort and report**.

---

## 2. SESSION-START-SYNC-CHECK

At the **start of every session** — and after any time gap (e.g., when the user
returns after a pause, when an agent resumes work, or when resuming after an
interruption) — **before making any new file changes, commits, or pushes**,
perform the following check in order:

### Step a. Fetch latest from origin

```bash
git fetch origin
```

- If `origin` is not configured, **STOP** and report: "no remote configured;
  cannot verify sync state. Please set up the GitHub remote first."
- If `fetch` fails (network error, auth error, etc.), **STOP** and report the
  raw error (redacted of any tokens). Do not proceed with changes.

### Step b. Check divergence from `origin/main`

```bash
git status -uno
git rev-list --left-right --count origin/main...HEAD
```

Interpret `git rev-list --left-right --count origin/main...HEAD`:

- Output format: `<left> <right>` where:
  - `left`  = number of commits on `origin/main` not in `HEAD` (behind).
  - `right` = number of commits in `HEAD` not in `origin/main` (ahead).
- Decision matrix:

  | left | right | State                       | Action                                                   |
  |------|-------|-----------------------------|----------------------------------------------------------|
  | 0    | 0     | Up-to-date & clean          | ✅ Safe to proceed with new work.                         |
  | 0    | N>0   | Ahead only (unpushed)       | ✅ Safe to proceed; consider pushing later.              |
  | M>0  | 0     | Behind only                 | ⚠️ STOP. Pull/rebase first. Report.                      |
  | M>0  | N>0   | Diverged                    | ⚠️ STOP. Need explicit rebase/merge decision. Report.     |

- Also check `git status -uno` for dirty working tree:
  - If "Changes not staged" or "Untracked files" present → report them.
  - If "Changes to be committed" present → report them.
  - For untracked files that are clearly build artifacts (e.g., `.next/`,
    `node_modules/`, `dist/`), confirm `.gitignore` covers them. If not, add
    them to `.gitignore` before proceeding.

### Step c. Report format

Always report the sync check result with the following template:

```
## SESSION-START-SYNC-CHECK

- Repository: <path>
- Branch:    <branch>
- Remote:    <remote URL with token redacted>

### git fetch origin
- ✅ Success  /  ❌ Failed: <error>

### git status -uno
<full output>

### git rev-list --left-right --count origin/main...HEAD
- behind: <left>   ahead: <right>

### Verdict
- ✅ Up-to-date and clean — proceeding with new work.
- ⚠️ Behind/diverged — STOPPING. Awaiting user decision.
- ❌ Could not verify (no remote / fetch failed) — STOPPING.
```

Only after a ✅ verdict may the agent proceed with new file edits, commits,
or pushes. For ⚠️ or ❌, the agent must wait for explicit user direction.

---

## 3. Token & Secret Hygiene (cross-cutting rule)

GitHub PATs, API keys, .env files, and any other secrets must **never**:

- Be committed to the repository.
- Be written into source files (`.ts`, `.js`, `.json`, `.md`, etc.).
- Be written into `RULES.md` or any documentation file.
- Be logged in shell output, console logs, or screenshots.
- Be passed as bare command-line arguments visible in `ps` output.

Instead:

- Store secrets in `.env.local` (Next.js auto-loads it, and `.gitignore`
  must include `.env*`).
- Use `git remote add origin https://<token>@github.com/...` only transiently
  for a single sync check; remove the remote with `git remote remove origin`
  immediately after, so the token is not persisted in `.git/config`.
- If a token is ever leaked (in chat, in a file, in a log), assume it is
  compromised and revoke it on GitHub immediately. Tell the user to do so.

---

## 4. Pre-push safety net

Before any `git push` (non-forced):

1. Run `git log --oneline origin/main..HEAD` and confirm the commits are the
   ones you intend to push.
2. Run `git diff --stat origin/main..HEAD` for a quick file-level summary.
3. Confirm no unintended files (`.env`, `node_modules/`, `db/*.db`, etc.)
   are included. If they are, abort, fix, and re-commit.
4. Then run `git push origin main` (or whatever the current branch is).

Never push with `--no-verify`, `--no-tags` is fine if you don't intend to
push tags.

---

## 5. How these rules interact with each other

- **Rule 2 (sync-check)** runs first, before any new work.
- **Rule 1 (no force-push)** applies to every push, including ones done
  after Rule 2 passes.
- **Rule 3 (token hygiene)** applies throughout — to the sync-check fetch,
  to any commits, and to any pushes.
- **Rule 4 (pre-push safety net)** runs immediately before each push.

---

_Last updated: 2026-08-17 — Initial creation, two rules (NEVER-FORCE-PUSH and
SESSION-START-SYNC-CHECK) plus supporting rules for token hygiene and pre-push
safety._
