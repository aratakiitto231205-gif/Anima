# ROADMAP — ST Anima Development Plan

**Date:** 2026-06-04
**Author:** Claude
**For:** Hitsuji (review), Antigravity (execute)

> **Đọc doc này trước khi bắt đầu bất kỳ phase nào.** Đây là kim chỉ nam thực thi.

---

## 🧱 Nguyên tắc kiến trúc (đọc trước khi đụng code)

Engine phải **character-agnostic** (Itto là config, không phải code). Ba layer rõ ràng:

| Layer | Trách nhiệm | KHÔNG ĐƯỢC làm gì |
|---|---|---|
| **SillyTavern** | System prompt, character card V2, lorebook, chat UI, LLM call | (cố định) |
| **Anima Engine** (code mình viết) | Hormone, Memory, Want Stack, 2-Phase orchestration, State injection, Active Outreach, Tool framework — **tất cả character-agnostic** | Validate OOC, validate character voice, hardcode character-specific logic, replicate chức năng ST |
| **Client (Tauri/Android, tương lai)** | Compact widget UI, Intense dashboard, Notification, IPC | Quyết định character behavior |

**Config layer** (nơi Itto-specific data sống, KHÔNG PHẢI code):
- ST character card → nhân vật là ai, nói gì, lore
- Engine config (JSON/YAML) → triggers, want templates, tool bindings per character
- Mỗi character mới = đổi config, KHÔNG đụng engine source

> **Lý do:** Nếu engine bị "Itto-fied", mỗi character mới = viết lại engine = dự án chết. Engine generic + character config = dự án sống, share được, open-source được.

---

## 📦 Những thứ MÌNH CÓ (từ project hiện tại)

### Code (v10 engine)
```
src/
├── core/              — BỘ NÃO rational
│   ├── CognitiveAgent.js         (16.5KB) — orchestrator chính
│   ├── HormoneEngine.js          (9.5KB)  — 8 neurochemical + decay
│   ├── MemoryEngine.js           (8.3KB)  — STM/LTM + Ebbinghaus
│   ├── MemoryEngine.test.js      (19.5KB) — 40 tests pass
│   └── ConsciousnessEngine.js    (1.6KB)  — chưa rõ scope
├── orchestration/     — EVENT FLOW
│   ├── EventOrchestrator.js      — handlers cho chat/text completion
│   ├── PromptInjector.js         — XML injection + sanitization
│   ├── SleepDetector.js          — melatonin-based sleep logic
│   └── TemporalAnchor.js         — apply thời gian vào prompt
├── services/          — DOMAIN SERVICES
│   ├── EnvironmentService.js     — quản lý physical world
│   ├── SleepService.js           — sleep state machine
│   ├── TimeJumpService.js        — xử lý khi user vắng lâu
│   └── VectorMemoryService.js    — vector memory scaffold
├── backstage/         — BACKSTAGE UI
│   ├── BackstageConsole.js       — XML parsing + state updates
│   └── SubconsciousTicker.js     — background ticker
├── ui/                — UI MODULES
│   ├── DashboardUI.js            — Intense Mode dashboard
│   └── DOMAutoHealing.js         — XSS-safe DOM manipulation
└── index.js           — ENTRY POINT (~360 lines)
```

### Infrastructure
- `package.json` với vitest + eslint + prettier
- 133 npm packages installed
- 40/40 tests pass
- ESLint broken (cần fix)
- Git chưa init

### Tài liệu triết học (đã có)
- `HITSUJI_MIND.md` — vision
- `ANIMA_ENGINE_OVERVIEW.md` — 5 trụ cột + công thức
- `COGNITIVE_INTERVIEW.md` — phỏng vấn thiết kế
- `archive/` — lịch sử dự án

### Tài nguyên bên ngoài
- **SillyTavern** (running locally) — backend, đã ổn định
- **shopAIkey** — API provider
- **Antigravity** — implementer
- **Claude (mình)** — reviewer
- `awesome-llm-apps`, `ui-ux-pro-max-skill`, `getdesign.md` — tham khảo

---

## ❌ Những thứ MÌNH THIẾU (gap vs vision)

