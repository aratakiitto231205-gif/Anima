# Research: ST Extension Patterns thực tế từ GitHub

> **Ngày research:** 2026-06-08
> **Mục đích:** Trước khi viết scope mới cho ST Anima, verify pattern thật sự được dùng trong 4 extension tham khảo (1 template + 1 real-world + 2 official). Không suy luận, không textbook — chỉ raw code từ repo.
>
> **Phương pháp:** Pull raw `index.js` + `manifest.json` qua `raw.githubusercontent.com`. Phân tích trực tiếp.

---

## 1. So sánh nhanh 4 extension

| Extension | Loại | LOC index.js | Dùng getContext? | Dùng eventSource? | Storage | Slash command |
|---|---|---|---|---|---|---|
| **st-extension-example** | Template (city-unit) | ~50 | ✅ | ❌ | `extensionSettings` | ❌ |
| **silly-tavern-reminder** | Real-world (Mooooooon) | ~900 | ❌ (chỉ notification) | ✅ | `extensionSettings` | ❌ |
| **Extension-Notebook** | Official (Cohee1207) | ~90 | ✅ `SillyTavern.getContext()` | ❌ | localStorage (Quill) | ✅ `/notebook` |
| **Extension-Audio** | Official (Keij, Deffcolony) | ~700 | ✅ | ✅ (qua `ModuleWorkerWrapper` + `setInterval`) | `extension_settings.audio` + fetch `/api/assets/*` | ✅ `/music`, `/ambient` |

**Pattern thật sự được dùng (4/4):**
- ✅ `jQuery(async () => { ... })` boot wrapper
- ✅ `extension_settings[extensionName]` + `saveSettingsDebounced()` cho settings
- ✅ `await $.get()` load HTML + append to `#extensions_settings` hoặc `#extensions_settings2`
- ✅ Dùng jQuery cho DOM (`#extensions_settings2`, `on('input', ...)`, `prop('checked', ...)`)
- ✅ jQuery + native DOM API mix

**Pattern ít/hiếm:**
- ⚠️ `eventSource.on()` — chỉ 1/4 dùng trực tiếp (reminder)
- ⚠️ `getContext()` destructure — 1/4 (Audio), 1/4 (Notebook dùng `SillyTavern.getContext()`)
- ⚠️ `registerSlashCommand` — 2/4 (Notebook, Audio dùng `SlashCommandParser` mới)
- ⚠️ React/Vue framework — 1/4 (Notebook dùng React)
- ⚠️ Webpack build — 1/4 (Notebook có `dist/`)
- ⚠️ Module worker polling — 1/4 (Audio)

---

## 2. Phân tích chi tiết từng extension

### 2.1 st-extension-example (Template)

**Stack:** jQuery + native, không framework. 50 LOC. **Entry point mặc định** để tham khảo cấu trúc.

**Manifest tối giản:**
```json
{
  "display_name": "Name Displayed in SillyTavern",
  "loading_order": 9,
  "requires": [],
  "optional": [],
  "js": "index.js",
  "css": "style.css",
  "author": "yourNameHere",
  "version": "1.0.0",
  "homePage": "yourUrlHere"
}
```

**Index.js (50 LOC, thật):**
```js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "st-extension-example";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {};

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
}

function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
  $("#extensions_settings").append(settingsHtml);
  $("#my_button").on("click", onButtonClick);
  $("#example_setting").on("input", onExampleInput);
  loadSettings();
});
```

**Bài học:**
- **Import path quan trọng:** `../../../extensions.js` (3 lên) + `../../../../script.js` (4 lên) — vì extension nằm trong `scripts/extensions/third-party/<name>/`.
- **Folder path constant:** `scripts/extensions/third-party/${extensionName}` — dùng để load HTML/CSS bằng `$.get()`.
- **UI mount:** append vào `#extensions_settings` (cột trái — system functions) hoặc `#extensions_settings2` (cột phải — visual/UI). Template này dùng trái.
- **Settings round-trip:** load → render → on change → save. Pattern chuẩn, copy-paste được.

**Không dùng:** `eventSource`, `getContext()` (chỉ import), không có event flow.

---

### 2.2 silly-tavern-reminder (Real-world, 900 LOC)

**Stack:** jQuery + native, không framework. **Lớn nhất trong 4** vì handle nhiều edge case (mobile Chrome 136, ServiceWorker, iOS detection).

