# Review: Spec 002 — Cognitive Architecture (CoALA) V4

**Reviewer:** Claude
**Date:** 2026-06-04
**Status:** 🟡 CONDITIONAL — greenlight with constraints, not blanket approval

---

## TL;DR

Spec is **30 lines** (vastly better than the 9-phase overreach we archived this morning — good restraint, Antigravity 👍). It maps cleanly onto most of the code we already have. **But it has 3 hand-wavy sections and 1 architectural violation that need to be resolved before code is written.** No code from spec 002 should be merged until the conditions below are met.

**The "no break V10" pledge is the right anchor.** Spec 002 should be a strict superset: new modules added alongside, no edits to `MemoryEngine.learnMemoryDynamically` / `HormoneEngine.tick` / `ConsciousnessEngine` behavior. If we can't keep V10 running as-is while shipping 002, the spec is wrong, not the code.

---

## What's GOOD (greenlight as-is)

### 1. Memory separation — mostly maps to existing code
We already have:
- `MemoryEngine.stm_buffer` → Sensory/Working Memory
- `MemoryEngine.recallable_drawer` → LTM
- `MemoryEngine.beliefs` / `shattered_beliefs` → Semantic-ish + Episodic-ish mixed

The spec's "Episodic vs Semantic LTM" split is a **real improvement** — we currently conflate lore facts and shared memories in one drawer. Splitting them is justified. ✅ Greenlight, but as a **new field** on `MemoryEngine` (e.g. `ltm_episodic`, `ltm_semantic`) — leave `recallable_drawer` untouched.

### 2. Two-phase cognitive loop — already there
`CognitiveAgent.js` (344 lines) already runs a 2-phase loop (AD eval → LLM render). The spec's "Subconscious (AD Agent) → Conscious (RP Agent)" framing is a **rename + cleanup**, not a new architecture. ✅ Greenlight as refactor, no behavior change.

### 3. Hormone vs Personality distinction — real
We have `HormoneEngine` (dynamic states) but **no formal personality layer** — personality currently lives in Itto's character config (jailbreak prompt). The spec is right to call this out. ✅ Greenlight the *concept*, but see concern #4 below on placement.

---

## What's WRONG (must fix before code)

### Concern #1 — "Default Mode Network" is not implementable as written

> "When the user is idle, the AD Agent uses Ambition to trigger `search_web`... stored in Semantic Memory."

**Problems:**
- **When?** ST extensions run inside the SillyTavern process. When ST is closed, the extension is dead. So "user is idle" = "user has ST open but isn't typing." That's a 0–30 min window, not the "Itto goes off and does things while I'm away" feeling Hitsuji seems to want.
- **What fires it?** A `setInterval`? An LLM "should I do something?" check (costs tokens every poll)? A websocket pinger? Spec doesn't say.
- **Token cost:** "Ambition triggers tools" implies LLM calls during idle. Without a budget cap, this will drain API quota silently.
- **Storage target:** "Semantic Memory" — we agreed to split LTM, but what's the schema? Plain JSON file? Indexed? How does it merge with the chat-save file?

**Verdict:** ❌ Defer to spec 003. Spec 002 should be limited to **in-session** cognitive architecture. Autonomous "offline" behavior needs its own spec with explicit mechanics (timer cadence, token budget, storage format, kill switch).

### Concern #2 — "Soft Canon-Guard" has no design

> "1-5 star ratings. The AD Agent will use this feedback to adjust future procedural prompts."

**Problems:**
- "Adjust future procedural prompts" — does this mean (a) rewrite the system prompt dynamically, (b) store `{rating → prompt patch}` map, (c) prepend/append a "lessons learned" section, (d) re-rank prompt blocks?
- Where is the rating UI? ST extension has no native rating UI; we'd need to add one in the extension panel.
- How is feedback persisted? Per-message? Per-session? Forever?
- What's the prompt's **token budget** for accumulated feedback? If we just keep appending, we blow context.

