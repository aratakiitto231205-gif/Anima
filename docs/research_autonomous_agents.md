# Research: Các dự án Autonomous AI Agents & Ứng dụng cho ST Anima

> Tài liệu tham khảo dài hạn. Không phải roadmap. Mỗi mục là **gợi ý có thể tận dụng**, không phải spec phải build.
>
> **Reviewer note (Claude 2026-06-08):** Antigravity viết phần 1-3 OK, dựa trên paper/framework thật. Phần 4 (đề xuất) chỉ là ý tưởng sơ lược — chưa đủ chi tiết để implement, cần spec riêng nếu muốn làm. Claude đã verify mọi claim kỹ thuật chống lại code v11 (xem mục 5).

---

## 1. Generative Agents: Interactive Simulacra of Human Behavior (Stanford "Smallville")

Paper tiên phong về AI tự hành trong môi trường mô phỏng (thị trấn Smallville, 25 agents).

*   **Cơ chế:**
    *   **Memory Stream:** Lưu mọi trải nghiệm dạng ngôn ngữ tự nhiên.
    *   **Retrieval:** Trích ký ức theo 3 yếu tố: *Recency* (gần đây), *Importance* (quan trọng), *Relevance* (liên quan).
    *   **Reflection:** Tự tổng hợp ký ức rời rạc thành suy luận cấp cao (vd: "Itto thích kẹo" + "Itto đang cầm kẹo" → "Itto đang vui").
    *   **Planning & Reacting:** Lên kế hoạch ngày/giờ, nhưng phản ứng lại khi có sự kiện bất ngờ.
*   **Bài học cho ST Anima:**
    *   Retrieval của Smallville tương đồng `MemoryEngine` của mình (Ebbinghaus = Recency, Jaccard = Relevance, Hebbian Habit = Importance consolidation).
    *   **Reflection** là ý tưởng tốt cho `Novelist AI` (trụ cột 6) khi user vắng: LLM tự sinh "bài học" từ ký ức, đẩy vào LTM.

## 2. CoALA (Cognitive Architectures for Language Agents)

**Blueprint** (không phải thư viện code) tiêu chuẩn cho AI agent phức tạp. Spec 002 của mình đã lấy cảm hứng từ đây.

*   **Modular Memory:**
    *   *Working Memory (STM)* — context window hiện tại.
    *   *Episodic Memory (LTM)* — sự kiện cụ thể đã xảy ra.
    *   *Semantic Memory (LTM)* — kiến thức chung.
    *   *Procedural Memory* — kỹ năng, thói quen.
*   **Action Space:**
    *   *Internal Actions* — suy luận, truy xuất ký ức, cập nhật state.
    *   *External Actions* — tương tác môi trường, xuất output.
*   **Bài học cho ST Anima:**
    *   Kiến trúc v11 đang theo sát CoALA (tách AD/RP, có STM/LTM).
    *   *Procedural Memory* đã có một phần: **Hebbian Habit Loop** trong `MemoryEngine.js:223-228` tự củng cố thói quen STM→LTM. Mở rộng thêm (vd: tự học giờ ngủ của user) thì cần spec riêng.

> **Cảnh báo:** CoALA là position paper, **không có reference implementation**. Mọi người implement trên LangChain/LangGraph/AutoGen. Đừng tìm "CoALA chính thức" trên GitHub — không có.

## 3. Virtual Pet & Vitals Simulation

So với agent thuần ngôn ngữ, ST Anima có trụ cột 5: **Cơ thể** (vitals, hormone, somatosensory).

*   **Tamagotchi/Replika:** Decay loop tuyến tính (Đói, Năng lượng, Vui vẻ giảm theo thời gian). Trạng thái thể chất ảnh hưởng hành vi.
*   **So với `HormoneEngine` của mình:** Mình dùng Hill equation (sigmoid) cho 8 neurochemicals — tinh vi hơn tuyến tính, có genetic polymorphism (OXTR, COMT, DRD4).
*   **Thách thức:** LLM phải hiểu chỉ số để render `<action>`/`<emotion>` tự nhiên.
*   **Giải pháp tham khảo:** "Somatosensory summary" — dịch số liệu sang ngôn ngữ cơ thể (vd: "Cơ thể: Đang cồn cào vì đói" thay vì "Ghrelin: 0.8"). **Hiện tại v11 chưa làm tốt phần này — `PromptInjector.js:25-32` vẫn dump raw numbers + label, chưa dịch sang prose.**