**Manifest:**
```json
{
  "display_name": "酒馆消息提醒",
  "loading_order": 9,
  "requires": [],
  "optional": [],
  "js": "index.js",
  "css": "style.css",
  "author": "司马咩咩",
  "version": "1.1",
  "homePage": "https://github.com/Mooooooon"
}
```

**Index.js — Pattern dùng `eventSource`:**
```js
import { extension_settings } from '../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';

const extensionName = 'silly-tavern-reminder';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const MessageHandler = {
  shouldSendReminder() {
    return document.hidden || (!document.hidden && !document.hasFocus());
  },
  async handleIncomingMessage(data) {
    if (!this.shouldSendReminder()) return;
    if (extension_settings[extensionName].enableReminder) TitleFlashManager.start();
    if (extension_settings[extensionName].enableNotification) await NotificationManager.send();
  },
};

eventSource.on(event_types.MESSAGE_RECEIVED, MessageHandler.handleIncomingMessage.bind(MessageHandler));
```

**Boot pattern (cuối file):**
```js
jQuery(() => InitManager.init());
```

**Init manager (entry thật):**
```js
const InitManager = {
  async init() {
    ErrorHandler.init();
    const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
    $('#extensions_settings2').append(settingsHtml);
    // ... bind events, load settings
  },
};
```

**Bài học:**
- **Class-based organization:** `NotificationManager`, `TitleFlashManager`, `SettingsManager`, `EventHandler`, `MessageHandler` — không có class thật, dùng object literal.
- **`eventSource.on(event_types.MESSAGE_RECEIVED, handler.bind(handler))`** — bind vì handler là method trong object.
- **UI mount vào `#extensions_settings2`** (cột phải — visual/UI, đúng theo guide của template).
- **Có error handler global** (`unhandledrejection`, `error`) — defensive.
- **Detect environment** (mobile, HTTPS, browser version) trước khi enable feature.

**Trade-off:** Code rất dài (900 LOC) vì handle quá nhiều edge case. Cho Anima, **không nên copy pattern này** — overkill cho extension tầm trung.

---

### 2.3 Extension-Notebook (Official, 90 LOC + React)

**Stack:** React 18 + `SillyTavern.getContext()` cho API. **Đẹp nhất về pattern** vì official, code clean, dùng React.

**Manifest:**
```json
{
  "display_name": "Notebook",
  "loading_order": 100,
  "requires": [],
  "optional": [],
  "js": "dist/index.js",
  "css": "",
  "author": "Cohee1207",
  "version": "1.0.0",
  "homePage": "https://github.com/SillyTavern/Extension-Notebook",
  "auto_update": true
}
```

**Index.js (thật, dùng React):**
```js
/* global SillyTavern */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { importFromUrl } from './util.js';

const { registerSlashCommand } = SillyTavern.getContext();

// Mount button vào wand menu (icon trên thanh chat bar)
const buttonContainer = document.getElementById('notebook_wand_container') ?? document.getElementById('extensionsMenu');
const buttonElement = document.createElement('div');
// ... set icon, text, id, classes
buttonContainer.appendChild(buttonElement);

// Mount root drawer panel
const rootElement = document.getElementById('movingDivs');
const rootContainer = document.createElement('div');
rootElement.appendChild(rootContainer);
rootContainer.id = 'notebookPanel';
rootContainer.classList.add('drawer-content', 'flexGap5');

// React render vào rootContainer
const root = ReactDOM.createRoot(rootContainer);
root.render(<React.StrictMode><App onCloseClicked={closePanel} /></React.StrictMode>);

// Register slash command
try {
  registerSlashCommand('notebook', () => buttonElement.click(), ['nb'], 'Toggle the notebook display.');
} catch (err) {
  console.error('Failed to register notebook command', err);
}
```

**Bài học:**
- **`SillyTavern.getContext()` destructure** — official dùng `const { registerSlashCommand } = SillyTavern.getContext();` thay vì import path từ `extensions.js`.
- **UI mount linh hoạt:** button vào `notebook_wand_container` (trên thanh chat) hoặc fallback `extensionsMenu`. Panel drawer vào `movingDivs` (container cho các panel trượt).
- **Register slash command qua `getContext()`** — `registerSlashCommand('notebook', callback, aliases, helpString)`. Catch error vì có thể fail.
- **Clipboard event listener** — extension customize behavior của ST qua native DOM events.
- **Webpack build** — source trong `src/`, output trong `dist/`. `auto_update: true` cho phép ST auto-update.
- **`importFromUrl`** — function lấy giá trị từ ST scripts (vd: `animation_duration`) mà không cần import trực tiếp.