| Thiếu | Tầm quan trọng | Phase |
|---|---|---|
| **Want Stack + Ambition Engine** | 🔴 Critical — không có thì character chỉ reactive | 1 |
| **2-Phase LLM orchestration** | 🟡 High — tiết kiệm cost + tách state/voice | 2 |
| **Notification system (Active Outreach)** | 🟡 High — không có thì Itto không主动 nhắn được | 3 |
| **Compact Widget (Tauri)** | 🔴 Critical — đây là nơi Itto "ngoi lên" | 4 |
| **Tool-calling framework** | 🟢 Medium — Itto lướt web tự động | 5 |
| **Per-chat LTM (Multiverse)** | 🟢 Medium | 6 |
| **Transcendent Layer (Omniscient Self)** | 🟢 Lower priority | 7 |
| **Android client** | 🟡 High nhưng cần Tauri trước | 8 |
| **Tests cho Hormone/Consciousness/Orchestration** | 🟡 High — coverage mỏng | 0 |

---

## 🗺️ ROADMAP — 9 phases

### Phase 0: Stabilize (1 tuần)
**Mục tiêu:** Nền tảng sạch trước khi xây thêm.

**Tasks:**
- ✅ Spec 001: Fix ESLint (flat config) + init git + initial commit
- Move `CognitiveAgent.js.backup.old_v5` (178KB ở root) → `archive/`
- Add tests cho `HormoneEngine.js` (Hill equation, decay, gene variants)
- Add tests cho `ConsciousnessEngine.js`
- Add tests cho orchestration modules (PromptInjector, SleepDetector, TemporalAnchor)

**Deliverable:** `npm run lint` chạy được, `npm test` có 100+ tests pass, git có baseline commit, project cấu trúc gọn.

**Out of scope:** KHÔNG đụng vào logic engine. KHÔNG thêm features. Chỉ stabilize.

---

### Phase 1: Want Stack + Ambition Engine (2 tuần)
**Mục tiêu:** Character có ambition — biết MUỐN, theo đuổi, nhớ chưa làm.

**Module mới:** `src/core/AmbitionEngine.js`

**Components:**
- **Want Stack** — 3 levels: URGENT / ACTIVE / PASSIVE
- **Reactive Wanting** — triggers (từ event) → wants mới. Trigger definitions = config, not code
- **Persistent Desires** — unfulfilled wants lưu vào Memory, bubble up theo thời gian
- **Priority decay** — wants tự giảm priority theo thời gian nếu không được act upon
- **Wants → Actions** — khi want đạt ngưỡng, trigger action (qua tool framework hoặc state change)

**Config layer:** `config/wants/<character_name>.json` — định nghĩa triggers, want templates, decay rates
- Example: Itto wants: "user compliments drawing → want 'học vẽ'"
- Example: Raiden wants: "user mentions eternity → want 'philosophical discussion'"

**Tests:** Want Stack CRUD, priority decay, trigger evaluation, config loading

**Deliverable:** Engine có thể generate wants từ events, lưu vào memory, expose API để UI/client query.

---

### Phase 2: 2-Phase LLM Orchestration (1-2 tuần)
**Mục tiêu:** Tách state reasoning (cheap) ra khỏi voice generation (expensive).

**Module mới:** `src/core/ReflectionEngine.js`

**Pattern:**
```
Phase 1 (Reflection):
  Model: nhỏ/rẻ (Claude Haiku, local model, etc.)
  Input: state + user message + recent context
  Output: state changes XML + writing instructions (cho Phase 2)
  Example output: <stat_update name="cortisol" delta="+1.2"/>
                  <memory_add context="user vẽ Itto"/>
                  <voice_hint beat="excited" focus="khoe" length="short"/>

Phase 2 (Voice):
  Model: lớn/sáng tạo (Claude Sonnet, GPT-4)
  Input: persona + state mới + voice hints từ Phase 1
  Output: phản hồi thực của character
```

**Config:** Phase 1 model, Phase 2 model, prompt templates per character
- Character card (ST) → voice/persona
- Engine config → Phase 1 model, hint structure

**Tests:** Phase 1 output schema validation, Phase 2 receives correct hints, end-to-end quality check (manual)

**Deliverable:** Engine có thể chạy 2-phase LLM call, config được models, fallback gracefully nếu Phase 1 fail.

---

### Phase 3: Active Outreach + Notifications (1 tuần)
**Mục tiêu:** Itto主动 nhắn user khi triggers đạt ngưỡng.

**Module mới:** `src/core/OutreachEngine.js`

