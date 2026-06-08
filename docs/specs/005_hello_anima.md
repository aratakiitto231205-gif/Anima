# Spec 005: Hello Anima (v0.11.1)

> **Stage:** Wire thật vào ST — verify ST + Anima chạy được trước khi build feature.
> **Phiên bản:** v0.11.1 (từ v0.11.0 skeleton đã archive)
> **Ngày:** 2026-06-09
> **Dựa trên:** [docs/research_st_extensions.md](../research_st_extensions.md) — 4 ST extension GitHub tham khảo.

---

## Mục tiêu

**Verify ST + Anima wire đúng.** Không có LLM call, không có feature, chỉ có:
1. Extension load được trong ST
2. Panel xuất hiện ở `#extensions_settings2`
3. Click gửi message trong chat → MESSAGE_RECEIVED fires → Anima log console

Đây là bước đã bị skip 4 lần trong quá khứ → dẫn tới archive hàng loạt. Lần này verify trước, build sau.

## Pattern tham khảo (copy trực tiếp)

Từ [city-unit/st-extension-example](https://github.com/city-unit/st-extension-example) (50 LOC template) — pattern chuẩn nhất cho extension nhỏ.

## File mới (4 file, tổng ~80 LOC)

```
manifest.json      # 12 dòng — metadata extension
index.js           # 50 dòng — entry point, jQuery boot, eventSource
panel.html         # 8 dòng — UI placeholder
style.css          # 10 dòng — minimal styling
```

## File cập nhật

- `package.json` — bump version `0.11.0` → `0.11.1`, name → `st-anima`

## Pattern cốt lõi

### 1. Manifest (đơn giản, 7 field)

```json
{
  "display_name": "Anima",
  "loading_order": 50,
  "requires": [],
  "optional": [],
  "js": "index.js",
  "css": "style.css",
  "author": "Anima Engine",
  "version": "0.11.1",
  "homePage": "https://github.com/anima-engine/st-anima"
}
```

`loading_order: 50` — sau ST core (~1-30), trước các extension nặng (Notebook 100, Audio 14).

### 2. Entry point (jQuery boot, defensive)

```js
import { eventSource, event_types } from "../../../../script.js";
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "st-anima";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = { enabled: true, messageCount: 0 };

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  $("#anima_enabled").prop("checked", extension_settings[extensionName].enabled);
  $("#anima_message_count").text(extension_settings[extensionName].messageCount);
}

function appendLog(text) {
  const $ul = $("#anima-log");
  $ul.append(`<li>${text}</li>`);
  // Cap log ở 20 dòng để tránh DOM nặng
  if ($ul.children().length > 20) $ul.children().first().remove();
}

function onMessageReceived(messageId) {
  if (!extension_settings[extensionName].enabled) return;
  const ctx = getContext();
  const msg = ctx.chat?.[messageId];
  if (!msg) return;
  extension_settings[extensionName].messageCount++;
  saveSettingsDebounced();
  $("#anima_message_count").text(extension_settings[extensionName].messageCount);
  appendLog(`#${messageId} ${msg.is_user ? "user" : "char"}: ${msg.mes?.slice(0, 40) || "(empty)"}`);
}

jQuery(async () => {
  try {
    const settingsHtml = await $.get(`${extensionFolderPath}/panel.html`);
    $("#extensions_settings2").append(settingsHtml);

    // Init settings UI events
    $("#anima_enabled").on("input", (e) => {
      extension_settings[extensionName].enabled = Boolean($(e.target).prop("checked"));
      saveSettingsDebounced();
    });

    // Load + render settings
    loadSettings();

    // Listen ST events
    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);

    appendLog("[anima] v0.11.1 loaded — wire OK");
    console.info("[st-anima] loaded, panel mounted to #extensions_settings2");
  } catch (err) {
    console.error("[st-anima] init failed:", err);
  }
});
```

### 3. Panel HTML (placeholder, không logic)

```html
<div id="anima-panel" class="anima-root">
  <div class="anima-header">
    <span class="anima-title">Anima v0.11.1</span>
    <label class="anima-toggle">
      <input type="checkbox" id="anima_enabled" />
      <span>enabled</span>
    </label>
  </div>
  <div class="anima-info">
    Messages received: <span id="anima_message_count">0</span>
  </div>
  <ul id="anima-log" class="anima-log"></ul>
</div>
```

### 4. CSS (minimal)

```css
.anima-root { padding: 8px; border: 1px solid #444; border-radius: 4px; margin: 4px 0; }
.anima-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.anima-title { font-weight: 600; }
.anima-info { font-size: 0.85em; color: #888; margin-bottom: 4px; }
.anima-log { list-style: none; padding: 0; margin: 0; max-height: 160px; overflow-y: auto; font-size: 0.8em; font-family: monospace; }
.anima-log li { padding: 2px 0; border-bottom: 1px solid #222; }
```

## Acceptance Criteria

1. ✅ Reload ST → extension load không error (check console `[st-anima] loaded`)
2. ✅ Mở Extensions drawer → panel "Anima v0.11.1" xuất hiện ở cột phải (`#extensions_settings2`)
3. ✅ Checkbox "enabled" hoạt động → reload giữ nguyên state
4. ✅ Send 1 message trong chat → `MESSAGE_RECEIVED` fires → log hiển thị `#0 user: ...`
5. ✅ Counter "Messages received" tăng lên 1

## Out of Scope (defer)

- ❌ LLM call thật (Scope B)
- ❌ Persona / character config (Scope C)
- ❌ State persistence beyond settings
- ❌ Memory, hormone, emotion, environment
- ❌ 3-agent architecture (GM/RP/AD)
- ❌ Tag parser
- ❌ Slash command
- ❌ Tests (chưa cần — verify thủ công trong ST)
- ❌ Vite/Vitest build — extension ST không cần bundler

## Verify (manual trong ST)

1. Copy folder `ST Anima/` → `SillyTavern/scripts/extensions/third-party/st-anima/`
2. Reload ST → mở Extensions drawer
3. Check panel "Anima" xuất hiện bên phải
4. Gửi 1 message trong chat → check counter + log
5. Toggle checkbox → reload → check state giữ

## Effort estimate

~1-2 giờ vibe code. Pattern copy từ 4 extension đã research.

## Lessons đã học (từ archive 4 lần trước)

- **Verify wire ST TRƯỚC khi build feature** — skip bước này = polish trên nền chưa verify
- **4 file tối đa cho scope đầu** — không cần test framework, không cần build tool
- **Defensive init** — try/catch quanh boot, đừng để 1 lỗi khiến cả ext chết
- **Counter + log cho verify** — proof rằng eventSource wire đúng, không cần LLM
- **`getContext()` mỗi handler** — không cache (theo Audio pattern)
- **`#extensions_settings2`** cho visual UI (theo template guide + reminder pattern)

---

*Khi scope A chạy được trong ST thật → mới sang Scope B.*