**Trade-off cho Anima:** React + Webpack là overkill nếu chỉ cần 1-2 panel. **Có thể dùng vanilla JS + jQuery** như template. **Có thể copy pattern mount UI** (wand menu, drawer, registerSlashCommand).

---

### 2.4 Extension-Audio (Official, 700 LOC, complex nhất)

**Stack:** jQuery + native + `ModuleWorkerWrapper` + `SlashCommandParser` mới. **Event-driven nhiều nhất** trong 4.

**Manifest:**
```json
{
  "display_name": "Dynamic Audio",
  "loading_order": 14,
  "requires": [],
  "optional": ["classify"],
  "js": "index.js",
  "css": "style.css",
  "author": "Keij#6795 and Deffcolony",
  "version": "0.1.0",
  "homePage": "https://github.com/SillyTavern/Extension-Audio",
  "auto_update": true
}
```

**Index.js — Pattern nâng cao:**
```js
import { saveSettingsDebounced, getRequestHeaders } from '../../../../script.js';
import { getContext, extension_settings, ModuleWorkerWrapper } from '../../../extensions.js';
import { isDataURL } from '../../../utils.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandArgument } from '../../../slash-commands/SlashCommandArgument.js';
// ... slash command stuff

const extensionName = 'Extension-Audio';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Module worker pattern — polling loop
async function moduleWorker() {
  const moduleEnabled = extension_settings.audio.enabled;
  if (!moduleEnabled) return;
  // ... update bgm, ambient, character-specific audio
  const context = getContext();
  if (context.chat.length == 0) return;
  // ... check chatId, character, expression, switch bgm
}

// Boot
jQuery(async () => {
  const windowHtml = $(await $.get(`${extensionFolderPath}/window.html`));
  $('#extensions_settings').append(windowHtml);
  loadSettings();
  // ... bind events

  // Polling loop với wrapper
  const wrapper = new ModuleWorkerWrapper(moduleWorker);
  setInterval(wrapper.update.bind(wrapper), UPDATE_INTERVAL);
  moduleWorker();

  // Slash command mới (parser-based)
  SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'music',
    aliases: ['bgm'],
    helpString: 'Force change of bgm for given file.',
    callback: setBGMSlashCommand,
    unnamedArgumentList: [
      SlashCommandArgument.fromProps({
        description: 'file path',
        isRequired: true,
        acceptsMultiple: false,
        enumProvider: () => Array.from(...).map(...),
      }),
    ],
  }));
});
```

**Bài học:**
- **`getContext()` từ `../../../extensions.js`** — destructured từ extensions.js, không phải `SillyTavern.getContext()`.
- **`ModuleWorkerWrapper`** — wrapper cho polling loop. Có thể dùng cho background tickers.
- **Polling bằng `setInterval(wrapper.update, 1000)`** — không dùng `eventSource` ở đây vì cần check nhiều state (chatId, character, expression) liên tục.
- **`getRequestHeaders()`** — lấy headers cho fetch API. Dùng khi gọi `/api/assets/*` (ST server endpoints).
- **Slash command mới (`SlashCommandParser`)** — dùng class-based thay vì `registerSlashCommand` đơn giản. Support argument validation, enum provider, aliases.
- **`isDataURL()` từ `../../../utils.js`** — dùng helper của ST.
- **`isMobile()` từ `../../../RossAscends-mods.js`** — ST có sẵn, không cần tự detect.
- **Update UI từ module worker** — `fillBGMSelect()` mutate DOM từ polling loop. Cẩn thận race condition nếu DOM chưa ready.

**Trade-off:** Pattern polling này tốt cho "check state mỗi N giây". **KHÔNG phù hợp cho event-driven** (MESSAGE_RECEIVED) — dùng `eventSource` cho cái đó.

---

## 3. Tổng hợp Pattern → Quyết định cho Anima

### 3.1 Pattern NÊN dùng (4/4 confirm)

