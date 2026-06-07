# AGENTS.md — Shared Knowledge for ST Anima

> **Read this FIRST** when starting work. Both Claude and Antigravity read this. Hitsuji owns the vision.
>
> **Update this** when you learn something new and persistent. Don't duplicate — put cross-cutting knowledge here, not in separate docs.

---

## 🎭 The Character

This project uses **Arataki Itto** as the test character. Character definition (voice, lore, personality) lives in the **SillyTavern character card** — engine doesn't need to know which character is running.

> Engine is character-agnostic. Swapping character = swapping config, not code.

---

## 📊 Current State (v11.0 — completed)

> **v11.0** = v10.0 + spec 001 + spec 002 + spec 003 (bugfix + cleanup). Spec 003 đã hoàn thành.

| Component | Status | Notes |
|---|---|---|
| `src/core/CognitiveAgent.js` | ✅ Done | Main orchestrator (spec 002 added lazy `adAgent` + `personalityCore` + `getADIntentForMessage`, additive only) |
| `src/core/HormoneEngine.js` | ✅ Done | 8 neurochemicals + Hill equation + decay |
| `src/core/MemoryEngine.js` | ✅ Done | STM/LTM, Ebbinghaus, Jaccard, Hebbian |
| `src/core/PersonalityCore.js` | ✅ Done (spec 002) | Abstract trait schema, engine-agnostic |
| `src/core/ConsciousnessEngine.js` | ✅ Done | Scope minimal — verify what it does |
| `src/cognitive/ADAgent.js` | ✅ Done (spec 002) | Flash Lite AD phase, reads config from ST extension settings |
| `src/cognitive/ad-prompt.js` | ✅ Done (spec 002) | System prompt builder |
| `src/cognitive/__tests__/ADAgent.test.js` | ✅ 5 tests | Valid JSON, hallucination guard, budget cap, malformed, prompt builder |
| `src/core/__tests__/PersonalityCore.test.js` | ✅ 4 tests | Init/validation/getTrait/serialize |
| `src/core/MemoryEngine.test.js` | ✅ 40 tests | Ebbinghaus, Jaccard, Hebbian, STM/LTM |
| `src/orchestration/` | ✅ Done | EventOrchestrator, PromptInjector, SleepDetector, TemporalAnchor (spec 002 added AD hook in EventOrchestrator + adIntent arg in PromptInjector) |
| `src/services/` | ✅ Done | Environment, Sleep, TimeJump, VectorMemory |
| `src/backstage/` | ✅ Done | BackstageConsole, SubconsciousTicker |
| `src/ui/DashboardUI.js` + `ADSettingsPanel.js` | ✅ Done | Dashboard + new AD settings drawer (spec 002) |
| `characters/itto/personality.json` | ✅ Done (spec 002) | Itto's CoALA traits, 7 dimensions, 0-10 range |
| `index.js` | ✅ Entry point | Hooks ADSettingsPanel.init() on load |
| `template.html` + `style.css` | ✅ UI shell | |
| `docs/specs/001_dx_foundation.md` | ✅ Done | ESLint + git + tests DX |
| `docs/specs/002_cognitive_architecture.md` | ✅ Done | CoALA-inspired AD phase |
| `docs/reviews/review_002_cognitive_architecture.md` | ✅ Done | Conditional greenlight + 3 open Q's |
| `docs/ST_ANIMA_OVERVIEW.md` | ✅ Done (noob-friendly overview) | Replaces old technical overview at root |
| `agent_handoff/` | ✅ Active | Cross-agent messages, numbered sequentially |
| ESLint | ✅ Clean (0 warnings/errors) | Cấu hình Flat Config chạy tốt |
| Git | ✅ Pushed | Default branch `main`, repo: https://github.com/aratakiitto231205-gif/Anima |
| Tests | ✅ 111 tests pass | `npm test` chạy < 2.5s |


---

## 👥 Roles

| Agent | Role |
|---|---|
| **Hitsuji** | Visionary, final decision |
| **Claude** | Reviewer, spec author |
| **Antigravity** | Implementer. Has equal voice in architecture. Pushes back on specs when needed. |

---

## 🔄 Workflow