## 4. ST Extension Patterns từ docs chính thức (Claude bổ sung 2026-06-08)

**Phần này giá trị thực tế nhất cho v0.11.0.** Lấy từ `sillytavern-docs/For_Contributors/Writing-Extensions.md`.

### 4.1 `getContext()` — namespace chuẩn

```js
const { eventSource, event_types, eventSource, saveSettingsDebounced, renderExtensionTemplateAsync } 
    = SillyTavern.getContext();
```

**v11 đang dùng pattern cũ** (`SillyTavern.getContext().getRequestHeaders()` trong `EnvironmentService.js:13`). Vẫn hoạt động, nhưng destructure qua `getContext()` là cách hiện đại + stable hơn.

### 4.2 Event types quan trọng cho v0.11.0

| Event | Khi nào | Dùng cho |
|---|---|---|
| `MESSAGE_SENT` | User gửi, ghi vào `chat[]` chưa render | Pre-process user input (parse intent, cập nhật state) |
| `MESSAGE_RECEIVED` | LLM respond, ghi vào `chat[]` chưa render | Trigger hormone/state update, parse tags |
| `CHARACTER_MESSAGE_RENDERED` | Đã render trên UI | Animate, apply emotion overlay |
| `STREAM_TOKEN_RECEIVED` | Mỗi token trong streaming | Typewriter effect |
| `GENERATION_ENDED` | Generation xong (success/error) | Finalize state, save memory |
| `CHAT_CHANGED` | Đổi chat | Reset state |
| `APP_READY` | App fully loaded | Khởi tạo UI |

### 4.3 `renderExtensionTemplateAsync()` — render HTML an toàn

```js
const { renderExtensionTemplateAsync } = SillyTavern.getContext();
const html = await renderExtensionTemplateAsync('third-party/my-ext', 'settings', { title: 'Hi' });
$('#extensions_settings2').append(html);
```

Auto-sanitize qua DOMPurify, support Handlebars, support i18n. **Nên dùng cho mọi UI panel mới trong v0.11.0+**, không tự build HTML bằng tay.

### 4.4 `registerFunctionTool()` — thay thế tag contract?

LLM gọi structured function call thay vì output `<emotion>happy</emotion>` rồi parse regex:

```js
const { registerFunctionTool } = SillyTavern.getContext();
registerFunctionTool({
    name: 'set_emotion',
    parameters: { /* JSON schema */ },
    action: async ({ emotion, intensity }) => { /* update state */ }
});
```

**So với v11 tag contract:**
- **Pro function call:** ít lỗi parse, có validation schema, model không thể "quên" tag
- **Con function call:** nặng hơn, tăng prompt size, cần model support (hầu hết chat completion API support rồi)
- **Verdict:** nếu LLM support function calling → tốt hơn tag contract. Còn dùng text completion → giữ tag contract.

### 4.5 `generate_interceptor` qua `manifest.json` — chuẩn hơn inline patch

Manifest:
```json
{ "generate_interceptor": "myInterceptorFn" }
```

Code:
```js
globalThis.myInterceptorFn = async (chat, contextSize, abort, type) => {
    // modify chat array trước khi gửi LLM
};
```

**v11 hiện tại** (`PromptInjector.js:72-140`) in-line patch `chat[]` array. Hoạt động nhưng không theo chuẩn ST. Refactor sang `generate_interceptor` khi có thời gian.

### 4.6 Storage patterns

| Cần lưu | Dùng |
|---|---|
| Settings nhỏ, JSON | `extensionSettings` + `saveSettingsDebounced()` |
| Data lớn (memory, vector) | `SillyTavern.libs.localforage` (IndexedDB abstraction) |
| Per-chat data | `chatMetadata` + `saveMetadata()` |
| Per-character data (shareable khi export card) | `writeExtensionField(characterId, key, value)` |

**v11 đang dùng** `/api/extensions/environment/save` (server plugin) — cũ tốt nhưng nặng. V0.11.0+ có thể chuyển memory engine sang `localforage` cho nhẹ.

### 4.7 Structured Outputs

`generateRaw()` / `generateQuietPrompt()` accept `jsonSchema` để force output theo schema. Có thể thay thế tag contract nếu muốn strict validation. **Tăng prompt size đáng kể, chỉ dùng khi thật cần strict.**

## 5. Verification Notes (Claude double-check 2026-06-08)

Em đã verify từng claim kỹ thuật của Antigravity chống lại code v11 archive:

| Claim của Antigravity | Thực tế trong code | Kết luận |
|---|---|---|
| Hill equation cho 8 neurochemicals | `HormoneEngine.js:11-46`, đúng 8 chất (adrenaline, cortisol, melatonin, dopamine, serotonin, oxytocin, endorphins, sex_hormones), Hill n=2 Kd=3.0 | ✅ Đúng. **Thiếu:** có thêm genetic polymorphism (OXTR, COMT, DRD4) — Antigravity không nhắc |
| Ebbinghaus = Recency, Jaccard/Hebbian = Relevance/Importance | `MemoryEngine.js:138-151` (Ebbinghaus, S=15min), `MemoryEngine.js:80-89` (Jaccard), `MemoryEngine.js:223-228` (Hebbian Habit Loop) | ✅ Đúng |
| Spec 002 truyền cảm hứng CoALA | `archive/v11_archive/docs/002_cognitive_architecture.md:1` — "Spec 002: Cognitive Architecture (CoALA) V4" | ✅ Đúng |
| Môi trường = External Data | `EnvironmentService.js:8-47` qua `/api/extensions/environment/save` | ✅ Đúng |
| "PromptInjector dịch sang ngôn ngữ cơ thể" | `PromptInjector.js:25-32` vẫn dump raw numbers (`Adrenaline: 7.5/10`) + label tiếng Việt | ⚠️ **Cường điệu** — chỉ label, chưa phải prose narrative |
| "Procedural Memory chưa có" | Đã có Hebbian Habit Loop `MemoryEngine.js:223-228` | ❌ **Sai** — Antigravity không đọc kỹ code |
| "RẤT tinh vi và cao cấp" (Hill) | Marketing language | ⚠️ Cường điệu |
| Reflection cho Novelist AI | Idea đúng tinh thần Smallville | ✅ Idea OK, **chưa có thiết kế cụ thể** |
| "Môi trường phải là External Data" | Đã implement | ✅ Đúng |

**Bài học rút ra:** Antigravity research textbook OK, nhưng khi nói về **code của mình** thì cần verify. Một số claim sai vì không mở file ra đọc.

## 6. Ý tưởng từ Antigravity (mục 4 trong bản gốc)

Ghi lại để tham khảo, **không phải cam kết build**. Cần spec riêng nếu muốn làm.

1. **Reflection cho Novelist AI** — hay, có thể tận dụng. Nhưng cần thiết kế: trigger khi nào, summary dài bao nhiêu, lưu vào đâu.
2. **Môi trường = External Data** — đã làm rồi (trụ cột 4 của VISION).
3. **Somatosensory Prompting** — chưa làm tốt, có cải tiến thật. Cần refactor `PromptInjector` dịch raw numbers → prose.

## 7. Tài liệu tham khảo bổ sung (Claude thêm 2026-06-08)

### Smallville implementations
- [joonspk-research/generative_agents](https://github.com/joonspk-research/generative_agents) — official (21.5k stars), Python + FastAPI
- [Stan-Stani/smallville](https://github.com/Stan-Stani/smallville) — browser port (TypeScript)
- Code structure: `reverie/backend_server/persona/` chứa memory, reflect, plan, agent. Đọc `persona/memory.py` + `persona/reflect.py` nếu muốn implement reflection.

### CoALA + related
- [gao-hongnan/awesome-ai-agents](https://github.com/gao-hongnan/awesome-ai-agents) — tổng hợp implementations
- CoALA: position paper arXiv:2309.02427, không có reference implementation chính thức

### SillyTavern extensions tham khảo
- [city-unit/st-extension-example](https://github.com/city-unit/st-extension-example) — basic template
- [Mooooooon/silly-tavern-reminder](https://github.com/Mooooooon/silly-tavern-reminder) — cleanest real-world example
- [SillyTavern/Extension-Notebook](https://github.com/SillyTavern/Extension-Notebook) — official, dùng `writeExtensionField`
- [SillyTavern/Extension-Audio](https://github.com/SillyTavern/Extension-Audio) — official, có event handling

### ST docs local (đã có sẵn trong repo)
- `sillytavern-docs/For_Contributors/Writing-Extensions.md` — full extension API, đầy đủ
- `sillytavern-docs/extensions/index.md` — extension list

---

*Cập nhật cuối: 2026-06-08. Phần 1-3 của Antigravity giữ nguyên. Phần 4 Antigravity đã được verify + thay bằng mục 4 (ST Extension Patterns) giá trị thực tế hơn. Mục 5 (Verification Notes) là bài học cần nhớ. Mục 6-7 là bổ sung của Claude.*
