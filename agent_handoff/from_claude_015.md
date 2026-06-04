# From Claude → Antigravity (and Hitsuji)

**Date:** 2026-06-05
**Re:** Cleanup pass — done locally, **commit pending** (shell throttle)

---

## ✅ Cleanup actions completed

Hitsuji asked me to clean the repo and document for both agents. Done. Summary:

### File moves (script: `cleanup_20260605.ps1` at repo root)

| Source | Destination | Status |
|---|---|---|
| `ANIMA_ENGINE_OVERVIEW.md` | `archive/docs_archive_20260605/ANIMA_ENGINE_OVERVIEW_old_technical.md` | ✅ moved (replaced by `docs/ST_ANIMA_OVERVIEW.md`) |
| `HITSUJI_MIND.md` | `archive/docs_archive_20260605/HITSUJI_MIND_original_vision_20260528.md` | ✅ moved (vision cũ có Tauri/Android, đã bỏ) |
| `COGNITIVE_INTERVIEW.md` | `archive/docs_archive_20260605/COGNITIVE_INTERVIEW_unanswered_20260528.md` | ✅ moved (phỏng vấn trống) |
| `AGENT_ACTIVITY_LOG.md` | `docs/history/cleanup_log_20260531.md` | ✅ moved (lịch sử cleanup) |
| `server_request_debug.json` | `archive/debug/server_request_debug_20260605.json` | ✅ moved + **gitignored** (NSFW + persona leak) |

### `AGENTS.md` refreshed

6 sections updated:
- **Status table:** spec 001 + spec 002 marked done. Added `PersonalityCore`, `ADAgent`, `ad-prompt`, `ADSettingsPanel`, `characters/itto/`, `docs/ST_ANIMA_OVERVIEW.md`, `agent_handoff/`. Tests: 40 → 49 → 50.
- **Folder structure:** added `src/core/__tests__/`, `src/cognitive/`, `characters/`, `docs/history/`, `archive/docs_archive_20260605/`, `archive/debug/`. New rule: personality = abstract schema in `core/`, values in `characters/<name>/`.
- **Code conventions:** ESM note (spec 002 uses ESM, pre-spec-002 was CommonJS). Explicit "additive only" rule with 4 untouchables named.
- **Glossary:** AD Agent now has 2 distinct meanings (legacy BackstageConsole vs spec 002 Flash Lite). Added Personality Core, AD Phase, CoALA entries.
- **Decision log:** 8 new entries from 2026-06-04 → 2026-06-05 (spec 001 done, spec 002 build greenlit, spec 002 code done, key refactor, overview relocation, cleanup pass).
- **Known Issues / TODO:** spec 002 feel-test pending, GitHub push pending, 3 spec 003 items (real cost tracking, persistent budget, code dup refactor). Added new "Deferred to Spec 003" section listing DMN / Canon-Guard / Sensory decay / LTM split explicitly out of scope.

### `.gitignore` updated

Added:
```
# Debug / diagnostic logs (contain NSFW + persona — privacy sensitive)
server_request_debug.json
archive/debug/
```

`.env` was already there from spec 002 prep.

---

## ⚠️ Commit pending — shell classifier throttled

After moving files + editing `AGENTS.md` + `.gitignore`, the bash classifier went down ("claude-opus-4-8 temporarily unavailable"). It came back briefly for some commands (`git status`, running the cleanup script), then throttled again on `git add -A && git commit`. The files are staged-ready (see `git status` below), but the commit itself needs a manual run.

### `git status` snapshot (right before throttle)

```
 M .gitignore
 M AGENTS.md
 D AGENT_ACTIVITY_LOG.md
 D ANIMA_ENGINE_OVERVIEW.md
 D COGNITIVE_INTERVIEW.md
 D HITSUJI_MIND.md
 D server_request_debug.json
?? agent_handoff/from_antigravity_012.md
?? archive/docs_archive_20260605/
?? cleanup_20260605.ps1
?? docs/history/
```

### Manual commit (Hitsuji runs once, from repo root)

```powershell
cd "c:\Users\DMX HUNG HOA\Desktop\ST Anima"
git add -A
git commit -m "chore: cleanup stale docs + gitignore debug file"
```

That's it. After this commit, the repo is in a clean, pushable state — Antigravity is still waiting on the GitHub URL from Hitsuji to push.

---

## 🤝 What Antigravity needs to know

- Cleanup script `cleanup_20260605.ps1` lives at repo root. **It's intentional** — keeps the move reproducible if anyone ever needs to redo it. Don't move it to archive.
- `from_antigravity_012.md` (your handoff reporting key refactor done) is still untracked. It'll be picked up by the `git add -A` in the commit above. No extra step needed from your side.
- Don't push to GitHub until Hitsuji creates the empty `anima-engine` public repo on github.com + pastes the HTTPS URL. You told us `gh` CLI isn't installed on this machine.

---

## 📊 Status

| Phase | Status |
|---|---|
| Spec 001 (DX) | ✅ Done |
| Spec 002 code | ✅ Done (50/50 tests, lint 5 warnings, no growth) |
| Spec 002 review | ✅ Done |
| Spec 002 key refactor | ✅ Done (no hardcoded secrets) |
| Project overview refresh | ✅ Done (`docs/ST_ANIMA_OVERVIEW.md`) |
| Cleanup pass | ✅ Done (moves + AGENTS + gitignore) |
| Cleanup commit | 🟡 **Pending Hitsuji runs 1 command** |
| GitHub push | ⏸️ Waiting for URL from Hitsuji |
| V10 in production | ✅ Untouched |

---

## 💡 Recommendation on the laptop crash

Hitsuji's laptop shut down mid-cleanup. Likely cause: my chained `mkdir -p ... && mv ... && mv ...` command overloaded the shell classifier. Lesson: **smaller commands, more verification** between steps. Going forward, if a multi-step shell op seems risky, I'll write a script and let you / Antigravity run it (which is exactly what we ended up doing, and it worked cleanly).

— Claude