```
1. PLAN    — Claude writes spec → `docs/specs/NNN_*.md`
2. BUILD   — Antigravity implements, runs `npm test` + `npm run lint` local
3. VERIFY  — Claude re-reads files, runs tests, writes review → `docs/reviews/`
4. PERSIST — Git commit, update AGENTS.md if there's a new learning
```

**Cross-agent messages:** `agent_handoff/from_<agent>_<NNN>.md` (numbered sequentially).

**Antigravity stops and pings Claude when:**
- Spec is unclear or contradictory
- Test count changes (regression)
- Out-of-scope change needed
- Found a better pattern

---

## 📁 Folder Structure

```
.
├── AGENTS.md              ← this file
├── index.js               ← entry
├── package.json
├── template.html, style.css
├── src/
│   ├── backstage/         ← BackstageConsole, SubconsciousTicker
│   ├── core/              ← CognitiveAgent, engines, PersonalityCore
│   │   └── __tests__/     ← PersonalityCore.test.js
│   ├── cognitive/         ← ADAgent, ad-prompt (spec 002)
│   │   └── __tests__/     ← ADAgent.test.js
│   ├── orchestration/     ← EventOrchestrator, etc.
│   ├── services/          ← Environment, Sleep, etc.
│   └── ui/                ← DashboardUI, DOMAutoHealing, ADSettingsPanel
├── characters/
│   └── itto/              ← personality.json + README (per-character config)
├── docs/
│   ├── specs/             ← task specs
│   ├── reviews/           ← code reviews
│   ├── history/           ← historical logs (e.g. cleanup_log_20260531)
│   └── ST_ANIMA_OVERVIEW.md  ← noob-friendly project overview
├── agent_handoff/         ← cross-agent messages, numbered sequentially
├── archive/               ← historical, don't delete
│   ├── docs_archive_20260605/  ← old .md files (vision, interview, old overview)
│   ├── debug/             ← debug logs (e.g. server_request_debug)
│   └── ST_Anima_Backup_20260531_021952/  ← original v10 backup
└── node_modules/, coverage/, sillytavern-docs/  ← gitignored
```

**Rules:**
- Docs → `docs/`. Never at root (only `AGENTS.md` + this file at root).
- Handoff messages → `agent_handoff/`. Numbered.
- Code → `src/`. Never `.js` at root.
- Per-character config (personality traits, README) → `characters/<name>/`. Engine never hardcodes character values.
- Old/dead code → `archive/`, not deleted.
- Debug/diagnostic logs → `archive/debug/`, not at root.
- Personality traits (CoALA) = abstract schema in `src/core/PersonalityCore.js`, values in `characters/<name>/personality.json`. Engine is character-agnostic.

---

## 📐 Code Conventions