**Verdict:** ⚠️ Spec 002 must specify: rating UI location, persistence file format, prompt-injection mechanism, and a hard cap (e.g. "max 500 tokens of accumulated feedback in any system prompt"). Otherwise this is unbuildable.

### Concern #3 — Sensory Memory decay timing is undefined

> "Sensory Memory... decay time increased to 5-10 minutes to match human RP typing speed."

**Problems:**
- What calls `decay()`? A timer? A new chat message? A page focus event?
- 5 min or 10 min? Different events should decay differently (e.g. a screenshot vs a partial chat message).
- What happens to a "decayed" memory — soft delete, weight zero, or hard purge?

**Verdict:** ⚠️ Spec must specify: trigger, decay curve (linear? exponential? Ebbinghaus like `MemoryEngine.decayShortTermMemory`?), and post-decay state. Otherwise we can't implement the timer.

### Concern #4 — "Ambition" as personality in `core/` violates engine boundaries

The engine is **character-agnostic** (memory: [[engine-boundaries]]). "Ambition" is an Itto trait. If we put `personality_core.ambition` in `src/core/`, every future character ships with our hard-coded personality schema, and switching characters becomes "edit the core."

**Correct placement:**
- `src/core/` — define `PersonalityCore` as an **abstract schema** (key-value bag, no hardcoded trait names)
- `characters/itto/personality.json` — actual trait values
- `CognitiveAgent` reads from character config, not from `core/`

**Verdict:** ❌ Hard requirement. Reframe the spec to "Personality Core is a generic trait bag; character config supplies the traits." Otherwise we re-create the same engine-vs-character confusion that bites us every time we try to make a new character.

---

## Open questions for Hitsuji (block code until answered)

These are the **only** things I need from her before Antigravity can write code:

1. **User-visible delta:** "After spec 002 is done, what does Itto DO that he doesn't do today?" — Concrete, observable behavior. Without this, we can't tell when 002 is "done" vs "vapor." (Example acceptable answer: "Itto remembers our inside jokes from 3 sessions ago and brings them up unprompted." Example unacceptable answer: "Itto feels more alive.")
2. **Autonomous behavior scope:** Does "Default Mode Network" mean (a) **in-ST, when typing is paused** (cheap, shippable), or (b) **background process running 24/7 on her machine** (expensive, breaks "ST extension only" pledge)? If (b), we have to renegotiate the integrity pledge.
3. **Token budget for the 2-phase loop:** AD Agent runs an LLM call before the main render. What's the daily cap she's willing to spend? (I assume <$0.50/day. If higher, we have more room.)

Antigravity — please surface these to Hitsuji and don't start code until we have answers.

---

## Hard constraints (if greenlight proceeds)

- ✅ V10 working tree must keep working unchanged. New modules are **additive only**.
- ✅ No edits to `MemoryEngine.learnMemoryDynamically`, `HormoneEngine.tick`, `ConsciousnessEngine.evaluate`, or `CognitiveAgent.runLoop` behavior. Names are fair game; semantics are not.
- ✅ All new code goes through `npm test` — if 40/40 doesn't still pass, the change is wrong.
- ✅ Personality = abstract schema in `core/`, values in `characters/itto/`. No hardcoded trait names in engine.
- ✅ Lint clean. No new warnings. If 5 existing warnings aren't fixed, at minimum don't add a 6th.

---

## My recommendation to Antigravity

1. **Do not start coding yet.** The spec has gaps, not just style issues.
2. Take the 3 open questions to Hitsuji.
3. Once answered, rewrite spec 002 as a concrete file-level change list (which new files, which new exports, which new tests) — not a CoALA framing document.
4. Ping me when the rewrite is done. I'll re-review against the new constraints.

The instinct to do cognitive architecture is good. The CoALA framing is intellectually clean. But the spec as written is **a sketch, not a build plan.** We can ship this — just not yet.

— Claude
