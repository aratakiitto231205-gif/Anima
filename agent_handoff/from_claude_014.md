# From Claude → Antigravity

**Date:** 2026-06-05
**Re:** 2 tasks — fix API key handling + push to GitHub (public first, private after install)

**UPDATE FROM from_claude_014:** Hitsuji clarified the actual use case — she runs **SillyTavern on Termux (Android)** and wants a **GitHub link to paste into ST's "Install extension from Git URL" feature**, not to view code on the GitHub mobile app. The flow is now:

1. Push code to GitHub (initially **public** so install is auth-free)
2. Hitsuji pastes the URL into ST's extension installer on Termux
3. Once installed and working, she flips the repo back to **private**

**Termux prereq:** make sure `git` is available (she runs `pkg install git` on her machine — we don't need to do this, just be aware ST will `git clone` the repo, so the URL must be a valid `https://github.com/...` clone URL).

---

## Task 1: Refactor key handling to use ST's settings panel

### Changes to `src/cognitive/ADAgent.js`
- **Remove** `config.apiKey` and `process.env.GEMINI_API_KEY` as sources.
- Add a method `loadConfigFromSTContext()` that reads from `SillyTavern.getContext().extension_settings.anima_engine`:
  - `ad_api_key` (string, default empty)
  - `ad_model` (string, default `'gemini-3.1-flash-lite'`)
  - `ad_api_url` (string, default `'https://api.shopaikey.com/v1/chat/completions'`)
  - `ad_daily_budget_usd` (number, default 0.50)
- In `evaluate()`: if `apiKey` is empty → log a single warning ("AD Agent: apiKey not configured in ST extension settings"), return `null` (don't crash, don't throw). This is the "user hasn't set up AD yet" graceful path.
- In `evaluate()`: load config fresh on each call (cheap, avoids stale config).
- Keep `BudgetExceededError`, mood/tool hallucination guards, markdown cleanup — all unchanged.

### Changes to `src/probes/flash-lite-ad-probe.js`
- **Delete the hardcoded `API_KEY` constant entirely.**
- Read the key from `process.env.GEMINI_API_KEY` instead (probe is an ad-hoc CLI tool, env var is the right pattern for a script). Document in a 1-line comment that the env var must be set before running.
- If env var missing, print a friendly error: `"Set GEMINI_API_KEY in your environment before running this probe."` and exit code 1.
- This file is in `src/probes/` (out of `src/core/`, out of build plan, ad-hoc only) — but it's still in git, and the repo goes public for ~30 min during install. **The key MUST be gone before any commit.**

### New file: `src/ui/ADSettingsPanel.js`
- A small UI module that renders into ST's extension settings panel.
- Pattern: inject a `<div class="extension_settings">` block (or append to an existing one) with 4 inputs:
  - AD API Key (password input)
  - AD Model (text input, default `gemini-3.1-flash-lite`)
  - AD API URL (text input, default `https://api.shopaikey.com/v1/chat/completions`)
  - AD Daily Budget USD (number input, default 0.50)
- On `input`/`change`, write the value back to `SillyTavern.getContext().extension_settings.anima_engine.{key}` via `saveSettingsDebounced()` (check ST docs for exact API — `sillytavern-docs/extensions/index.md` or grep existing usage).
- Show a small status line at the bottom: "AD Agent status: configured / not configured".
- Add a button "Run AD test" that fires a single evaluate() call with dummy input so Hitsuji can verify the key works.
- ~80-120 lines.

### Hook the panel into the extension
- Find where the extension initializes (look at `index.js` and any `manifest.json` references). Add a call to `ADSettingsPanel.init()` after DOM ready. If you can't find the entry, grep for `extension_settings` usage in this codebase — there's an existing pattern in `VectorMemoryService.js`.
- The panel only needs to render once per ST session. Don't re-render on every chat event.

### Update tests
- `ADAgent.test.js`: add 1 test for "returns null + logs warning when apiKey is empty" (no fetch should fire).
- Existing 5 tests should still pass after the config refactor — they may need a small tweak to inject the ST context mock. If you do `vi.mock()` for the ST context, keep it minimal.

---

## Task 2: Push to GitHub (public first, prepare for private later)

### Pre-flight checklist (do this FIRST, before any push)
1. `git status` should show all your spec 002 changes uncommitted (we never committed them).
2. **Confirm `flash-lite-ad-probe.js` no longer contains the hardcoded key.** Run: `git grep "sk-JzQVP3"` → must return nothing.
3. Run `npm test` → must show 49/49 (or 50/49 with the new test).
4. Run `npx eslint src/` → warning count must not grow beyond the existing 5.
5. Confirm `.gitignore` includes `.env` and any other sensitive files (currently it doesn't — **add `.env`** to `.gitignore` for future-proofing).

### Create the repo (PUBLIC)
- Use the `gh` CLI: `gh repo create anima-engine --public --source=. --remote=origin --description="ST Anima — SillyTavern extension for living characters (Arataki Itto first)"`
- If `gh` isn't authenticated, stop and tell me — I'll ask Hitsuji to run `gh auth login` first. **Heads up:** the install will go on Termux, so don't ask Hitsuji to auth on the desktop machine; her GitHub account just needs to be linked to `gh` so the `git clone` from ST can reach the repo (it's public, so no creds needed for clone, but `gh repo create` itself needs auth).
- If `gh` is not installed, fallback: instruct Hitsuji to create the empty public repo on github.com manually (give her the exact gh command equivalent in plain English), then we push.

### Branch hygiene
- Current branch is `master`. ST convention is `main`. After the first commit, rename: `git branch -m master main`.
- First push: `git add -A && git commit -m "feat(spec002): AD phase via Flash Lite, additive to V10" && git push -u origin main`.
- Make sure commit message follows the existing style in `git log` (short prefix + scope + body).

### After Hitsuji installs
- Once she's confirmed install works on Termux, we flip the repo to private.
- Antigravity's next task (separate handoff) will be: `gh repo edit --visibility private anima-engine` and confirm.

### Do NOT
- ❌ Do not push to `master` directly (we're moving to `main`).
- ❌ Do not use `--force` on the first push.
- ❌ Do not commit the hardcoded API key, ever. If you accidentally `git add` it, stop and tell me — we'll use `git filter-branch` or BFG to scrub.
- ❌ Do not flip to private yet — that's after install, not now.

---

## 🛡️ Hard constraints (still apply)

- ✅ V10 working tree still untouched on the 3 untouchables: `MemoryEngine.learnMemoryDynamically`, `HormoneEngine.tick`, `ConsciousnessEngine.evaluate`.
- ✅ `processMessage` semantics unchanged.
- ✅ Tests pass, lint warnings don't grow.
- ✅ **No hardcoded secrets in git history** (the probe key goes away before any commit). This is critical because the repo goes public for ~30 min.
- ✅ Additive only — no removing existing settings UI or breaking other extensions' settings.

---

## ✅ Definition of done

1. `src/probes/flash-lite-ad-probe.js` has no hardcoded `sk-...` string anywhere. `git grep "sk-JzQVP3"` returns nothing.
2. `ADAgent` reads key from `SillyTavern.getContext().extension_settings.anima_engine.ad_api_key`. Empty key → graceful null + 1 console warning, no crash.
3. New `ADSettingsPanel.js` renders 4 inputs into the ST extension settings UI. Values persist to ST's `extension_settings.anima_engine.*`.
4. `npm test` → 49/49 or 50/49 (with the new "empty key" test).
5. Lint warnings count unchanged (5 pre-existing).
6. `.env` added to `.gitignore`.
7. GitHub repo `anima-engine` exists as **public**, with the spec 002 code pushed to `main`.
8. Provide the GitHub URL in your handoff so I can verify the repo is public + clean (no secrets in code), and give the URL to Hitsuji for ST to install.

---

## 📊 Status

| Phase | Status |
|---|---|
| Spec 002 code | ✅ Done |
| Spec 002 review | ✅ Done (`from_claude_013.md`) |
| Spec 002 key handling | 🟡 Your job now |
| Push to GitHub (public) | 🟡 Your job now |
| Hitsuji installs on Termux | ⏸️ Waiting on push |
| Flip repo to private | ⏸️ After install succeeds |

---

## 📌 When done

Write `agent_handoff/from_antigravity_012.md` with:
1. Diff summary (which files touched, which added)
2. `npm test` output (49 or 50 passing)
3. ESLint summary (warning count, must be 5)
4. Confirmation: hardcoded key is gone from `git grep` results
5. The GitHub URL (public) — I'll pass this to Hitsuji for the install step
6. Any deviations + why

I'll re-review, do a final `git log` check for secret leaks, then pass the URL to Hitsuji. After she confirms install, we issue a separate handoff to flip the repo to private.

— Claude
