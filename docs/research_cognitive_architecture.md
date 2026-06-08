# Research: Cognitive Architecture cho Anima Engine

> **Mục đích:** Nền tảng nghiên cứu để thiết kế skeleton v0.11.0 mới (sau khi đổi tên AD→GM, RP, AD mới). Mỗi mệnh đề phải có citation từ paper/repo uy tín.
>
> **Phương pháp:** Tóm tắt bằng ngôn ngữ em + trích dẫn nguồn (Title, Author, Year, URL). Không sao chép nguyên văn.
>
> **Reviewer:** Claude 2026-06-08.

---

## 1. Memory — Khoa học về trí nhớ con người

### 1.1 Multi-store model (Atkinson & Shiffrin, 1968)
- **Ý tưởng:** Bộ nhớ chia 3 kho: sensory (rất ngắn), short-term (giây-phút), long-term (nhiều ngày-năm)
- **Nguồn:** [Modal Model of Memory — Toolshero](https://www.toolshero.com/personal-development/modal-model-of-memory/) (tổng hợp lại từ Atkinson & Shiffrin 1968)
- **Implication cho Anima:** Layered memory là đúng hướng. Không nên 1 lớp duy nhất.

### 1.2 Baddeley working memory (1974, mở rộng 2000)
- **Ý tưởng:** Short-term memory KHÔNG phải 1 khối — gồm nhiều "slave systems": phonological loop (ngôn ngữ), visuospatial sketchpad (hình ảnh), episodic buffer (kết hợp), controlled by central executive
- **Nguồn:** Baddeley (2000), "The episodic buffer: a new component of working memory?" *Trends in Cognitive Sciences*
- **Implication cho Anima:** Working memory (Layer 1) nên tách: ngôn ngữ gần (chat), hình ảnh/môi trường, "task state" (công việc đang làm). Hiện tại chỉ có raw chat[].

### 1.3 Levels-of-Processing (Craik & Lockhart, 1972)
- **Ý tưởng:** Mức độ "xử lý" khi ghi nhớ quyết định độ bền: shallow (chỉ đọc) → quên nhanh; deep (liên hệ, suy luận) → nhớ lâu
- **Nguồn:** Craik & Lockhart (1972), "Levels of processing: A framework for memory research" *Journal of Verbal Learning and Verbal Behavior*
- **Implication cho Anima:** Memory promotion STM→LTM không chỉ dựa vào "lặp lại N lần" mà còn dựa vào "có được suy luận/liên hệ với memory khác không". Hebbian cũ (count ≥ 3) quá máy móc.

### 1.4 Spaced repetition / Desirable difficulties (Bjork & Bjork, 1992; Ebbinghaus 1885)
- **Ý tưởng:** Ôn lại theo spacing intervals (1 ngày, 3 ngày, 7 ngày...) tăng retention mạnh hơn nhồi liên tục. Forgetting curve Ebbinghaus: `R = e^(-t/S)` với S = stability tăng sau mỗi lần review thành công
- **Nguồn:**
  - [A Year of Desirable Difficulties — NBER Paper 31853 (2024)](https://www.nber.org/papers/w31853)
  - [Spacing effects and their implications for theory and practice — Educational Psychology Review (1994)](https://link.springer.com/article/10.1007/BF01320097)
  - [Testing the Effects of Individual Residents' Retrieval Practice — Medical Science Educator (2024)](https://link.springer.com/article/10.1007/s40670-024-02031-x)
- **Implication cho Anima:** Memory scheduling KHÔNG dùng Ebbinghaus cố định (S=15 phút). Cần stability variable, mỗi lần recall thành công → tăng S. Tìm "next review time" qua SuperMemo SM-2 hoặc tương tự.

### 1.5 Sleep consolidation (Diekelmann & Born, 2010; Klinzing et al., 2019)
- **Ý tưởng:** Hai giai đoạn — encoding ban ngày (hippocampus) → replay đêm (SWS, slow-wave sleep) → chuyển sang neocortex (LTM). Cơ chế: sharp-wave ripples (hippocampus) + slow oscillations (cortex) + spindles (thalamus). SWS: declarative memory. REM: procedural/emotional.
- **Nguồn:**
  - Diekelmann & Born (2010), "The memory function of sleep" *Nature Reviews Neuroscience* 11, 114–126
  - [Mechanisms of systems memory consolidation during sleep — Nature Neuroscience (2019)](https://www.nature.com/articles/s41593-019-0467-3)
  - [Sleep microstructure organizes memory replay — Nature (2024)](https://www.nature.com/articles/s41586-024-08340-w)
- **Implication cho Anima:** Sleep = consolidation pass, KHÔNG random thought generator. Cần mô phỏng replay (re-activate recent STM memories), low acetylcholine phase (no new input), neocortical integration. "Dream" là byproduct không phải mục đích.

### 1.6 Schema theory + spreading activation (Bartlett 1932; Collins & Loftus 1975)
- **Ý tưởng:** Ký ức lưu theo "schema" (khung có cấu trúc), kích hoạt 1 node thì lan ra các node liên quan (spreading activation)
- **Nguồn:** Collins & Loftus (1975), "A spreading-activation theory of semantic processing" *Psychological Review*
- **Implication cho Anima:** Memory card nên có "linked_to[]" — khi recall 1 cái, tự động surface các cái liên quan. Tránh "4 memories cap" cứng — để spreading activation quyết định.

---

## 2. Emotion — Khoa học về cảm xúc

### 2.1 Russell circumplex (1980)
- **Ý tưởng:** Cảm xúc nằm trong không gian 2D: **valence** (pleasure↔displeasure) × **arousal** (activation↔deactivation). Bất kỳ cảm xúc nào cũng là điểm trong không gian này. 4 góc: excited (high+high), distress (low+high), depression (low+low), relaxation (high+low).
- **Nguồn:** [Free Energy in a Circumplex Model of Emotion — arXiv (2024)](https://arxiv.org/html/2407.02474v1) (cập nhật từ Russell 1980)
- **Implication cho Anima:** Thay 8 hormone + emotion table bằng 2D valence-arousal. Tính toán dễ, visualize dễ, dễ map vào RP output. Có thể vẫn giữ hormone nội bộ nhưng expose ra UI = 2D emotion space.

### 2.2 Plutchik wheel (1980)
- **Ý tưởng:** 8 cảm xúc cơ bản (joy, trust, fear, surprise, sadness, disgust, anger, anticipation) xếp trong wheel. Cường độ = radial. Kết hợp cảm xúc → dyads (love = joy+trust, etc.)
- **Nguồn:** Plutchik (1980), "A general psychoevolutionary theory of emotion" — cited extensively, foundational
- **Implication cho Anima:** Dùng làm vocabulary cho RP output (thay vì raw emotion emoji). Emotion taxonomy chuẩn, dễ test.

### 2.3 Decision: Russell (1980) + Appraisal theories (Lazarus 1991; Scherer 2009)
- **Ý tưởng:** Cảm xúc KHÔNG phải response thuần sau sự kiện, mà là kết quả của "appraisal" — đánh giá sự kiện dựa trên relevance, goal congruence, coping potential, norm compatibility
- **Nguồn:** Scherer (2009), "The dynamic architecture of theory-driven sequencing" trong *Oxford Handbook of affective computing*
- **Implication cho Anima:** GM agent nên "appraise" event trước khi gọi emotion update. Có nghĩa: sự kiện "Hitsuji cho kẹo" → appraisal: relevance (cao) + goal_congruence (đói) + coping (OK) → emotion: joy (high valence, high arousal).

---

## 3. Decision-making — Khoa học về ra quyết định

### 3.1 Kahneman System 1/2 (2011)
- **Ý tưởng:** Hệ 1 (nhanh, tự động, cảm xúc) ↔ Hệ 2 (chậm, cố ý, logic). Hầu hết quyết định đời thường = System 1. Chỉ khi "lạ" hoặc "khó" mới bật System 2.
- **Nguồn:** Kahneman (2011), *Thinking, Fast and Slow*
- **Implication cho Anima:** 
  - **GM (System 2 lite)**: phân tích sâu, plan segments, chọn tools, gọi function call
  - **RP (System 1)**: viết prose nhanh, không over-think. Có nghĩa RP KHÔNG gọi LLM function tool — chỉ dùng GM's plan

### 3.2 Damasio somatic markers (1994)
- **Ý tưởng:** Ra quyết định hợp lý CẦN cảm xúc (somatic markers). Bệnh nhân tổn thương vmPFC (ventromedial prefrontal cortex) vẫn có IQ bình thường nhưng quyết định tệ — vì mất cảm xúc hướng dẫn.
- **Nguồn:** Damasio (1994), *Descartes' Error: Emotion, Reason, and the Human Brain*
- **Implication cho Anima:** 
  - Hormone/body state KHÔNG PHẢI side-effect. Nó là INPUT cho quyết định.
  - Khi đói (low glucose) → character có thể cáu kỉ cục, không phải vì "rule" mà vì cảm xúc.
  - Khi mệt → chậm, ít nói. RP nhận "mệt" → viết ngắn, giọng lười.

### 3.3 Dual-process + emotional input
- **Ý tưởng:** System 1 và emotion liên kết chặt. Quyết định = fast intuition (emotional) + slow reasoning (override nếu cần)
- **Implication cho Anima:** GM làm "slow thinking" (analyze + plan). Nhưng cũng phải tính emotional bias (somatic). RP chỉ viết theo plan + state, không tự quyết.

---

## 4. Personality — Mô hình tính cách

### 4.1 Big Five (OCEAN) — Costa & McCrae (1992), Goldberg (1993)
- **Ý tưởng:** 5 traits độc lập: **O**penness, **C**onscientiousness, **E**xtraversion, **A**greeableness, **N**euroticism. Mỗi trait = continuous score (0-1 hoặc 0-100), không phải categorical.
- **Nguồn:**
  - [The big five personality traits and psychological biases — Current Psychology (2021)](https://link.springer.com/10.1007/s12144-021-01999-8)
  - [Personality Categorization of Big Five OCEAN — Springer (2024)](https://link.springer.com/10.1007/978-981-97-3588-4_21)
  - [Big Five Personality Model overview — ScienceDirect](https://www.sciencedirect.com/topics/psychology/big-five-personality-model)
- **Implication cho Anima:** 
  - **Personality config = 5 numbers**, không phải prose dài dòng
  - Ví dụ Itto: `O:0.6, C:0.3, E:0.9, A:0.7, N:0.4` (openness cao về trải nghiệm, conscientiousness thấp vì bất cẩn, extraversion cao vì nổi bật, agreeableness cao vì thân thiện, neuroticism thấp vì ít lo)
  - Dễ test, dễ biến thiên, dễ compare

### 4.4 HEART / PAD — alternative dimensional models
- Mehrabian & Russell (1974): Pleasure-Arousal-Dominance. 3D, dùng trong environmental psychology.
- **Implication:** Nếu muốn chi tiết hơn 5 traits, có thể extend sang 3D affect (Pleasure-Arousal-Dominance) nhưng OCEAN đủ cho v0.11.0.

---

## 5. ST features — Cái gì ST đã có, đừng reimplement

Em đọc docs ST thì thấy ST cung cấp sẵn:

| ST feature | Có thể dùng thay cho | Hiện tại Anima |
|---|---|---|
| **Slash commands (STscript)** | Custom UI controls, debug commands | Đang dùng 1 chút |
| **Variable substitution** `{{getvar::name}}` `{{setvar::name::value}}` | Cross-session state | Không dùng |
| **World Info (lorebook)** | Knowledge base, factual recall | Không dùng |
| **Character card** (V2/V3) | Personality, scenario, example dialogues | Đang dùng qua SillyTavern card |
| **Persona / User persona** | "Hitsuji" identity | Không dùng (hardcode "Hitsuji") |
| **Chat history** | Full context window | Đang dùng qua `context.chat` |
| **Group chats** | Multi-character scenes | Không hỗ trợ |
| **Expression images** | Avatar reactions | Không dùng |
| **STscript** | Complex automation | Không dùng |
| **Server plugins** | Server-side state (env, vector) | Đang dùng (env, vector) |

**Implication:** 
- **Character card** đã có description + personality + example dialogues → không cần viết lại personality trong Anima. Chỉ cần đọc `context.characters[characterId].data` lấy OCEAN scores (custom field trong card) hoặc example dialogues.
- **World Info** có thể chứa lore/facts → Anima không cần re-implement knowledge base.
- **STscript variables** có thể chứa Anima state → thay vì custom storage.

---

## 6. Open-source implementations — Repo uy tín tham khảo

### 6.1 [Stanford Smallville — joonspk-research/generative_agents](https://github.com/joonspk-research/generative_agents) (Park et al. 2023)
- **Kiến trúc:** Memory stream (tất cả experiences) + retrieval (recency/importance/relevance) + reflection (tổng hợp thành suy luận cao hơn) + planning (lịch trình) + reacting (phản ứng sự kiện bất ngờ)
- **Implication:** Reflection = GM's "consolidation" job. Memory retrieval scoring = có citation cụ thể, không phải magic number. Đáng học.

### 6.2 [Letta (MemGPT successor) — letta-ai/letta](https://github.com/letta-ai/letta)
- **Kiến trúc:** Stateful agents với **in-context memory** (core + archival + recall) — phân biệt rõ "working" vs "long-term". Có **memory editing tools** để agent tự sửa memory.
- **Implication:** 
  - **Core memory** = STM (in LLM context, ~5 items)
  - **Archival memory** = LTM (vector DB, unlimited)
  - **Recall memory** = conversation history
  - Có thể mượn cách phân lớp này. Đặc biệt: agent CÓ TOOL để edit memory → GM có thể "tự dạy" thay vì hard-code rules.

### 6.3 [mem0 — mem0ai/mem0](https://github.com/mem0ai/mem0)
- **Kiến trúc:** Universal memory layer cho AI agents. Add/Search/Update memories với LLM extraction từ conversation.
- **Implication:** Mượn pattern "extraction từ conversation tự động" — GM có thể tự extract memories từ tin nhắn, thay vì LLM phải output `<memory_update>` tag.

### 6.4 CoALA — Sumers et al. 2023 (arXiv:2309.02427)
- **Position paper** về cognitive architecture cho LLM agents. Tách concerns rõ: working memory / episodic / semantic / procedural. Internal vs external actions.
- **Implication:** Có citation, đã reference trong Spec 002. Có thể giữ làm theoretical backing.

---

## 7. Đề xuất kiến trúc mới (GM + RP + AD mới)

### 7.1 3 Agent tách concerns

**GM Agent (Game Master)** — System 2, orchestrator
- **Input:** Full chat history (không cap 4 msg) + body state + current time + recent events
- **Output (JSON, chính xác):**
  ```json
  {
    "appraisal": { "relevance": 0.8, "goal_congruence": 0.6, "coping": 0.9 },
    "state_update": { "valence": +0.2, "arousal": -0.1, "energy": -0.05, "hormones": {...} },
    "recalled_memories": [{ "id": "mem_xxx", "reason": "similar valence + recent" }],
    "plan": {
      "segments": [
        { "id": 1, "type": "internal_thought", "length_words": [10, 30], "intent": "thể hiện đang buồn ngủ", "tags": ["animaing"] },
        { "id": 2, "type": "action",       "length_words": [5, 15],  "intent": "vươn vai, mở cửa",       "tags": ["action"] },
        { "id": 3, "type": "dialogue",     "length_words": [5, 20],  "intent": "chào Hitsuji giọng khàn", "tags": ["dialogue", "emotion"] }
      ],
      "tool_budget": null,
      "skip_if_no_event": false
    },
    "next_action": "sleep" | "wake" | "normal" | "reflect"
  }
  ```
- **Tools:** web search, function calling, time, memory editor, environment inspector
- **KHÔNG viết prose.** KHÔNG dump raw numbers vào RP.

**RP Agent (Roleplay Writer)** — System 1, chỉ viết
- **Input:** Plan từ GM + character style (lấy từ `character.card.example_dialogues`) + recalled memories (chỉ nội dung, không phải score) + body state (đã được GM dịch sang prose narrative)
- **Output:** Prose gắn tag theo plan
- **KHÔNG tự plan.** KHÔNG tự quyết emotion. KHÔNG gọi tools.

**AD Agent (Assistant) — agent mới** — Trợ lý user
- **Vai trò:** User hỏi "tui muốn Itto hung dữ hơn" → AD explain options, modify config
- **UI:** Tab trong Dashboard hoặc command-line trong Backstage Console
- **KHÔNG** lẫn với GM. GM = nhân vật. AD = trợ lý kỹ thuật.

### 7.2 Memory 4-layer design (cited)

**L1 — Working Memory (Baddeley)**
- Time-aware: biết "bây giờ là sáng thứ 7, mùa hè, Hitsuji vừa gõ cửa 30s trước"
- Multi-component: chat recent + environment state + task state
- Source: Baddeley 2000 + Russell circumplex 1980
- Implementation: 1 phần từ `context.chat[-10:]` + `agent.body` + `agent.mood` (2D valence-arousal)

**L2 — STM (Atkinson-Shiffrin)**
- Detailed attributes: weight, importance, context, emotion_stamp, sensory (visual/auditory), who, when, where, decay_rate
- Decay: stability variable, S_i grows on successful recall (Ebbinghaus + Bjork)
- Spaced repetition scheduling: SuperMemo SM-2 lite
- Implementation: array of memory cards with rich metadata

**L3 — LTM (Craik Levels-of-Processing + Spreading Activation)**
- Less detail per card, more abstractions
- Attributes: abstraction_level, generalization, linked_memories[], last_rehearsal, importance_score
- Promotion L2→L3 criteria: deep processing (linked to other memories) + spaced repetition completed
- Implementation: vector DB (semantic) + graph (links between memories)

**L4 — Beliefs (skeptical)** *(giữ có điều kiện)*
- 5-10 immutable beliefs, modified only through reflection + user confirmation
- Per Hitsuji: "nghi hoặc về tính cần thiết" — chỉ thêm nếu có research chứng minh beliefs khác biệt về mặt chức năng với high-importance L3 memories
- Implementation: simple array, with reflection rules

### 7.3 Sleep = consolidation, không phải novelist

Theo Diekelmann & Born 2010:
- SWS: replay recent memories → transfer to LTM (low acetylcholine, no new input)
- REM: emotional integration, creative recombination
- "Dream" narrative = byproduct của replay, không phải mục đích
- Implementation: 2 phases, replay + integrate, không phải "ask LLM what you dreamed"

### 7.4 Emotion = 2D valence-arousal (Russell)

Thay vì 8 hormone + emotion table:
- 1 state: `{ valence: 0-1, arousal: 0-1 }`
- Hormone vẫn chạy nội bộ (vì research-backed: cortisol, melatonin có data) NHƯNG chỉ là INPUT
- Public emotion = `(valence, arousal)` hoặc Plutchik primary emotion (lookup table)
- UI: 2D plane (thay vì 8 thanh hormone)

### 7.5 Personality = OCEAN

- 5 numbers, thay vì prose
- Stored trong character card custom field
- Used by GM để bias decisions (high N → GM phát hiện threat nhanh hơn; high O → GM tò mò hơn)

---

## 8. Open questions (cần anh quyết)

**Q1: Skeleton v0.11.0 — implement những gì?**
Em đề xuất: chỉ 1 ô input + 1 ô output, không có GM/RP/AD/memory. LLM thuần viết prose có `<animaing>` tag. Để từ từ add từng phần.

**Q2: Có giữ L4 (Beliefs) không?**
Anh "nghi hoặc về tính cần thiết". Cut nếu không có citation chứng minh khác biệt chức năng.

**Q3: Sleep mechanism — implement cụ thể thế nào?**
Replay theo Born 2010 (sharp-wave ripples không thể mô phỏng algorithmically) — chỉ mô phỏng bằng: pick top K STM memories, "re-process" qua GM agent với prompt "đây là memory cũ, bạn có muốn promote hoặc generalize không?".

**Q4: Anima có nên tích hợp World Info ST?**
Pros: giảm duplication, lore chuẩn hóa. Cons: phụ thuộc user config ST. Em nghiêng KHÔNG — để user tự quyết.

**Q5: Có nên drop hết code v0.11.0 cũ, archive toàn bộ?**
Pros: sạch, không bị "code chết" lẫn lộn. Cons: mất context. Em nghiêng CÓ — archive folder `src/` + `index.js`, build lại từ đầu với skeleton.

---

*Nguồn chính:*
- Atkinson & Shiffrin 1968 (modal model)
- Baddeley 2000 (working memory)
- Craik & Lockhart 1972 (levels of processing)
- Bjork & Bjork 1992 (desirable difficulties)
- Ebbinghaus 1885 (forgetting curve)
- Diekelmann & Born 2010, Klinzing et al. 2019 (sleep consolidation)
- Russell 1980 (circumplex)
- Plutchik 1980 (wheel)
- Kahneman 2011 (System 1/2)
- Damasio 1994 (somatic markers)
- Costa & McCrae 1992, Goldberg 1993 (Big Five)
- Collins & Loftus 1975 (spreading activation)
- Park et al. 2023 (Smallville)
- Sumers et al. 2023 (CoALA)
