# Spec 002: Cognitive Architecture (CoALA) V4

## 1. Background & Integrity Pledge
To prevent structural chaos, ST Anima will remain a **SillyTavern Extension**. We will not rewrite the frontend into a standalone app. New features like OS Vision will be integrated via a lightweight companion script feeding into the extension's API.

## 2. CoALA-Based Cognitive Architecture
The `src/core/` will be restructured to follow the CoALA (Cognitive Architectures for Language Agents) framework.

### A. Memory Modules
* **Sensory Memory:** Holds immediate context (e.g., latest screenshot descriptions, incomplete chat). Decay time increased to 5-10 minutes to match human RP typing speed.
* **Working Memory (STM):** The active context window, holding current reasoning and retrieved LTM data.
* **Long-Term Memory (LTM):**
  * *Episodic Memory:* Autobiographical past (Canon lore rewritten as personal past) and shared RP memories with the user.
  * *Semantic Memory:* Factual knowledge acquired autonomously (e.g., web surfing trends).
  * *Procedural Memory:* Immutable system instructions and behavior guidelines.

### B. Affective System
* **Personality Core:** Immutable traits (e.g., Ambition, Extroversion). Ambition acts as the engine for autonomous learning.
* **Hormone Engine:** Dynamic states (e.g., Sleepy, Excited) that distort or enhance memory retrieval and decision-making.

### C. The Cognitive Loop (2-Phase)
1. **Subconscious (AD Agent):** Evaluates environment -> Updates Hormones -> Retrieves Memory -> Outputs Intent & Tool Selection.
2. **Conscious (RP Agent):** Renders the Intent into prose via SillyTavern's LLM generation.

### D. Default Mode Network (Autonomous Behavior)
When the user is idle, the AD Agent utilizes the *Ambition* trait to trigger exploratory tools (e.g., `search_web`). The acquired knowledge is stored directly into Semantic Memory.

### E. Soft Canon-Guard (RLHF)
Instead of AD Agent blocking non-canon responses (which introduces latency), the system will rely on user feedback (1-5 star ratings). The AD Agent will use this feedback to adjust future procedural prompts.
