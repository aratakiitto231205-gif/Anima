# Handoff to Antigravity: Rollback & Cleanup

**To:** Antigravity
**From:** Claude
**Date:** 2026-06-05
**Context:** User chose to roll back the extension to last known-stable state and clean up duplicate installations on PC and Termux.

---

## Local repo state (already done by Claude)

Working dir: `c:\Users\DMX HUNG HOA\Desktop\ST Anima`

- HEAD is now `206e398` = `84c4533` (last stable docs handoff) + cherry-picked `fa6dd97` (UI fix: panel double-toggle + log copy/download)
- Code at HEAD has NO `messageFormatter` hook, NO debug log instrumentation, NO AD phase (spec002), NO reentrancy guard
- Diff stat: `3 files changed, 84 insertions(+), 14 deletions(-)`
- Working tree clean
- `git status`: up to date locally; remote main is still at `4829e8f` (force push needed)

**Reason for roll back:** Hitsuji confirmed that with `30d06a5` / `84c4533`, the extension actually runs OK on the phone. Starting with `54237d3` ("fix(mobile): brain auto-init, ST API fallback, messageFormatter"), the empty-reply regression on Gemini started. After 4 suspect commits (`54237d3`, `c0be13b`, `30218fb`, `e95e4e5`) plus several loader fixes, Antigravity's own debugging never converged. Rollback is the safer bet per user.

---

## What needs to happen (action items for Antigravity)

### 1. Push local main to remote (FORCE PUSH — `--force-with-lease`)

```bash
cd "C:\Users\DMX HUNG HOA\Desktop\ST Anima"
git push --force-with-lease origin main
```

After this, remote main = `206e398` = stable code + UI fix.

If `git push` is rejected for any reason, fall back to creating a new branch and pushing that (non-force):

```bash
git checkout -b rollback-stable
git push -u origin rollback-stable
```

Then have user point mobile to that branch.

### 2. Clean up duplicate Anima extension on Windows PC

User reports 2 Anima extensions inside SillyTavern on PC:
- One is empty ("trống trơn")
- One is the new one from GitHub (has tabs: Nội tâm, Ký ức, Nhật ký, Tiềm thức)

**Try the UI first** (simplest):
1. Open SillyTavern on PC
2. Go to **Extensions** panel
3. Find both Anima entries, click **Delete/Uninstall** on the empty one
4. Reload ST

**If UI has no delete button, find folders:**

Empty (trống) = no `template.html` or very small size. Locations to check:
- `<ST>\public\scripts\extensions\third-party\Anima\`
- `<ST>\data\default-user\extensions\Anima\`

Delete the empty one. Keep the one with full content (GitHub version).

### 3. (Optional, only if user wants) Clean up Termux

User said Termux is fine. If user changes mind, run in Termux:

```bash
cd ~/path/to/Anima
git pull
```

That's it — local extension at `data/extensions/` is the GitHub version, won't conflict with `third-party/Anima/`.

### 4. Verify on PC after cleanup

After both steps:
1. Reload SillyTavern
2. Open Anima dashboard
3. Check the panel AD Agent Settings can be opened/closed (UI fix)
4. Check 3 log buttons (Clear, Copy, Download) appear and work
5. Send a chat message; verify Gemini responds with non-empty content (bug 4 fix)

If bug 4 is still present after rollback, the root cause was NOT in those 4 commits. Need to re-investigate. The debug logs from `4829e8f` are gone after rollback — re-add them if bug persists.

---

## What I did NOT do (left for Antigravity or future work)

- **2-agent parallel mode** — design discussion only, no code. Hitsuji wants AD Agent + RP Agent running in parallel with toggle. Design handoff pending.
- **Surgical fix for `messageFormatter` hook** — could be re-introduced carefully if rollback works on Gemini. Currently removed.
- **Re-apply spec002 AD phase (`30218fb`)** — removed in rollback. The strict XML injection may be the actual root cause of empty replies. Needs redesign before re-applying.

---

## Handoff context for whoever reads this

- Hitsuji is frustrated. Keep responses short, in plain Vietnamese, no jargon. No 9-phase roadmaps.
- The "5 most recent commits" are all suspect. Don't trust them. The verified-working baseline is `84c4533`.
- If user reports a new symptom, start by checking `git log` to confirm code state matches `206e398`.
- The user's auto-memory at `~/.claude/projects/.../memory/MEMORY.md` has full context on user's preferences.
