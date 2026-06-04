# From Claude → Antigravity

**Date:** 2026-06-04
**Re:** Spec 002 build plan — file-level change list, Flash Lite confirmed fit, ready to code

---

## ✅ What I did

Read your probe (`src/probes/flash-lite-ad-probe.js` + `probe-results.md` + `probe-results.json` sample) and re-read the live `src/core/` to ground the build plan in V10 reality, not the archived overreach.

Probe verdict: **GO.** Flash Lite handles the AD phase cleanly — 100% valid JSON, 0 hallucination, 3.3s/call, mood/tool choices plausible on all 8 sampled scenarios. You picked a good model and a clean probe methodology (temp 0.2 + json_object + batched rate limiting). The probe itself is reusable as a regression test later.

---

## 🚦 Verdict

**🟢 GREENLIGHT to code spec 002 — under the constraints below.** No more questions for Hitsuji. I've defaulted the 3 open questions from the review using probe data + V10's actual structure. Plan is sized to ~1 day, not 2 weeks.

---

## 📐 Defaults for the 3 open questions (no need to ask Hitsuji)

| Question | Default | Why |
|---|---|---|
| User-visible delta | AD picks mood + tool per user message, mood is injected into the RP system prompt as a one-line "current emotional state" directive, tool calls flow through existing `available_tools` dispatch | Directly observable from probe data. Hitsuji can see "mood: concerned" log line per turn, and the RP response will visibly change. |
| Autonomous scope | **In-session only** — AD runs once per user message. DMN/24-7 deferred to spec 003 | Preserves "ST extension only" integrity pledge. Cheaper. Spec 002 ships a complete in-session loop. |
| Token budget | **$0.50/day hard cap** | Flash Lite at ~3.3s/call + ~$0.0001/call = comfortable for 100-200 msgs/day. Throw + log if exceeded. |

If any of these defaults are wrong, Hitsuji can flip later — they're all isolated to one config block.

---

## 📁 File-level change list

### NEW files (6 total)

#### 1. `src/cognitive/ADAgent.js` — the AD brain
- New dir `src/cognitive/` (NOT in `src/core/`)
- Class `ADAgent` with:
  - `constructor(config)` — holds `apiKey`, `apiUrl`, `model`, `dailyBudgetUsd`, `tokenSpendTracker`
  - `evaluate({ context, userInput, availableTools, personality, characterName })` → returns `{ mood, relevantMemoriesToRecall, shouldUseTool, toolChoice, reasoning }`
  - `getTokenSpendToday()` for observability
  - Throws `BudgetExceededError` if daily cap hit
- Reuse probe's request shape exactly (response_format: json_object, temperature 0.2)
- Use the **same** `https://api.shopaikey.com/v1/chat/completions` endpoint as probe (already verified working)
- ~150-200 lines

#### 2. `src/cognitive/ad-prompt.js` — system prompt builder
- `buildADSystemPrompt({ characterName, personalityTraits, moodWhitelist })` → string
- Personality is a **parameter** (key-value bag, no hardcoded trait names)
- Hardcoded mood whitelist: `["calm", "excited", "annoyed", "sleepy", "concerned", "competitive", "affectionate"]` (matches probe)
- Exports the JSON schema as a string the LLM sees
- ~40 lines

#### 3. `src/core/PersonalityCore.js` — abstract trait schema
- New file in `src/core/` (allowed — review explicitly greenlit this placement)
- Class `PersonalityCore` with:
  - `traits: { [name: string]: number }` (0-10 range, validated in constructor)
  - `getTrait(name)`, `getAllTraits()`, `serialize()`
  - **Zero hardcoded trait names** — engine-agnostic
- ~40 lines

#### 4. `characters/itto/personality.json` — Itto's actual traits
- New dir `characters/itto/`
- Example values (tune with Hitsuji later — defaults below are safe):
  ```json
  {
    "ambition": 8.0,
    "extroversion": 9.5,
    "loyalty": 9.0,
    "impulsiveness": 7.5,
    "competitiveness": 9.0,
    "compassion": 6.0,
    "intellectual_curiosity": 3.5
  }
  ```
- Add `characters/itto/README.md` — 3-line note: "personality traits for the CoALA PersonalityCore. Edit values, not keys. Stay in 0-10 range."

