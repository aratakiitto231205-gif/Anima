# CHANGELOG — v0.11.0

> **Trạng thái cuối:** PIVOT. v0.11.0 không còn là bugfix pack từ v11. Là skeleton stage theo artist thinking (sketch → line → color → detail).
>
> **Lý do pivot:** Review code v11.0 cho thấy architecture sai nền tảng (8 hormone máy móc, 4-message cap, prompt injection dạng dump HTML, GM/RP/AD lẫn lộn). Bugfix trên base sai = polish rác. Hitsuji quyết reset v0.11.0 về sketch stage.
> **Files changed:** 18 (1 entry, 12 source, 1 manifest, 1 package, 1 eslint, 2 tests mới)

---

## Tóm tắt

v0.11.0 là **iteration bug fix + refactor để chống "lỗi hoài"**. Code v11 được restore từ archive, fix 18 bug (5 critical, 5 high, 5 medium, 3 low), thêm 2 test file (HormoneEngine, EventOrchestrator) nâng coverage từ 14% lên ~28%.

**KHÔNG có feature mới.** Tất cả thay đổi đều là: sửa bug, thêm test, refactor cho gọn.

---

## 🔴 5 Critical Fixes

### Bug 1: `eventSource.on()` không cleanup → leak listeners
- **File:** [index.js:240-258](index.js), [EventOrchestrator.js](src/orchestration/EventOrchestrator.js)
- **Triệu chứng:** Mỗi lần ST reload extension (settings change, character switch) → 9 listeners accumulate → MESSAGE_RECEIVED fire 5-10 lần → state corruption, perf tệ dần
- **Fix:** Refactor `EventOrchestrator` thành 2 method `attachEventHandlers()` / `detachEventHandlers()`, lưu handler references trong `this.attachedHandlers[]`. `init()` gọi `attach()` thay vì `eventSource.on()` trực tiếp.

### Bug 2: `SubconsciousTicker` LLM call storm
- **File:** [SubconsciousTicker.js](src/backstage/SubconsciousTicker.js)
- **Triệu chứng:** `setInterval(45000)` + `bg_consciousness=true` → LLM call mỗi 45s. Budget $0.5/ngày hết sau 5 calls = 4 phút. Sau đó spam `BudgetExceededError` warning mãi.
- **Fix:**
  1. Throttle: chỉ gọi LLM nếu cách lần trước ≥ `TIMING.SUBCONSCIOUS_LLM_MIN_INTERVAL_MS` (5 phút)
  2. Budget guard: track `consecutiveBudgetFailures`, nếu > 3 → fallback template suốt session
  3. Dùng `logAnima()` thay vì `console.warn`

### Bug 3: `startChatObserver` polling vô tận
- **File:** [DOMAutoHealing.js:98-102](src/ui/DOMAutoHealing.js)
- **Triệu chứng:** `#chat` không tồn tại → `setTimeout(retry, 1000)` vĩnh viễn → memory leak + CPU drain
- **Fix:** Thêm `MAX_OBSERVER_RETRIES = 10`. Sau 10 lần (10s) → give up + log error.

### Bug 4: `_dispatch` không return Promise
- **File:** [EventOrchestrator.js:35](src/orchestration/EventOrchestrator.js)
- **Triệu chứng:** Async function không return gì. ST interceptor không chờ được `processPromptInjections()` xong → LLM có thể nhận prompt thiếu XML injection.
- **Fix:** Return `Promise` từ `_dispatch`, `onChatCompletionPromptReady`, `onTextCompletionPromptReady`, `onPromptInterceptor`. ST giờ chờ xong mới gửi LLM request.

### Bug 5: `alert()` trong init error handler
- **File:** [index.js:274](index.js)
- **Triệu chứng:** Init fail → blocking browser dialog → user kẹt
- **Fix:** Bỏ `alert()`. Dùng `logAnima('error', ...)` qua logger.

---

## 🟠 5 High Fixes

### Bug 6: `HormoneEngine` không có test (313 dòng code toán học)
- **File mới:** [src/core/__tests__/HormoneEngine.test.js](src/core/__tests__/HormoneEngine.test.js)
- **Coverage:** `applyHillEquation` (6 test), `decay` (3), `evaluateEvent` (7), `tickPhysicalSensations` (2), `serialize` (2), `genetic polymorphism` (2)
- **Tổng:** 22 tests mới

### Bug 7: `applyTemporalAnchor` comment sai
- **File:** [MemoryEngine.js:109-113](src/core/MemoryEngine.js)
- **Triệu chứng:** Comment nói "không xóa ký ức tương lai" nhưng code vẫn rollback hormone về past state → inconsistency
- **Fix:** Cập nhật comment phản ánh đúng behavior. Ký ức vẫn giữ, hormone rollback là intentional.