| Pattern | Dùng cho | Code ref |
|---|---|---|
| `jQuery(async () => { ... })` boot | Init toàn bộ extension | Tất cả 4 |
| `extension_settings[extensionName]` + `saveSettingsDebounced()` | Lưu config (small JSON) | Tất cả 4 |
| `await $.get(folder + '.html')` + append | Load UI panel | Tất cả 4 |
| Append to `#extensions_settings` (trái) hoặc `#extensions_settings2` (phải) | Mount settings panel | 3/4 (template, reminder, audio) |
| Import path `../../../extensions.js` + `../../../../script.js` | Lấy ST globals | 3/4 (template, reminder, audio) |
| `const extensionName = ...; const extensionFolderPath = ...` | Constants cho path | Tất cả 4 |
| `Object.assign(settings, defaultSettings)` khi empty | Init default | Tất cả 4 |

### 3.2 Pattern NÊN dùng (2/4 confirm, có chọn lọc)

| Pattern | Dùng cho | Code ref |
|---|---|---|
| `SillyTavern.getContext()` destructure | API hiện đại (registerSlashCommand, eventSource) | Notebook |
| `eventSource.on(event_types.MESSAGE_RECEIVED, handler)` | React to chat events | Reminder |
| `registerSlashCommand(name, fn, aliases, help)` | Đơn giản slash command | Notebook |
| `getContext()` từ `extensions.js` | Lấy `chat`, `characters`, `characterId` | Audio |
| Manifest `loading_order` 10-100 | Điều khiển thứ tự load | Tất cả 4 (range 9-100) |
| Manifest `auto_update: true` | Cho phép ST tự update | Notebook, Audio |

### 3.3 Pattern KHÔNG nên dùng (chưa cần)

| Pattern | Lý do tránh | Khi nào cần |
|---|---|---|
| React + Webpack build | Overhead lớn cho extension nhỏ | Khi UI phức tạp như Notebook (editor) |
| `ModuleWorkerWrapper` + `setInterval` polling | Tốn CPU, race condition | Khi cần check state liên tục (audio switching) |
| `SlashCommandParser` mới (class-based) | Phức tạp hơn `registerSlashCommand` | Khi cần argument validation, enum |
| `localforage` / IndexedDB | Quá nặng cho settings | Khi lưu memory lớn (vector store) |
| `writeExtensionField` | Per-character storage | Khi cần data riêng theo character card |
| ServiceWorker | Mobile notification workaround | Khi extension cần push notification |

### 3.4 Pattern PHẢI tránh (code smell từ reminder)

- ❌ **900 LOC cho 1 feature đơn giản** (title flash + notification) — quá nhiều edge case handling.
- ❌ **`document.title` mutation trực tiếp** — conflict với ST UI.
- ❌ **Global error handler spam notification** — anti-pattern.
- ❌ **Hardcoded Chrome 136 detection** — fragile.

---

## 4. Mapping pattern → Scope Anima

### Bài học cốt lõi cho Anima v0.11.x:

1. **Extension ST = jQuery + native, không cần framework.** Vanilla JS đủ dùng. React chỉ khi UI cực phức tạp.
2. **Settings = `extension_settings[extensionName]`.** KHÔNG cần `localforage` cho config.
3. **UI mount linh hoạt:** settings panel → `#extensions_settings2` (cột phải). Floating widget → tự tạo DOM + append to `body`. Wand menu button → `notebook_wand_container ?? extensionsMenu`.
4. **`eventSource.on()`** cho event-driven (MESSAGE_RECEIVED, CHAT_CHANGED, GENERATION_ENDED).
5. **`getContext()`** lấy chat, characters, characterId. KHÔNG cache — gọi fresh mỗi handler.
6. **Slash command** qua `registerSlashCommand()` (đơn giản) hoặc `SlashCommandParser` (nâng cao).
7. **Polling loop** chỉ khi CẦN check state liên tục (audio). KHÔNG dùng cho Anima core — quá tốn CPU.
8. **Class-based organization** (object literal) — KHÔNG cần ES6 class thật, function cũng được.
9. **Defensive boot** — try/catch quanh từng bước init, đừng để 1 lỗi khiến cả extension chết.
10. **Manifest đơn giản** — `display_name`, `loading_order`, `js`, `css`, `author`, `version`, `homePage`. Optional: `requires`, `optional`, `auto_update`.

---

## 5. Đề xuất scope Anima mới (CHƯA build, chỉ propose)

> Dựa trên research này, em đề xuất scope tối thiểu. **Cưng review rồi quyết.**

### Scope A: "Hello Anima" — wire thật 1 loop

**Mục tiêu:** Verify Anima wire đúng vào ST trước khi build feature.