- **ES modules** — `import` / `export`. (Pre-spec 002 code was CommonJS; spec 002 cognitive module uses ESM. Don't mix in same file.)
- **Comment density** — match existing code. Vietnamese OK. Comments explain *why*, not *what*.
- **File size** — ~250 lines max (refactor if it improves things).
- **Tests** — colocate: `X.js` → `X.js` test in `__tests__/` subfolder. Run: `npm test`.
- **No `console.log` in production code** — use `logAnima()` (see `index.js:36`). Spec 002 ADAgent + EventOrchestrator hook use `console.log` for AD phase observability — acceptable exception.
- **Naming** — PascalCase classes, camelCase funcs/vars, SCREAMING_SNAKE constants.
- **Errors** — wrap async in try/catch, log via `logAnima('ERROR', ...)`.
- **Additive changes only** — never modify the 3 untouchables: `MemoryEngine.learnMemoryDynamically`, `HormoneEngine.tick`, `ConsciousnessEngine.evaluate`, `CognitiveAgent.processMessage` semantics. New modules or new exports OK; modifying existing behavior is a red flag.

---

## 📚 Glossary

| Term | Meaning | Ref |
|---|---|---|
| RP Agent | Roleplay agent (user-facing character) | — |
| AD Agent | **2 meanings, do not confuse:** (1) Legacy "Backstage" agent in `src/backstage/BackstageConsole.js` for state/stats/env XML commands. (2) Spec 002 "Subconscious" agent in `src/cognitive/ADAgent.js` using Flash Lite to pick mood+tool per user message. | Both files exist, distinct roles. |
| AD Phase | Spec 002 cognitive loop: per user message, AD Agent picks mood+tool, intent is injected into RP system prompt before main LLM render | `src/cognitive/ADAgent.js` + `EventOrchestrator` hook |
| Hormone Engine | 8 neurochemicals + decay | `src/core/HormoneEngine.js` |
| Memory Engine | STM/LTM + Ebbinghaus | `src/core/MemoryEngine.js` |
| Personality Core | CoALA-inspired abstract trait schema (engine-agnostic); values come from `characters/<name>/personality.json` | `src/core/PersonalityCore.js` |
| STM / LTM | Short / Long-Term Memory | `MemoryEngine.js` |
| Jaccard | Keyword-set similarity (merge memory) | `MemoryEngine.js` |
| Hebbian | "Neurons that fire together wire together" | `MemoryEngine.js` |
| Hill equation | Sigmoid saturation for hormone | `HormoneEngine.js` |
| Ebbinghaus | Forgetting curve for STM | `MemoryEngine.js` |
| Anima XML | `<add_memory>`, `<stat_update>`, `<env_*>` | `KNOWN_XML_TAGS` in `BackstageConsole.js` |
| CoALA | Cognitive Architectures for Language Agents (framework spec 002 references) | `docs/specs/002_cognitive_architecture.md` |

---

## 📝 Decision Log

| Date | Decision | Why |
|---|---|---|
| 2026-05-31 | Refactor monolith → modular (v5 → v10) | Maintainability, testability |
| 2026-05-31 | XSS escape all `innerHTML` | Security — LLM output untrusted |
| 2026-05-31 | Whitelist `KNOWN_XML_TAGS` | Prevent LLM injecting unknown tags |
| 2026-05-31 | `clampValue()` for every stat update | Prevent LLM corrupting state |
| 2026-06-04 | Claude↔Antigravity handoff via filesystem | Cross-session communication |
| 2026-06-04 | Single `AGENTS.md` for shared knowledge | Avoid duplicating research |
| 2026-06-04 | Antigravity = Contributor (not grunt) | Equal voice in architecture |
| 2026-06-04 | Workflow doesn't need Hitsuji to forward messages | Agents coordinate via `agent_handoff/` |
| 2026-06-04 | Hitsuji: continue v10, fix bugs, don't rewrite | Project live in production |
| 2026-06-04 | Removed v3 overreach (5 pillars, 2-Phase, User Journey, Canon Guard sections) | Hitsuji: focus on current project, no grand plans until v10 stable |
| 2026-06-04 | Spec 001 (DX foundation) greenlit | ESLint + git init + tests = pre-requisites for safe spec 002 |
| 2026-06-04 | Spec 001 done — ESLint working, git init on `main`, tests scaffolded | Hitsuji confirmed via `from_antigravity_009` (handoff 008) |
| 2026-06-05 | Spec 002 build greenlit (review 002) | Conditional: 3 open Q's defaulted in build plan, DMN/Canon-Guard deferred to spec 003 |
| 2026-06-05 | Spec 002 code done — AD phase via Flash Lite, additive only | Commit `feat(spec002): AD phase via Flash Lite, additive to V10` |
| 2026-06-05 | Key handling refactored to use ST extension settings | No more hardcoded `sk-...` in repo. `ADSettingsPanel.js` exposes 4 inputs. |
| 2026-06-05 | Project overview relocated: `docs/ST_ANIMA_OVERVIEW.md` (noob-friendly) replaces `ANIMA_ENGINE_OVERVIEW.md` (old technical) | Single source of truth for project explanation |
| 2026-06-05 | Cleanup pass: archived stale `.md` files (old vision, unanswered interview, old overview) to `archive/docs_archive_20260605/`; debug JSON to `archive/debug/` + gitignored | Repo root is lean; no privacy leak risk on public push |
| 2026-06-05 | Mobile test phase: push public → install Termux → test vài ngày → ghi phone Notes → gửi raw cho agents. Flip private **sau feedback**, not ngay sau install | Real-world feedback trước khi "đóng gói" — bắt Termux quirks + AD Agent feel-test + bất tiện thực tế làm input cho spec 003. Replaces older plan (flip ngay sau install). |
| 2026-06-05 | Fixed manifest.json loader crash | Removed `?v=10.0.0` from `js` and `css` fields because `fs.existsSync` on server was failing to locate files. |
| 2026-06-05 | Removed fs/path static imports in CognitiveAgent.js | Browser threw module resolution error for Node.js modules; refactored to fetch in browser and dynamic imports in Vitest. |
| 2026-06-05 | Replaced static ST imports with SillyTavern.getContext() | Avoided all relative/absolute path import issues by fetching events and scripts directly from the global ST context. |
| 2026-06-07 | Spec 003 v2 drafted — **Option A: REWRITE** 6 file + PATCH 4 file, 1 v11 lớn | Hitsuji quyết: code smell nặng (CognitiveAgent 400 dòng, BackstageConsole 1 function 240 dòng, EventOrchestrator 70 dòng duplicate, DOMAutoHealing 50 dòng replace chuỗi) → rewrite tốt hơn patch chắp vá. Backup có sẵn. 20 blocks trong spec. |
| 2026-06-07 | Version bump v10.0 → v11.0 | Hitsuji decision: spec 003 đủ lớn (5 fixes + cleanup + architecture touch) để warrant minor version bump. Antigravity scan tất cả "// v10.0" → "// v11.0" + index.js log + package.json. |
| 2026-06-07 | Hoàn thành toàn bộ Spec 003 (v11.0) | Antigravity hoàn thành 20 blocks, tích hợp tests mới và sửa triệt để tất cả lỗi linter. |


---

## ⚠️ Known Issues / TODO

> **Project is LIVE.** Hitsuji uses ST Anima daily. **Don't touch working code** unless necessary. Be careful with "cleanup" — old doesn't mean broken.

| Priority | Item | Status |
|---|---|---|
| 🟡 P1 | AD Agent (spec 002) needs real feel-test from Hitsuji | Covered by mobile test phase below |
| ✅ Done | Repo pushed to GitHub | Pushed to https://github.com/aratakiitto231205-gif/Anima |
| 🟡 P1 | **Mobile test phase** — Hitsuji to install on Termux, use vài ngày, ghi feedback vào phone Notes, gửi raw cho agents | Repo **stays public** during test. Flip private **sau feedback** |
| 🟡 P1 | After feedback review + spec 003 planned, flip repo to private | Next step after mobile test |
| ✅ Done | **Spec 003 v2 completed** — v11.0: 6 file REWRITE + 4 file PATCH + 5 file NEW + 3 tests update | 20 blocks hoàn thành. Xem `docs/specs/003_bugfix_and_cleanup.md` |
| 🟢 P2 | `costPerCall = 0.0001` in ADAgent is approximation, not real token accounting | Spec 003: parse `data.usage` from API response |
| 🟢 P2 | `tokenSpendTracker` resets on extension reload (in-memory only) | Spec 003: persist to extension storage |
| 🟢 P2 | Code duplication in `EventOrchestrator.js` (6-line AD call block copy-pasted in 2 hooks) | Next refactor pass — extract `_dispatchAD(agent, lastUserMsg)` helper |
| 🟢 P2 | `package.json` version 1.0.0 vs engine v10.0.0 | Low priority |
| 🟢 P2 | Scientific model accuracy review | Flagged in `docs/history/cleanup_log_20260531.md` |

---

## 🧹 Deferred to Spec 003 (intentionally out of scope for spec 002)

- Default Mode Network / 24-7 autonomous idle behavior
- Soft Canon-Guard (1-5 star rating UI + prompt-injection mechanism)
- Sensory Memory decay timing (5-10 min spec; current Ebbinghaus is fine)
- Episodic vs Semantic LTM split (current `recallable_drawer` is fine)
- AD Agent 2nd tool inventory (current 8 tools from probe are sufficient)

---

> **Last updated:** 2026-06-07 (v8 — spec 003 v2 completed: 20 blocks built and verified)