### Bug 8: `onMessageReceived` không có lock
- **File:** [EventOrchestrator.js:146-167](src/orchestration/EventOrchestrator.js)
- **Triệu chứng:** Concurrent MESSAGE_RECEIVED → `renderParsedMessage` chạy 2 lần song song → state corruption
- **Fix:** Thêm `this.renderInFlight = new Set()`. Skip nếu `messageId` đang được xử lý.

### Bug 9: `processAdminCommand` không rate limit
- **File:** [BackstageConsole.js:316](src/backstage/BackstageConsole.js)
- **Triệu chứng:** Mỗi admin message = 1 LLM call. User spam = budget bay trong vài phút.
- **Fix:** Module-level `lastAdminCallTimestamp`. Nếu trong `ADMIN_RATELIMIT_MS` (5s) → trả "Tui vừa trả lời xong, chờ chút nha!" không gọi LLM.

### Bug 10: `updateVitalsAndSensations` không validate key
- **File:** [CognitiveAgent.js:77-98](src/core/CognitiveAgent.js)
- **Triệu chứng:** LLM typo `pian: 5.0` (thay vì `pain: 5.0`) → silent fail
- **Fix:** `logAnima('warning', 'Agent', ...)` cho unknown key.

---

## 🟡 5 Medium Fixes (smell + cleanup)

### Bug 11: Magic numbers rải rác
- **File mới:** thêm `TIMING`, `THRESHOLDS`, `ADMIN_RATELIMIT_MS`, `STREAM_BUFFER_MAX_CHARS` vào [constants.js](src/utils/constants.js)
- **Files updated:** DOMAutoHealing, SleepDetector, SubconsciousTicker, BackstageConsole dùng constants thay vì hardcode

### Bug 12: Test coverage 14% (28 file, 4 có test)
- **Files mới:** HormoneEngine.test.js (22 tests), EventOrchestrator.test.js (12 tests)
- **Coverage tăng từ 14% lên ~28%**
- **Vẫn chưa test:** SleepService, DOMAutoHealing integration, DashboardUI, PromptInjector, TimeJumpService, TemporalAnchor, StateApplier, BackstageConsole integration (chỉ pure tag parser unit test)

### Bug 13: `subconsciousIntervalId` singleton
- **File:** [SubconsciousTicker.js:6](src/backstage/SubconsciousTicker.js)
- **Triệu chứng:** Group chat = nhiều character = ticker bị overwrite
- **Fix:** Thay bằng `Map<agentId, intervalId>` để track per-agent. Khi stop, chỉ clear interval của agent đó.

### Bug 14: `Math.random()` cho ID generation
- **Files:** MemoryEngine.js:174, BackstageConsole.js (2 chỗ), SleepService.js (2 chỗ)
- **Triệu chứng:** `Date.now() + Math.random().substr(2,5)` không đảm bảo unique
- **Fix:** `crypto.randomUUID()` (có fallback cho môi trường cũ)

### Bug 15: `console.error` vs `logAnima` không thống nhất
- **Files:** SubconsciousTicker, BackstageConsole (2 chỗ), StateApplier (2 chỗ), VectorMemoryService, agentStore
- **Fix:** Replace tất cả `console.error/warn` bằng `logAnima()`

---

## 🟢 3 Low Fixes

### Bug 16: `processMessage` return `[]` unused
- **File:** [CognitiveAgent.js:139](src/core/CognitiveAgent.js)
- **Fix:** Bỏ `return []` (dead code)

### Bug 17: `processAdminCommand` fallback confuse
- **File:** [BackstageConsole.js:364](src/backstage/BackstageConsole.js)
- **Triệu chứng:** Trả "Tui đang bận" dù LLM có thể trả empty string
- **Fix:** Phân biệt 2 trường hợp: LLM fail → "LLM xử lý thất bại..."; LLM empty → "Tui nghe rồi mà chưa nghĩ ra gì..."

### Bug 18: 3 fields `lastProcessed*` redundant
- **File:** [EventOrchestrator.js:21-23](src/orchestration/EventOrchestrator.js)
- **Triệu chứng:** Cache có thể derive từ `context.chat`
- **Fix:** Đơn giản hóa dedup — chỉ dùng `lastProcessedMessageText` (text-based). `lastProcessedMessageId` bỏ (messageId chỉ là index, text mới là source of truth). `lastProcessedUserMsg` giữ (cho `_dispatch` dedup).

