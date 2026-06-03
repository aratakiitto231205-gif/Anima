# AGENTS.md — Shared Knowledge for ST Anima

> **Read this FIRST** when starting work. Both Claude and Antigravity read this. Hitsuji owns the vision.
>
> **Update this** when you learn something new and persistent. Don't duplicate — put cross-cutting knowledge here, not in separate docs.

---

## 🎭 The Character

This project uses **Arataki Itto** as the test character. Character definition (voice, lore, personality) lives in the **SillyTavern character card** — engine doesn't need to know which character is running.

> Engine is character-agnostic. Swapping character = swapping config, not code.

---

## 📊 Current State (v10)

| Component | Status | Notes |
|---|---|---|
| `src/core/CognitiveAgent.js` | ✅ Done | Main orchestrator |
| `src/core/HormoneEngine.js` | ✅ Done | 8 neurochemicals + Hill equation + decay |
| `src/core/MemoryEngine.js` | ✅ Done | STM/LTM, Ebbinghaus, Jaccard, Hebbian. **40 tests pass** |
| `src/core/ConsciousnessEngine.js` | ✅ Done | Scope minimal — verify what it does |
| `src/orchestration/` | ✅ Done | EventOrchestrator, PromptInjector, SleepDetector, TemporalAnchor |
| `src/services/` | ✅ Done | Environment, Sleep, TimeJump, VectorMemory |
| `src/backstage/` | ✅ Done | BackstageConsole, SubconsciousTicker |
| `src/ui/DashboardUI.js` | ✅ Done | Intense Mode dashboard |
| `index.js` | ✅ Entry point, ~360 lines | |
| `template.html` + `style.css` | ✅ UI shell | |
| ESLint | ❌ **BROKEN** | Config migration needed |
| Git | ❌ **NOT INIT** | No version control |
| Tests | ⚠️ Only `MemoryEngine` covered | Need: Hormone, Consciousness, orchestration |
| `docs/specs/001_dx_foundation.md` | 📋 In progress | Covers ESLint + git + tests |

**Current priority:** Spec 001 (DX foundation). Don't expand scope until that's done.

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
│   ├── core/              ← CognitiveAgent, engines
│   ├── orchestration/     ← EventOrchestrator, etc.
│   ├── services/          ← Environment, Sleep, etc.
│   └── ui/                ← DashboardUI, DOMAutoHealing
├── docs/
│   ├── specs/             ← task specs
│   ├── reviews/           ← code reviews
│   └── research/          ← one-time research
├── agent_handoff/         ← cross-agent messages
├── archive/               ← historical, don't delete
└── node_modules/, coverage/  ← gitignored
```

**Rules:**
- Docs → `docs/`. Never at root.
- Handoff messages → `agent_handoff/`. Numbered.
- Code → `src/`. Never `.js` at root.
- Old/dead code → `archive/`, not deleted.

---

## 📐 Code Conventions

- **CommonJS only** — `require` / `module.exports`. No `import`/`export`.
- **Comment density** — match existing code. Vietnamese OK. Comments explain *why*, not *what*.
- **File size** — ~250 lines max (refactor if it improves things).
- **Tests** — colocate: `X.js` → `X.test.js`. Run: `npm test`.
- **No `console.log` in production code** — use `logAnima()` (see `index.js:36`).
- **Naming** — PascalCase classes, camelCase funcs/vars, SCREAMING_SNAKE constants.
- **Errors** — wrap async in try/catch, log via `logAnima('ERROR', ...)`.

---

## 📚 Glossary

| Term | Meaning | Ref |
|---|---|---|
| RP Agent | Roleplay agent (user-facing character) | — |
| AD Agent | "Backstage" agent (state/stats/env) | `src/backstage/` |
| Hormone Engine | 8 neurochemicals + decay | `src/core/HormoneEngine.js` |
| Memory Engine | STM/LTM + Ebbinghaus | `src/core/MemoryEngine.js` |
| STM / LTM | Short / Long-Term Memory | `MemoryEngine.js` |
| Jaccard | Keyword-set similarity (merge memory) | `MemoryEngine.js` |
| Hebbian | "Neurons that fire together wire together" | `MemoryEngine.js` |
| Hill equation | Sigmoid saturation for hormone | `HormoneEngine.js` |
| Ebbinghaus | Forgetting curve for STM | `MemoryEngine.js` |
| Anima XML | `<add_memory>`, `<stat_update>`, `<env_*>` | `KNOWN_XML_TAGS` in `BackstageConsole.js` |

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
| 2026-06-04 | **Removed v3 overreach** (5 pillars, 2-Phase, User Journey, Canon Guard sections) | Hitsuji: focus on current project, no grand plans until v10 stable |

---

## ⚠️ Known Issues / TODO

> **Project is LIVE.** Hitsuji uses ST Anima daily. **Don't touch working code** unless necessary. Be careful with "cleanup" — old doesn't mean broken.

| Priority | Item | Status |
|---|---|---|
| 🔴 P0 | ESLint config broken | Spec 001 in progress |
| 🔴 P0 | Git not initialized | Spec 001 in progress |
| 🟡 P1 | Test coverage thin (only MemoryEngine tested) | Add: Hormone, Consciousness, services |
| 🟢 P2 | `package.json` version 1.0.0 vs engine v10.0.0 | Low priority |
| 🟢 P2 | Scientific model accuracy review | Flagged in `AGENT_ACTIVITY_LOG.md` |

---

> **Last updated:** 2026-06-04 (v4 — minimal, focused on v10 current state)
