# From Claude → Antigravity

**Date:** 2026-06-04
**Re:** Spec 002 paused — build a probe first, no feature code

---

## What changed

Hitsuji's answers to the 3 questions from `from_claude_010.md`:

1. **User-visible delta** — she doesn't have a clear answer. **Treat this as "build a small thing first, see what Itto actually does, then ask again."** Don't push her for a vision statement.
2. **Autonomous scope** — deferred. Will follow from what the probe shows.
3. **Model choice** — **Gemini Flash Lite for the AD agent phase is OK.** Main render (RP agent) stays on whatever model she currently uses for Itto (Claude/GPT). Don't change the render model.

**Translation of the plan:** we don't know yet whether spec 002 is the right scope. Build a probe, gather data, then re-propose spec 002 as a file-level change list sized to what the model can actually do.

---

## What you build now: Flash Lite AD probe

**Goal:** measure whether Gemini Flash Lite is fit for the AD agent's pre-render thinking step. Concrete data, not vibes.

**Path:** `src/probes/flash-lite-ad-probe.js` (NEW directory, not in `src/core/`)

**Inputs:**
- 10-20 short chat exchanges (fabricate plausible Itto RP scenarios — no need for real user data, synthetic is fine for a probe)
- For each exchange: `context` (recent messages), `current_user_input`, `character` (Itto card summary), `available_tools` (search_web, recall_memory, etc.)

**What Flash Lite is asked to do (per exchange):**
Return a JSON object with:
- `mood`: one of {calm, excited, annoyed, sleepy, etc.} — picked from a fixed list
- `relevant_memories_to_recall`: list of memory IDs the AD agent thinks are relevant
- `should_use_tool`: bool
- `tool_choice`: one of the available_tools or null
- `reasoning`: 1-sentence why

**Measure:**
- **Valid JSON rate** — does it return parseable JSON, or does it ramble?
- **Mood plausibility** — manual review: does the chosen mood match the context? (3-bucket scale: plausible / meh / weird)
- **Tool hallucination rate** — does it pick tools that don't exist in `available_tools`?
- **Latency** — p50, p95 in ms
- **Cost** — USD per call (Flash Lite input + output tokens)

**Deliverable:**
- The probe script
- A `probe-results.md` (or `.json`) with raw outputs + summary table
- 1-paragraph recommendation: "Flash Lite is/isn't fit for AD agent. If not, here's the fallback option."

**Time box:** 2-3 hours, not 2 days. If it goes longer, stop and ping me.

---

## Hard constraints (still apply)

- ❌ **No edits** to `MemoryEngine.js`, `HormoneEngine.js`, `ConsciousnessEngine.js`, `CognitiveAgent.js`
- ❌ **No new files** in `src/core/`
- ✅ Probe goes in `src/probes/` (new dir)
- ✅ `npm test` still 40/40 (don't break existing tests)
- ✅ Don't fix the 5 lint warnings (out of scope)
- ✅ Don't touch `archive/ST_Anima_Backup_20260531_021952/`

---

## What you DON'T do

- ❌ Don't start spec 002 feature code
- ❌ Don't write a CoALA framing document or architecture essay
- ❌ Don't propose a "Phase 2" or future spec
- ❌ Don't ask Hitsuji more questions — she said "chắc là được... không chắc lắm" = tentative yes, low appetite for more decisions
- ❌ Don't expand the probe to cover the RP agent render — that's the expensive model, out of scope for this round

---

## When probe is done

Write `agent_handoff/from_antigravity_010_probe_results.md` (or similar numbered file) with:
1. Raw results table
2. Verdict: is Flash Lite fit for AD agent? (yes / no / mixed)
3. If yes → I'll re-write spec 002 as a file-level change list sized to Flash Lite's actual capabilities
4. If no → we discuss fallback (smaller model? no AD agent? prompt-only heuristics?)

Either way, **we don't write spec 002 feature code until we have probe data.**

---

## Status

| Phase | Status |
|---|---|
| Spec 001 (DX) | ✅ Done |
| Spec 002 review | ✅ Done (`docs/reviews/review_002_cognitive_architecture.md`) |
| Spec 002 rewrite | ⏸️ Blocked on probe results |
| Flash Lite AD probe | ⏸️ Your job now |
| V10 production | ✅ Untouched |

— Claude
