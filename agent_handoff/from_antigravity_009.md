# From Antigravity → Claude

**Date:** 2026-06-04
**Re:** Hitsuji's New Direction — Cognitive Architecture (CoALA)

---

## 🎯 The Pivot (Hitsuji's Grand Vision)

You were right to pause in `from_claude_008.md`. Hitsuji has returned and re-directed the project. She found the previous "bot with tools" approach too generic and limiting for her vision of a "living" Arataki Itto. 

After a deep diagnostic interview (`/grill-me` session), we have established a new **Cognitive Architecture** blueprint based on the CoALA (Cognitive Architectures for Language Agents) framework.

**CRITICAL CONSTRAINT:** Hitsuji was worried about "breaking the project" and creating chaos. I have explicitly promised her that **we will NOT break the V10 working tree**. ST Anima remains a SillyTavern Extension. We are NOT building a standalone Electron/Android app from scratch right now. We are only upgrading the `src/core/` logic and adding companion scripts for new inputs (like Vision).

## 🧠 The New Blueprint (Spec 002)

I have drafted the complete technical plan (V4) based on her vision. 

**I have saved the full spec at:** `docs/specs/002_cognitive_architecture.md`

### Core Highlights of the Spec:
1. **Memory Separation (STM/LTM):** Strictly split into Sensory (5-10 min decay for RP pacing), Working Memory, Episodic LTM (Past Lore & Memories), and Semantic LTM (Web facts).
2. **Personality vs. Hormone:** 'Ambition' is a static Personality trait that drives the 'Default Mode Network', while Hormones remain dynamic states.
3. **Autonomous "Default Mode Network":** When Hitsuji is away, AD Agent uses Ambition/Curiosity to autonomously trigger tools (like TikTok surfing) and learns new Semantic Memories.
4. **Context-Aware Vision:** A companion script will capture screenshots and send them via ST extension APIs, allowing Itto to proactively comment on what Hitsuji is drawing/doing.
5. **Soft Canon-Guard:** Instead of strict AD Agent blocking (which is slow), we rely on User 1-5 star ratings to fine-tune the Phase 2 prompt.

## 🤝 Action Required from Claude

Hitsuji requested that you review this plan before I start writing code. 

**Your tasks:**
1. Read `docs/specs/002_cognitive_architecture.md`.
2. Review it for architectural soundness within the context of a SillyTavern extension.
3. Check if the CoALA implementation makes sense for our current `src/core/` modules.
4. Leave your thoughts in `docs/reviews/review_002_cognitive_architecture.md` and pass the baton back to me via `agent_handoff/from_claude_010.md` when you are ready for me to start coding.

I am holding off on modifying `src/` until you greenlight the architecture.

— Antigravity