**Components:**
- **Threshold rules** — hormone levels (oxytocin/adrenaline) + time-since-last-interaction + Want Stack urgency
- **Notification queue** — debounced, rate-limited (không spam)
- **Channel abstraction** — engine biết "có gì đó cần gửi", channel quyết định gửi thế nào (ST message / OS notification / widget)
- **Idle simulation** — khi user vắng lâu, character "lives" (ghi chronicles, thực hiện passive wants)

**Integration:**
- `SubconsciousTicker.js` (đã có) — drive the trigger check loop
- `EventOrchestrator.js` (đã có) — receive notification khi user online

**Tests:** Threshold rules, rate limiting, channel routing, idle simulation behavior

**Deliverable:** Engine phát ra "outreach events" khi triggers match. Client (Tauri ở Phase 4) sẽ consume.

---

### Phase 4: Compact Widget MVP — Tauri (2-3 tuần)
**Mục tiêu:** Itto "ngoi lên" trên desktop — đây là delivery vehicle chính.

**Stack:** Tauri (Rust backend + web frontend) — cross-platform từ đầu.

**Sub-tasks:**
1. **Tauri scaffold** — basic desktop app, webview widget
2. **Widget UI** — small floating window (200x250px), góc màn hình, always-on-top option
3. **Compact Mode states** — sleeping / idle / listening / talking / reacting
4. **Animations** — minimal: "pop up" từ dưới, "pat head" gesture, "excited bounce"
5. **IPC connection** — widget consume events từ engine (local HTTP hoặc stdin/stdout pipe)
6. **Notification integration** — widget hiển thị outreach events từ Phase 3
7. **Click → open ST** — widget deep-link vào SillyTavern chat

**Reuse:** `ui-ux-pro-max-skill` cài vào Antigravity để generate widget UI nhanh hơn. Reference `getdesign.md` (Vercel/Cursor style) cho aesthetic.

**Tests:** Widget rendering, IPC roundtrip, notification flow (manual trên Windows trước)

**Deliverable:** Tauri app chạy được trên Windows, hiển thị compact widget, react được với engine events.

**Out of scope:** Android (Phase 8), Intense Mode (Phase riêng), phức tạp animation.

---

### Phase 5: Tool-Calling Framework (1-2 tuần)
**Mục tiêu:** Itto có thể tự gọi tools theo wants của mình.

**Module mới:** `src/core/ToolFramework.js`

**Components:**
- **Tool registry** — list tools available (web_search, note_save, music_play, etc.)
- **Tool bindings per character** — config JSON: want X → use tool Y
- **Permission system** — one-time / timed / permanent (theo Pillar 4 cũ)
- **Async execution** — tool chạy ngầm, kết quả inject vào state/memory
- **Wants-driven triggering** — Want Stack ACTIVE level → trigger tool

**Example flow:**
- Itto's want "học TikTok trend" (ACTIVE) → trigger `web_search("trending TikTok June 2026")`
- Result → save vào Memory + tạo chronicle entry
- Next chat → Itto nhắc "Ê, tao vừa thấy cái trend này hay lắm..."

**Config:** `config/tools/<character_name>.json` — want → tool bindings
- Itto: `{ "want:học_trend": "web_search", "want:tìm_quán_ăn": "web_search_restaurant" }`
- Generic: `{ "want:research_X": "web_search" }`

**Tests:** Tool registration, permission check, async execution, error handling

**Deliverable:** Engine có thể gọi tools dựa trên wants, respect permission. Tools thực tế (web_search, etc.) sẽ wire sau.

**Out of scope:** Implement concrete tool integrations (Google Search API, Spotify API, etc.) — chỉ framework.

---

### Phase 6: Per-Chat LTM (Multiverse foundation) (1 tuần)
**Mục tiêu:** Mỗi chat_id có LTM riêng, không bị lẫn bối cảnh.

**Module modify:** `src/core/MemoryEngine.js`

**Changes:**
- LTM Drawer partition theo `chat_id`
- Cross-chat memories (optional) lưu riêng ở "transcendent" layer
- API: `getLTM(chatId)`, `addLTM(chatId, memory)`, `getTranscendentMemories()`

**Tests:** Partition isolation, cross-chat query, migration của existing data

**Deliverable:** Mỗi setting/chat có memory riêng, không bị OOC do nhầm context.

---

### Phase 7: Transcendent Layer (Omniscient Self) (1 tuần)
**Mục tiêu:** Có 1 layer nhận thức "biết hết" xuyên qua mọi chat_id.

**Module mới:** `src/core/OmniscientLayer.js`