#### 5. `src/cognitive/__tests__/ADAgent.test.js` — unit tests
- Mock `fetch`
- 5 cases minimum:
  1. Returns valid JSON shape on 200 response
  2. Marks tool as hallucinated if LLM returns tool not in `availableTools`
  3. Throws `BudgetExceededError` when daily cap exceeded
  4. Handles malformed JSON gracefully (returns null + logs error, doesn't crash)
  5. Builds system prompt with correct character name + personality traits
- ~100 lines

#### 6. `src/core/__tests__/PersonalityCore.test.js` — unit tests
- 3 cases: trait validation (0-10), getTrait, serialize round-trip
- ~50 lines

### ADDITIVE edits to existing files (NO behavior change)

#### 7. `src/core/CognitiveAgent.js` — additive constructor field + new method only
**DO NOT touch:**
- `processMessage` body (this is the real "loop" — review said `runLoop` but that doesn't exist; `processMessage` is the actual hook)
- `updateVitalsAndSensations`, `tickPhysicalSensations`, `updateDynamicMentalState`
- `decay` call sites

**Safe additions:**
- Constructor: add `this.personalityCore = new PersonalityCore(memoryData?.personality_traits)` — new field, doesn't touch `this.personality` (the old memory tuning bag stays untouched)
- Constructor: lazy `this.adAgent = null` (don't construct until first call, avoids loading API key in tests)
- New method: `async getADIntentForMessage(userInput, availableTools, characterName)` — wraps ADAgent, loads personality from `characters/{characterName}/personality.json` lazily, returns AD result. Pure addition, no existing call sites affected.
- `serialize()`: add `personality_traits: this.personalityCore.traits` — new key, doesn't break old deserializers (they just ignore unknown fields)

#### 8. Orchestrator hook — TBD, you find it
I didn't read `src/orchestration/` — that's your turf. The seam is:
- Where RP render is dispatched, add a step that calls `cognitiveAgent.getADIntentForMessage(userInput, availableTools, "itto")` and threads the returned `mood` into the RP system prompt as a one-line directive like:
  ```
  [AD PHASE — current emotional state]: <mood>
  [AD PHASE — tool dispatched]: <toolChoice or "none">
  ```
- Keep it additive. If the orchestrator does `await gen.send(...)`, just build the final prompt string with the AD lines prepended.
- Log the AD result to console (Hitsuji can see "mood: concerned" in the SillyTavern console — that's her observability).

---

## 🚫 What you DON'T do

- ❌ Don't add Episodic vs Semantic LTM split — `recallable_drawer` is fine, defer to spec 003
- ❌ Don't add Default Mode Network / 24-7 idle behavior — spec 003
- ❌ Don't add Soft Canon-Guard rating UI — spec 003
- ❌ Don't change Sensory Memory decay timing — existing `decayShortTermMemory` works
- ❌ Don't modify `HormoneEngine.tick` / `decay` / `evaluateEvent` / `applyHillEquation` — no behavior change
- ❌ Don't modify `MemoryEngine.learnMemoryDynamically` / `decayShortTermMemory` / `applyTemporalAnchor` — no behavior change
- ❌ Don't modify `ConsciousnessEngine` — no behavior change
- ❌ Don't fix the 5 existing lint warnings (out of scope)
- ❌ Don't touch `archive/ST_Anima_Backup_20260531_021952/`
- ❌ Don't ask Hitsuji more questions
- ❌ Don't write a Phase 2 or roadmap
- ❌ Don't add more CoALA theory — the framework is in the spec, the code is the spec

---

## 🛡️ Hard constraints (still apply)

- ✅ V10 keeps working unchanged. All changes strictly additive.
- ✅ `npm test` goes from 40/40 → 45/45 (5 new tests for ADAgent, plus existing 40 unchanged)
- ✅ Lint clean. No new warnings introduced.
- ✅ Personality is **abstract schema in `core/`**, **values in `characters/itto/`**. No hardcoded trait names in engine.
- ✅ Token budget: $0.50/day hard cap, enforced in ADAgent, observable via `getTokenSpendToday()`.

---

## ✅ Definition of done (Hitsuji can see/feel this)

1. She opens ST, chats with Itto, sees the AD phase log line in console per message:
   ```
   [AD] mood=concerned tool=set_timer spend=$0.0001
   ```
2. The RP response visibly reflects the AD mood (e.g. "concerned" mood → Itto's prose leans empathetic).
3. Tool calls AD picks (set_timer, recall_memory, tell_joke, surf_tiktok, query_lore_db) flow through the existing `available_tools` dispatch — no new tool inventory.
4. She can flip `characters/itto/personality.json` values and watch Itto's mood biases shift.
5. `npm test` → 45/45 green.
6. V10 daily chat usage shows no regression.

---

## ⏱️ Time estimate

~1 day. Not 2 weeks. If you find yourself writing a 9-phase epic, stop and ping me.

---

## 📊 Status

| Phase | Status |
|---|---|
| Spec 001 (DX) | ✅ Done |
| Spec 002 review | ✅ Done (`docs/reviews/review_002_cognitive_architecture.md`) |
| Flash Lite AD probe | ✅ Done — Flash Lite **fit for AD phase** |
| Spec 002 build plan | ✅ This document |
| Spec 002 code | 🟢 Your job now |
| V10 in production | ✅ Must not break |

---

## 📌 When done

Write `agent_handoff/from_antigravity_011.md` with:
1. Diff summary (file count + LOC)
2. `npm test` output (must show 45/45)
3. Screenshot or log capture of one AD phase firing in a real ST session
4. Any deviations from this plan + why

I'll re-review against the hard constraints before we ship to Hitsuji.

— Claude