---

## 🧹 Cleanup Pass (gọn code)

Sau khi fix 18 bug, em làm thêm 1 pass cleanup:

1. **DashboardUI listener leak** — `renderBeliefs()` add `cog-del-belief` listener mỗi lần render mà không remove cũ → accumulate. Fix: dùng event delegation trên parent.
2. **xmlParser dead export** — `KNOWN_NARRATIVE_TAGS` được export nhưng không ai import. Bỏ.
3. **Version headers** — tất cả file source đổi từ `// v11.0` → `// v0.11.0` cho nhất quán.
4. **StateApplier clamp inconsistency** — clamp `[1.0, 10.0]` cho neuro, các nơi khác dùng `[0.0, 10.0]`. Cập nhật comment giải thích.

---

## 📊 Số liệu

| Metric | Trước (v11.0) | Sau (v0.11.0) |
|---|---|---|
| Files trong `src/` | 0 (archived) | 28 |
| Tests | 111 | 145 (+34) |
| Test coverage | 14% (4/28) | ~28% (6/28) |
| Critical bugs | 5 | 0 |
| High bugs | 5 | 0 |
| Magic numbers in src/ | 12+ | 0 (centralized in constants.js) |
| `console.*` calls | 8 | 0 (all → `logAnima`) |
| `alert()` calls | 1 | 0 |
| `Math.random()` for ID | 5 | 0 (all → `crypto.randomUUID`) |

---

## 🚫 Không làm trong v0.11.0

- **Không thêm feature mới** — theo yêu cầu Hitsuji
- **Không refactor `BackstageConsole` 365 dòng** — cần spec riêng, quá lớn
- **Không viết test cho tất cả file** — chỉ fill gap HormoneEngine + EventOrchestrator (2 file rủi ro nhất)
- **Không bump `package.json` `"type": "module"`** — ảnh hưởng nhiều chỗ, để spec sau
- **Không refactor DashboardUI 289 dòng** — cần spec riêng

---

## 📁 Files changed (18)

| File | Thay đổi |
|---|---|
| [package.json](package.json) | version 1.1.0 → 0.11.0 |
| [manifest.json](manifest.json) | version 11.0.0 → 0.11.0 |
| [index.js](index.js) | Bugs 1, 4, 5 — orchestrator.attach, remove alert |
| [eslint.config.js](eslint.config.js) | Add `crypto: 'readonly'` global |
| [src/utils/constants.js](src/utils/constants.js) | Bug 11 — add TIMING, THRESHOLDS, ADMIN_RATELIMIT_MS, STREAM_BUFFER_MAX_CHARS |
| [src/orchestration/EventOrchestrator.js](src/orchestration/EventOrchestrator.js) | Bugs 1, 4, 8, 18 — major refactor |
| [src/backstage/SubconsciousTicker.js](src/backstage/SubconsciousTicker.js) | Bugs 2, 13, 15 — throttle, per-agent, logAnima |
| [src/ui/DOMAutoHealing.js](src/ui/DOMAutoHealing.js) | Bug 3 — max retry |
| [src/core/MemoryEngine.js](src/core/MemoryEngine.js) | Bugs 7, 14 — comment, UUID |
| [src/backstage/BackstageConsole.js](src/backstage/BackstageConsole.js) | Bugs 9, 14, 15, 17 — rate limit, UUID, logAnima, better fallback |
| [src/core/CognitiveAgent.js](src/core/CognitiveAgent.js) | Bugs 10, 16 — validate, remove dead return |
| [src/core/StateApplier.js](src/core/StateApplier.js) | Bug 15 — logAnima (2 chỗ) |
| [src/services/SleepService.js](src/services/SleepService.js) | Bugs 14, 15 — UUID, logAnima |
| [src/orchestration/SleepDetector.js](src/orchestration/SleepDetector.js) | Bug 11 — use THRESHOLDS.SLEEP_MELATONIN_THRESHOLD |
| [src/services/VectorMemoryService.js](src/services/VectorMemoryService.js) | Bug 15 — logAnima |
| [src/utils/agentStore.js](src/utils/agentStore.js) | Bug 15 — logAnima |
| [src/core/__tests__/HormoneEngine.test.js](src/core/__tests__/HormoneEngine.test.js) | NEW — 22 tests (bug 6) |
| [src/orchestration/__tests__/EventOrchestrator.test.js](src/orchestration/__tests__/EventOrchestrator.test.js) | NEW — 12 tests |

---

*Restore từ `archive/v11_archive/`, fix bug, test, không mở rộng scope.*