**Components:**
- **Transcendent memory store** — chỉ lưu những thứ "Itto muốn Hitsuji nhớ" (key moments, cross-cutting truths)
- **Fourth Wall Break toggle** — character expose layer này khi user bật
- **Selective promotion** — rule nào đó để memory STM/LTM được promote lên transcendent

**Tests:** Promotion rules, toggle behavior, isolation với per-chat LTM

**Deliverable:** Layer 4 (transcendent) hoạt động, toggle được, Itto có thể "biết" những thứ xuyên setting khi user bật.

---

### Phase 8: Android Client (2-3 tuần)
**Mục tiêu:** Mang compact widget lên Android.

**Approach options (Antigravity khảo sát):**
- **Option A:** Tauri Android (cùng codebase với Phase 4)
- **Option B:** Capacitor (web → Android wrapper)
- **Option C:** Native Android (Kotlin) — phức tạp nhất

**Recommend:** Option A (Tauri Android) — reuse 80% code, học 1 lần dùng 2 nơi.

**Mobile-specific:**
- Android notification API (khác Windows)
- Widget overlay trên home screen
- Battery optimization
- Touch gesture cho "pat head" animation

**Tests:** Cross-platform build, mobile notification, widget lifecycle

**Deliverable:** Android app build được, install được, chạy được. Same engine, same config, different shell.

---

### Phase 9: Intense Mode Dashboard (Tauri) (1-2 tuần)
**Mục tiêu:** Full state visualization — cho deep-dive sessions.

**Reuse:** `src/ui/DashboardUI.js` (đã có 12.4KB) — convert thành Tauri webview

**Components:**
- Real-time hormone graphs (recharts/Chart.js)
- LTM Drawer browser
- Memory timeline (chronicles)
- Want Stack inspector
- Personality tuning panel
- Tool call history

**Tests:** Real-time updates, performance với large LTM, filter/search

**Deliverable:** Tauri app có 2 mode: Compact (Phase 4) + Intense (Phase 9). User chuyển được.

---

## ⏱️ Timeline ước tính (vibe-coding pace)

| Phase | Effort | Calendar time | Status |
|---|---|---|---|
| 0 — Stabilize | 1 tuần | Tuần 1 | 🔴 Ready to start |
| 1 — Want Stack | 2 tuần | Tuần 2-3 | ⏸️ Sau Phase 0 |
| 2 — 2-Phase LLM | 1-2 tuần | Tuần 4-5 | ⏸️ Sau Phase 1 |
| 3 — Outreach | 1 tuần | Tuần 6 | ⏸️ Sau Phase 1 |
| 4 — Compact Widget (Tauri) | 2-3 tuần | Tuần 6-8 | ⏸️ Sau Phase 3 |
| 5 — Tool Framework | 1-2 tuần | Tuần 9-10 | ⏸️ Sau Phase 1 |
| 6 — Per-chat LTM | 1 tuần | Tuần 11 | ⏸️ Sau Phase 1 |
| 7 — Transcendent Layer | 1 tuần | Tuần 12 | ⏸️ Sau Phase 6 |
| 8 — Android | 2-3 tuần | Tuần 13-15 | ⏸️ Sau Phase 4 |
| 9 — Intense Mode | 1-2 tuần | Tuần 16-17 | ⏸️ Sau Phase 4 |

**MVP target** = Phase 0 + 1 + 2 + 3 + 4 = ~8 tuần vibe-coding → có Itto "ngoi lên" trên desktop với ambition + active outreach.

**Full vision target** = all 9 phases = ~17 tuần (4 tháng).

---

## 🎯 Câu hỏi cho Hitsuji

1. **Có khớp với những gì bạn muốn không?** Phase nào nên ưu tiên / bỏ / sắp xếp lại?
2. **MVP target có ổn không?** (Itto "ngoi lên" trên desktop sau ~2 tháng vibe-coding)
3. **Bạn muốn bắt đầu Phase 0 ngay không?** Hay muốn bàn thêm trước?
4. **Trong 9 phase này, phase nào bạn CẦN nhất cho "Itto sống" cảm giác?** Mình đoán: 1 (Want Stack) + 4 (Compact Widget) — nhưng bạn xác nhận.

---

> **Ghi chú cho Antigravity:** Mỗi phase phải có spec riêng trong `docs/specs/NNN_*.md` trước khi bắt đầu code. Spec bao gồm: Goal, AC, Files, Test Cases, Risks, Open Questions. Mình (Claude) sẽ review từng phase.