**File mới:**
- `manifest.json` — `display_name: "Anima"`, `loading_order: 50`, `js: "index.js"`, `css: "style.css"`
- `index.js` (~80 LOC) — boot, append panel placeholder, listen MESSAGE_RECEIVED, log msg count
- `panel.html` — 1 div `<div id="anima-panel">Anima v0.11.x — Hello from ST</div>`
- `style.css` — minimal styling cho panel

**Mount:** append `panel.html` vào `#extensions_settings2` (cột phải, visual UI theo template guide).

**Test:** Reload ST → check panel xuất hiện → send message → check console log.

**Out of scope:**
- ❌ 3-agent architecture (GM/RP/AD)
- ❌ LLM call thật
- ❌ State persistence
- ❌ Memory, hormone, emotion
- ❌ Slash command (chưa cần)

**Effort:** 1-2 giờ vibe code.

---

### Scope B: "Anima + 1 LLM loop" — minimal working feature

**Mục tiêu:** 1 message loop hoàn chỉnh: user gõ → Anima forward tới LLM → display.

**File mới (ngoài Scope A):**
- `index.js` thêm: intercept MESSAGE_SENT, log user text, không gọi LLM thật (chỉ echo lại)
- `panel.html` thêm: `<div id="anima-messages">` hiển thị log messages

**Test:** User gõ "hello" → panel log "user: hello" → message rendered → MESSAGE_RECEIVED fires → panel log "received: ..."

**Out of scope:** tương tự Scope A + thêm ❌ tag parser, ❌ character injection.

**Effort:** 3-4 giờ.

---

### Scope C: "Anima settings + 1 persona override"

**Mục tiêu:** Config qua extension settings + 1 persona tweak.

**File mới (ngoài Scope B):**
- `defaultSettings = { persona: "itto", enabled: true }`
- Settings UI: 1 dropdown chọn persona (từ `characters/` folder)
- `eventSource.on(CHAT_CHANGED, reload persona)`

**Test:** Đổi persona trong settings → switch chat → check reload.

**Out of scope:** ❌ multi-character orchestration, ❌ per-character memory.

**Effort:** 5-6 giờ.

---

### Em khuyến nghị: BẮT ĐẦU TỪ SCOPE A.

Lý do:
- Scope A verify wire ST hoạt động (quan trọng nhất, đã bị archive 4 lần vì skip bước này)
- Không có LLM call → không tốn API budget
- Pattern copy trực tiếp từ `st-extension-example` (template) — không overthink
- 1-2 giờ là có prototype chạy thật trong ST

Sau khi Scope A chạy được → mới quyết định Scope B/C.

---

## 6. Anti-patterns đã học (để tránh lặp lại)

1. **Đừng skip bước "wire ST thật"** — đã archive 4 lần vì build agent architecture mà chưa verify ST có chạy đúng.
2. **Đừng build 3-agent trước** — quá abstract cho sketch. Pattern thật: extension nhỏ, 1 loop, build dần.
3. **Đừng dùng `console.*` rải rác** — pattern chuẩn là `console.debug(prefix, ...)` cho debug, không log spam.
4. **Đừng dùng polling `setInterval` cho event-driven** — `eventSource.on()` đúng pattern hơn.
5. **Đừng build React cho extension < 500 LOC UI** — vanilla + jQuery đủ.
6. **Đừng hardcode ST version check** — dùng `SillyTavern.getContext()` API stable.
7. **Đừng build 18 file + 145 tests cho 1 feature** — Scope A chỉ cần 4 file, 0 tests (sẽ thêm khi cần).

---

## 7. Nguồn tham khảo

- [city-unit/st-extension-example](https://github.com/city-unit/st-extension-example) — 50 LOC template
- [Mooooooon/silly-tavern-reminder](https://github.com/Mooooooon/silly-tavern-reminder) — 900 LOC real-world (eventSource pattern)
- [SillyTavern/Extension-Notebook](https://github.com/SillyTavern/Extension-Notebook) — 90 LOC + React (UI mount + slash command)
- [SillyTavern/Extension-Audio](https://github.com/SillyTavern/Extension-Audio) — 700 LOC official (polling + slash command nâng cao)
- [SillyTavern/For_Contributors/Writing-Extensions.md](file:///c:/Users/DMX%20HUNG%20HOA/Desktop/ST%20Anima/sillytavern-docs/For_Contributors/Writing-Extensions.md) — ST official docs

---

*Cập nhật cuối: 2026-06-08. Mọi claim đều verify qua raw code, không suy luận. Mục 3-5 là đề xuất, cần user duyệt trước khi build.*
