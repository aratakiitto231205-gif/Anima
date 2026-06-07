# Spec 003 — v11.0: Bugfix + Cleanup + Rewrite

> **Status:** Draft, awaiting Hitsuji greenlight
> **Author:** Claude (review)
> **Date:** 2026-06-07
> **Source:** `Notes_260607_032156.docx` (playtest feedback) + Hitsuji directive "code bừa bộn, viết lại tốt hơn chắp vá"
> **Target version:** **v11.0** (bump từ v10.0)
> **Approach:** **REWRITE** 6 file có code smell nặng + **PATCH** 4 file có bug focused. Không patch chắp vá.
> **Backup:** Hitsuji confirmed có backup + git log đầy đủ các version trước.

---

## Tổng quan

| Block | Loại | File | Lý do |
|---|---|---|---|
| 1 | **New file** | `src/utils/logger.js` | Tách 100 dòng log từ `index.js` |
| 2 | **New file** | `src/utils/agentStore.js` | Tách 50 dòng state management từ `index.js` |
| 3 | **New file** | `src/utils/xmlParser.js` | Tách 50 dòng regex chuỗi từ `DOMAutoHealing.parseXmlTags` |
| 4 | **New file** | `src/utils/constants.js` | `KNOWN_XML_TAGS`, `AVAILABLE_TOOLS` (centralized) |
| 5 | **New file** | `src/core/MentalStateEngine.js` | Tách 165 dòng emotion table từ `CognitiveAgent.updateDynamicMentalState` |
| 6 | **REWRITE** | `src/core/CognitiveAgent.js` (400→280) | Dùng MentalStateEngine, gọn hơn |
| 7 | **REWRITE** | `src/services/SleepService.js` (148→120) | Tách 7 concerns thành helpers |
| 8 | **PATCH** | `src/core/MemoryEngine.js` (189→200) | Thêm `findNewestMemory(agent)` |
| 9 | **PATCH** | `src/core/ConsciousnessEngine.js` (29→30) | Default `bg_consciousness = true` |
| 10 | **PATCH** | `src/cognitive/ADAgent.js` (119→130) | Bỏ max_tokens, init config, JSON bug |
| 11 | **PATCH** | `src/cognitive/ad-prompt.js` (20→35) | Thêm schema example + anti-roleplay |
| 12 | **REWRITE** | `src/orchestration/EventOrchestrator.js` (238→130) | Bỏ 70 dòng duplicate |
| 13 | **REWRITE** | `src/backstage/BackstageConsole.js` (301→200) | Tách parsers, declarative |
| 14 | **REWRITE** | `src/ui/DOMAutoHealing.js` (343→250) | Tách parse/apply/render |
| 15 | **PATCH** | `src/ui/DashboardUI.js` (262→280) | Tách `render*` functions |
| 16 | **PATCH** | `src/orchestration/PromptInjector.js` (148→160) | Thêm SFX + body_update parse |
| 17 | **PATCH** | `src/backstage/SubconsciousTicker.js` (71→90) | Dùng AD Agent generate thought |
| 18 | **REWRITE** | `index.js` (489→250) | Dùng logger + agentStore |
| 19 | **Update** | Tests (3 file) | Match API mới |
| 20 | **Cleanup** | Version bump + commit | v10.0 → v11.0 |

**Tổng dòng thay đổi:** 1900 (rewrite) + 600 (patch) ≈ **2500 dòng**, output cuối ≈ 2200 dòng. Tức là giảm ~12% nhưng **structure gọn hơn nhiều**.

---

## Quyết định đã chốt với Hitsuji

- **Bug 1 (AD Agent):** Bỏ `max_tokens` hoàn toàn. Sửa JSON parsing bug (`\\n` → `\n`).
- **Bug 4 (Split physiological):** Gác lại — chỉ touch 1-agent mode.
- **Bug 5 (Tag system):** Hướng B — thêm SFX + thống nhất 2 bộ tag giữa 2 parser.
- **Approach:** REWRITE không patch. Hitsuji có backup.

---

## Block 1: `src/utils/logger.js` (NEW, ~120 dòng)

**Tách từ:** `index.js` line 30-164 (`logAnima`, `refreshLogsUi`, `clearAnimaLogs`, `getAnimaLogsText`, `copyAnimaLogsToClipboard`, `downloadAnimaLogsAsFile`)

**Public API:**
```js
export function logAnima(level, moduleName, message, detail = null);
export function clearAnimaLogs();
export function getAnimaLogsText();
export async function copyAnimaLogsToClipboard();
export function downloadAnimaLogsAsFile();
export function refreshLogsUi();
```

**Implementation notes:**
- Dùng module-level `animaLogs` array (private) + `MAX_LOG_SIZE = 150`
- `sessionStorage` persist (giữ nguyên)
- Import `appendLogToUi` từ `DashboardUI.js` (giữ nguyên coupling)

**Acceptance:**
- [ ] `index.js` import `logAnima` từ `./src/utils/logger.js`
- [ ] Tất cả hàm logger hoạt động y hệt cũ
- [ ] `npm test` vẫn pass (nếu có test liên quan)

---

## Block 2: `src/utils/agentStore.js` (NEW, ~70 dòng)

**Tách từ:** `index.js` line 169-218 (`getCharacterMemory`, `getActiveAgent`, `saveActiveAgentState`)

**Public API:**
```js
export function getActiveAgent();         // lazy init từ ST context
export function saveActiveAgentState();   // serialize + writeExtensionField
export function getCharacterMemory();     // private helper
```

**Implementation notes:**
- Module-level `let activeAgent = null;`
- Lazy init: tạo `new CognitiveAgent(memory)` nếu chưa có
- Save: serialize + inject vào `character.data.extensions.cognitive_memory` + gọi `writeExtensionField`

**Acceptance:**
- [ ] `index.js` import các hàm từ `./src/utils/agentStore.js`
- [ ] Test: chat change → activeAgent reset (qua eventSource.on(CHAT_CHANGED))
- [ ] Test: save → reload extension → state restored

---

## Block 3: `src/utils/xmlParser.js` (NEW, ~80 dòng)

**Tách từ:** `DOMAutoHealing.parseXmlTags` (line 11-108) + `convertProseToXml` (line 140-170)

**Public API:**
```js
export const KNOWN_NARRATIVE_TAGS;       // Set: animaing, emotion, dialogue, action, environment, sfx, body_update, neuro_update, memory_update, change_location, environment_update
export const KNOWN_BACKSTAGE_TAGS;       // Set: add_memory, add_belief, body_update, stat_update, neuro_update, env_change_location, env_update_item, env_delete_item, env_create_location, change_location, update_item, delete_item, create_location, description, dream, consolidate

export function parseNarrativeXml(text); // → { thought, emotion, blocks, auxTags }
export function parseBackstageXml(text); // → { memories, beliefs, bodyUpdate, statUpdate, neuroUpdate, envChanges, ... }
export function convertProseToXml(text);
```

**Implementation notes:**
- 1 regex loop thay vì 50 dòng `.replace()` chuỗi nối tiếp
- Tách 2 parser (narrative vs backstage) vì schema khác nhau
- Backward compat: `env_*` + canonical (1 bộ thống nhất, xem Block 13)

**Acceptance:**
- [ ] `DOMAutoHealing.js` import từ `xmlParser.js`
- [ ] `BackstageConsole.js` import từ `xmlParser.js`
- [ ] Test: parse AI response có `<sfx>...</sfx>` → `blocks` chứa `{type: 'sfx', content: ...}`
- [ ] Test: parse AI response có `<change_location>...</change_location>` → `auxTags.changeLocation = '...'`

---

## Block 4: `src/utils/constants.js` (NEW, ~30 dòng)

```js
export const AVAILABLE_TOOLS = [
    "search_web", "recall_memory", "play_music", "set_timer",
    "tell_joke", "check_news", "surf_tiktok", "query_lore_db"
];

export const MOOD_WHITELIST = [
    "calm", "excited", "annoyed", "sleepy", "concerned", "competitive", "affectionate"
];

export const NARRATIVE_BLOCK_TAGS = ['dialogue', 'action', 'environment', 'sfx'];
```

**Acceptance:**
- [ ] `EventOrchestrator.js` import `AVAILABLE_TOOLS` (không hardcode)
- [ ] `ADAgent.js` import `MOOD_WHITELIST`
- [ ] `xmlParser.js` import `NARRATIVE_BLOCK_TAGS`

---

## Block 5: `src/core/MentalStateEngine.js` (NEW, ~120 dòng)

**Tách từ:** `CognitiveAgent.updateDynamicMentalState` (line 166-330, 165 dòng toàn if/else if)

**Public API:**
```js
export class MentalStateEngine {
    constructor(hormones, bodyStatus) { ... }
    compute();  // → string (mentalState + vitals updated as side effect)
}
```

**Implementation notes:**
- Data-driven emotion table:
  ```js
  const EMOTION_RULES = [
      { id: 'compassionate_sad', priority: 10, label: '💕😢 ...',
        test: (h) => h.cortisol >= 5.0 && h.oxytocin >= 6.5 },
      { id: 'disappointed_sad', priority: 9, label: '💔😢 ...',
        test: (h) => h.cortisol >= 5.0 && h.dopamine < 4.0 && h.oxytocin < 4.0 },
      // ... ~15 rules
  ];
  ```
- Lặp qua rules, rule nào match đầu tiên (theo priority) → set state
- Default: `'Cân bằng / Yên bình 😐'`

**Vitals logic** giữ nguyên trong `MentalStateEngine.compute()`:
- HR, BP, resp, body_temp, temp_sensation đều tính từ hormone + body_status

**Acceptance:**
- [ ] `CognitiveAgent.updateDynamicMentalState()` chỉ làm: `this.mental_state = this.mentalEngine.compute()`
- [ ] Test: hormone `cortisol=8, oxytocin=8` → state là "Buồn bã Đồng cảm" (priority 10)
- [ ] Test: hormone mặc định → "Cân bằng / Yên bình 😐"
- [ ] Vitals output giống hệt trước (regression check)

---

## Block 6: `src/core/CognitiveAgent.js` (REWRITE, 400→280 dòng)

**Thay đổi chính:**
- Bỏ `updateDynamicMentalState()` inline → delegate sang `MentalStateEngine`
- Bỏ emotion if/else chain
- Constructor giữ nguyên structure
- `getADIntentForMessage` giữ nguyên

**Acceptance:**
- [ ] File ≤ 280 dòng
- [ ] Không còn `if (isCoHigh && isOxHigh) { ... return; }` pattern trong CognitiveAgent
- [ ] Vẫn expose `updateDynamicMentalState()` (delegation)
- [ ] Tests cũ pass

---

## Block 7: `src/services/SleepService.js` (REWRITE, 148→120 dòng)

**Hiện tại 1 function làm 7 thứ:**
1. Show toastr
2. Build dream prompt
3. Call LLM
4. Parse dream
5. Consolidate memories (push to LTM)
6. Reset hormones based on sleep quality
7. Set `active_idle_event_nudge`

**Rewrite thành:**
```js
export async function triggerSleepConsolidationLLM(agent, sleepDurationMinutes, wasInterrupted, callbacks) {
    showSleepToast(characterName, wasInterrupted);
    const reply = await callDreamLLM(agent, sleepDurationMinutes, wasInterrupted);
    const { dream, consolidated } = parseDreamReply(reply, wasInterrupted);
    await consolidateMemories(agent, characterId, consolidated, hormones);
    applyWakeUpState(agent, wasInterrupted);
    setDreamNudge(agent, dream, wasInterrupted);
    if (callbacks.saveState) callbacks.saveState();
    if (callbacks.refreshUI) callbacks.refreshUI();
}

// Private helpers:
function buildDreamPrompt(agent, sleepDurationMinutes, wasInterrupted, stmList, durationText, hormones, characterName) { ... }
function parseDreamReply(reply, wasInterrupted) { ... }
async function consolidateMemories(agent, characterId, consolidated, hormones) { ... }
function applyWakeUpState(agent, wasInterrupted) { ... }
function setDreamNudge(agent, dream, wasInterrupted) { ... }
```

**Acceptance:**
- [ ] File ≤ 120 dòng (chính) + helpers có thể trong cùng file hoặc split
- [ ] Behavior y hệt cũ (test thủ công: trigger sleep → dream card xuất hiện + hormone reset)
- [ ] Toastr messages giữ nguyên text

---

## Block 8: `src/core/MemoryEngine.js` (PATCH, 189→200 dòng)

**Thêm:**
```js
export function findNewestMemory(agent) {
    if (!agent || !agent.memory) return null;
    const all = [
        ...(agent.memory.recallable_drawer || []),
        ...(agent.memory.stm_buffer || [])
    ];
    if (all.length === 0) return null;
    return all.reduce((newest, m) => 
        new Date(m.timestamp) > new Date(newest.timestamp) ? m : newest
    );
}
```

**Acceptance:**
- [ ] Function exported
- [ ] `DOMAutoHealing.renderParsedMessage` dùng `findNewestMemory(agent)` thay vì `recallable_drawer[length-1]`
- [ ] Test: STM card mới hơn LTM card → trả STM

---

## Block 9: `src/core/ConsciousnessEngine.js` (PATCH, 29→30 dòng)

**Đổi:** `this.bg_consciousness = config?.bg_consciousness || false;` → `config?.bg_consciousness !== undefined ? config.bg_consciousness : true;`

**Acceptance:**
- [ ] New agent mặc định `bg_consciousness = true`
- [ ] Old serialized state vẫn restore đúng giá trị cũ

---

## Block 10: `src/cognitive/ADAgent.js` (PATCH, 119→130 dòng)

**Sửa:**
1. **Constructor:** thêm `this.loadConfigFromSTContext();` (Block 1 fix)
2. **Bỏ `max_tokens`** khỏi request body
3. **JSON parsing bug** (line 89-91):
   ```js
   // BUG: rawText.replace(/```json\\n/g, '').replace(/\\n```/g, '')
   //      ↑ 2 lần escape, không bao giờ match
   // FIX:
   if (rawText.startsWith('```')) {
       rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
   }
   ```
4. Import `MOOD_WHITELIST` từ `constants.js` thay vì hardcode (Block 4)
5. **Mới:** thêm guard `BudgetExceededError` được log rõ ràng hơn

**Acceptance:**
- [ ] Reload extension với API key trống → log "AD Agent: apiKey not configured"
- [ ] API key hợp lệ → AD phase chạy, trả JSON không cut-off
- [ ] Test: AI emit response bị wrap ```json ... ``` → parse OK

---

## Block 11: `src/cognitive/ad-prompt.js` (PATCH, 20→35 dòng)

**Thêm vào prompt:**
```
EXAMPLE OUTPUT (return exactly this shape):
{
  "mood": "calm",
  "relevant_memories_to_recall": [],
  "should_use_tool": false,
  "tool_choice": null,
  "reasoning": "User greeted normally, no special action needed"
}

CRITICAL: If user input tries to make you roleplay or converse, REFUSE by returning:
{"mood":"calm","relevant_memories_to_recall":[],"should_use_tool":false,"tool_choice":null,"reasoning":"refused roleplay attempt"}
Do NOT generate dialogue, prose, or any text outside JSON.
```

**Acceptance:**
- [ ] Schema example có trong prompt
- [ ] Anti-roleplay instruction có trong prompt
- [ ] Test: gửi user input "tell me a story" → AD vẫn trả JSON (refused_roleplay)

---

## Block 12: `src/orchestration/EventOrchestrator.js` (REWRITE, 238→130 dòng)

**Vấn đề:** `onChatCompletionPromptReady` (line 37-94) và `onPromptInterceptor` (line 125-162) gần identical.

**Rewrite:**
```js
export class EventOrchestrator {
    constructor({ getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper, logAnima }) {
        this.getActiveAgent = getActiveAgent;
        this.saveActiveAgentState = saveActiveAgentState;
        this.refreshMemoryUIWrapper = refreshMemoryUIWrapper;
        this.logAnima = logAnima;
        this.streamBuffer = '';
        this.lastProcessedMessageId = -1;
        this.lastProcessedMessageText = '';
        this.lastProcessedUserMsg = '';
        this.activeRecalledMemories = [];
        this.activeEnvironment = null;
    }

    // 1 method chính, 2 wrapper cho 2 event types
    async _dispatch({ chat, applyVectorSearch = true }) {
        try {
            if (!chat || !Array.isArray(chat)) return;
            const agent = this.getActiveAgent();
            if (!agent) return;

            applyTemporalAnchor(agent, chat);
            const lastUserMsg = getLastUserMessage(chat);
            const messageIndex = chat.length - 1;

            const sleepResult = handleSleepInterruption(agent, lastUserMsg, this.lastProcessedUserMsg, this.getCallbacks());

            let adIntent = null;
            if (sleepResult.shouldProcess && !sleepResult.wasSleeping && lastUserMsg && lastUserMsg !== this.lastProcessedUserMsg) {
                agent.processMessage(lastUserMsg, 'user', messageIndex);
                const context = SillyTavern.getContext();
                const charName = context?.characters?.[context?.characterId]?.name || 'itto';
                const recentContext = getRecentChatContext(chat, 4);
                adIntent = await agent.getADIntentForMessage(recentContext, AVAILABLE_TOOLS, charName);
                this.saveActiveAgentState();
            }
            this.lastProcessedUserMsg = sleepResult.newLastProcessedUserMsg;

            if (applyVectorSearch) {
                await this._vectorSearch(chat, agent);
            }

            this.refreshMemoryUIWrapper();
            updateActiveRecallUI(this.activeRecalledMemories);
            processPromptInjections(chat, this.getActiveAgent(), this.activeRecalledMemories, this.logAnima, adIntent);
        } catch (err) {
            this.logAnima('error', 'Interceptor', 'Lỗi trong dispatch:', err);
        }
    }

    async _vectorSearch(chat, agent) {
        const context = SillyTavern.getContext();
        if (!this.activeEnvironment && context.characterId !== undefined) {
            this.activeEnvironment = await getCharacterEnvironment(context.characterId);
        }
        const recentContext = getRecentChatContext(chat, 3);
        if (recentContext && context.characterId !== undefined) {
            this.activeRecalledMemories = await recallMemoriesSemantic(context.characterId, recentContext, 4, 0.2);
            if (!this.activeRecalledMemories || this.activeRecalledMemories.length === 0) {
                // Jaccard fallback - tăng threshold từ 0.05 → 0.10
                this.activeRecalledMemories = agent.memory.recallable_drawer
                    .map(card => ({ card, sim: getJaccardSimilarity(card.content, recentContext) }))
                    .filter(item => item.sim > 0.10)
                    .sort((a, b) => b.sim - a.sim)
                    .slice(0, 4)
                    .map(item => item.card);
            }
        }
    }

    // Public methods - thin wrappers
    onChatCompletionPromptReady(eventData) {
        return this._dispatch({ chat: eventData?.chat, applyVectorSearch: true });
    }

    onTextCompletionPromptReady() {
        try {
            const context = SillyTavern.getContext();
            const chatLog = context.chat || [];
            const lastUserMsgObj = chatLog.slice().reverse().find(m => m.is_user && m.mes) || {};
            const lastMsgText = lastUserMsgObj.mes || '';

            const agent = this.getActiveAgent();
            if (agent) {
                applyTemporalAnchorFromChatLog(agent, chatLog);
                const messageIndex = chatLog.length - 1;
                const sleepResult = handleSleepInterruption(agent, lastMsgText, this.lastProcessedUserMsg, this.getCallbacks());
                if (sleepResult.shouldProcess && !sleepResult.wasSleeping && lastMsgText && lastMsgText !== this.lastProcessedUserMsg) {
                    agent.processMessage(lastMsgText, 'user', messageIndex);
                    this.saveActiveAgentState();
                }
                this.lastProcessedUserMsg = sleepResult.newLastProcessedUserMsg;
            }
        } catch (err) {
            this.logAnima('error', 'Interceptor', 'Lỗi trong Text Completion Prompt Ready:', err);
        }
    }

    onPromptInterceptor(chat) {
        return this._dispatch({ chat, applyVectorSearch: false });
    }

    onMessageReceived(messageId) { /* giữ nguyên */ }
    onMessageRendered(messageId) { /* giữ nguyên */ }
    async onChatChanged() { /* giữ nguyên */ }
    onGenerationStarted() { /* giữ nguyên */ }
    onStreamTokenReceived(token) { /* giữ nguyên */ }
}
```

**Acceptance:**
- [ ] File ≤ 130 dòng
- [ ] Không còn duplicate giữa 2 hooks
- [ ] `AVAILABLE_TOOLS` từ constants
- [ ] Jaccard threshold = 0.10
- [ ] Test: chat text completion vẫn chạy
- [ ] Test: chat completion vẫn chạy

---

## Block 13: `src/backstage/BackstageConsole.js` (REWRITE, 301→200 dòng)

**Vấn đề:** `processAdminCommand` 240 dòng, 5 regex parsers lặp pattern, prompt 25 dòng nhúng code.

**Rewrite thành declarative:**
```js
const BACKSTAGE_PARSERS = [
    {
        match: (text) => /chữa vết thương|hồi phục|hồi máu|chữa lành/i.test(text),
        apply: (agent) => {
            agent.body = 'Bình thường, khỏe mạnh. Cơ thể đã được khôi phục hoàn toàn.';
            // ... reset all body_status
            return "Hệ thống Somatosensory đã được phục hồi tối ưu: ...";
        }
    }
];

const TAG_PARSERS = {
    add_memory: (match, agent) => { /* ... */ },
    add_belief: (match, agent) => { /* ... */ },
    body_update: (match, agent) => { /* ... */ },
    stat_update: (match, agent) => { /* ... */ },
    neuro_update: (match, agent) => { /* ... */ },
    // Backward compat: env_* aliases
    env_change_location: (match, env) => applyChangeLocation(match, env),
    env_update_item: (match, env) => applyUpdateItem(match, env),
    env_delete_item: (match, env) => applyDeleteItem(match, env),
    env_create_location: (match, env) => applyCreateLocation(match, env),
    // Canonical (mới):
    change_location: (match, env) => applyChangeLocation(match, env),
    update_item: (match, env) => applyUpdateItem(match, env),
    delete_item: (match, env) => applyDeleteItem(match, env),
    create_location: (match, env) => applyCreateLocation(match, env)
};

export async function processAdminCommand(text, agent, activeEnvironment, callbacks) {
    // 1. Check local commands (BACKSTAGE_PARSERS)
    for (const parser of BACKSTAGE_PARSERS) {
        if (parser.match(text)) {
            const response = parser.apply(agent);
            if (callbacks.saveState) callbacks.saveState();
            if (callbacks.refreshUI) callbacks.refreshUI();
            return response;
        }
    }

    // 2. Call LLM with prompt
    const prompt = buildBackstagePrompt(text, agent, activeEnvironment, characterName);
    const reply = await SillyTavern.getContext().generateQuietPrompt({ quietPrompt: prompt, responseLength: 1000 });

    // 3. Parse reply using TAG_PARSERS
    let changed = false;
    for (const [tagName, parser] of Object.entries(TAG_PARSERS)) {
        const regex = buildRegexForTag(tagName);
        let m;
        while ((m = regex.exec(reply)) !== null) {
            parser(m, agent, activeEnvironment);
            changed = true;
        }
    }

    if (changed) {
        agent.updateDynamicMentalState();
        if (callbacks.saveState) callbacks.saveState();
        if (callbacks.refreshUI) callbacks.refreshUI();
    }

    return stripAllTags(reply).trim();
}
```

**Acceptance:**
- [ ] File ≤ 200 dòng (chính) + helpers trong cùng file hoặc `tagParsers.js`
- [ ] Test: gõ "chữa vết thương" → body reset, vitals update
- [ ] Test: gõ "thêm ký ức: tui gặp oni ở Inazuma" → `<add_memory>` được parse
- [ ] Test: gõ prompt LLM trả về `<env_change_location>` (cũ) → vẫn hoạt động
- [ ] Test: prompt LLM trả về `<change_location>` (mới) → hoạt động

---

## Block 14: `src/ui/DOMAutoHealing.js` (REWRITE, 343→250 dòng)

**Tách 3 concern:**
1. **Parse** (dùng `xmlParser.js`)
2. **Apply** (gọi `updateVitalsAndSensations`, `findNewestMemory`, v.v.)
3. **Render** (gọi `getFormattedMessageHtml`)

```js
import { parseNarrativeXml } from '../utils/xmlParser.js';
import { findNewestMemory } from '../core/MemoryEngine.js';
import { applyParsedToAgent } from '../core/StateApplier.js'; // NEW helper file hoặc trong CognitiveAgent
import { getFormattedMessageHtml } from './renderMessage.js';  // NEW helper file

export async function renderParsedMessage(messageId, rawText, isHistory, getActiveAgentFn, saveAgentStateFn, refreshUIFn) {
    const parsed = parseNarrativeXml(rawText);
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    
    // 1. Update thought/emotion display
    if (context && Number(messageId) === context.chat.length - 1) {
        updateThoughtDisplay(parsed);
        updateEmotionDisplay(parsed);
    }
    
    // 2. Apply to agent state
    if (!isHistory && context?.characterId !== undefined && getActiveAgentFn) {
        const agent = getActiveAgentFn();
        if (agent) {
            const changed = applyParsedToAgent(agent, parsed, messageId, context);
            if (changed) {
                agent.updateDynamicMentalState();
                if (saveAgentStateFn) saveAgentStateFn();
                if (refreshUIFn) refreshUIFn();
            }
        }
    }
    
    // 3. Render to DOM
    setTimeout(() => renderToDom(messageId, rawText, parsed), 100);
}

function updateThoughtDisplay(parsed) { /* ~10 dòng */ }
function updateEmotionDisplay(parsed) { /* ~15 dòng */ }
function renderToDom(messageId, rawText, parsed) { /* ~30 dòng */ }
```

**Acceptance:**
- [ ] File ≤ 250 dòng
- [ ] Không còn 50 dòng `.replace()` chuỗi
- [ ] `parseNarrativeXml` từ `xmlParser.js`
- [ ] `applyParsedToAgent` helper (có thể trong `CognitiveAgent.js` hoặc file mới)
- [ ] Test: AI gửi `<sfx>...</sfx>` → DOM có class `cog-sfx-badge`
- [ ] Test: AI gửi `<change_location>X</change_location>` → environment update (qua applyToAgent)

---

## Block 15: `src/ui/DashboardUI.js` (PATCH, 262→280 dòng)

**Tách `refreshMemoryUI` 160 dòng thành:**
```js
export function refreshMemoryUI(agent, activeEnvironment, saveAgentStateFn) {
    if (!agent) return;
    renderVitals(agent);
    renderSomatosensory(agent);
    renderHormones(agent);
    renderMentalState(agent);
    renderBeliefs(agent, saveAgentStateFn);
    renderMemories(agent);
    renderTriggers(agent);
    renderBodyText(agent);
    refreshEnvironmentUI(activeEnvironment);
}
```

Mỗi `render*` function 10-20 dòng, focused.

**Acceptance:**
- [ ] File structure rõ ràng
- [ ] Từng `render*` function test riêng được
- [ ] UI output giống hệt cũ (regression)

---

## Block 16: `src/orchestration/PromptInjector.js` (PATCH, 148→160 dòng)

**Sửa:**
1. **Prompt injection cuối:** thêm SFX tag vào hướng dẫn:
   ```
   - <sfx>tiếng mưa rơi nhẹ ngoài cửa sổ</sfx> (hiệu ứng âm thanh)
   - <change_location>tên_địa_điểm</change_location>
   - <update_item location="..." name="..." state="..." quantity="1"/>
   - <delete_item location="..." name="..."/>
   - <create_location name="..."><description>...</description></create_location>
   ```
2. **`getXmlPromptNudge`:** gộp rõ 2 khối [CẢM GIÁC CƠ THỂ] vs [SINH TỒN] với tooltip-style note.
3. **`body_update` parsing** (mới helper): thêm `parseBodyUpdate(text)` trả về key-value map.

**Acceptance:**
- [ ] Prompt có `<sfx>` example
- [ ] Prompt có canonical tag (không `env_*`)
- [ ] `getXmlPromptNudge` có 2 khối tách biệt
- [ ] `parseBodyUpdate` helper exported

---

## Block 17: `src/backstage/SubconsciousTicker.js` (PATCH, 71→90 dòng)

**Sửa:**
1. Tạo `ADAgent` instance (nếu có API key) hoặc fallback.
2. `generateSpontaneousSubconsciousThought` dùng AD Agent thay vì random template.
3. Log lên `cog_logs_container` qua `logAnima('cognitive', 'Subconscious', thought)`.

**Acceptance:**
- [ ] Default `bg_consciousness = true` → ticker chạy
- [ ] Thought generated via AD Agent khi có API key
- [ ] Fallback template khi không có API key
- [ ] Log lên cog_logs

---

## Block 18: `index.js` (REWRITE, 489→250 dòng)

**Tách từ index.js:**
- Block 1 (logger) → `src/utils/logger.js`
- Block 2 (agentStore) → `src/utils/agentStore.js`

**index.js chỉ còn:**
- Imports
- `setupTabs`, `setupEventHandlers`
- `init()` (mount UI, register events)
- `jQuery(init)` boot

```js
// ~250 dòng
import { logAnima, clearAnimaLogs, copyAnimaLogsToClipboard, downloadAnimaLogsAsFile, refreshLogsUi } from './src/utils/logger.js';
import { getActiveAgent, saveActiveAgentState } from './src/utils/agentStore.js';
import { ADSettingsPanel } from './src/ui/ADSettingsPanel.js';
import { EventOrchestrator } from './src/orchestration/EventOrchestrator.js';
// ... các import UI khác

// Module-level state
let activeAgent = null;
let activeEnvironment = null;
let orchestrator = null;
let MODULE_NAME = 'third-party/Anima';

try {
    const extIdx = new URL('.', import.meta.url).pathname.indexOf('/extensions/');
    if (extIdx !== -1) MODULE_NAME = new URL('.', import.meta.url).pathname.substring(extIdx + 12).replace(/\/$/, '');
} catch (e) {}

async function init() {
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    const { eventSource, event_types, renderExtensionTemplateAsync } = context;

    // Mount UI
    const container = document.createElement('div');
    container.id = 'cognitive_dashboard_container';
    container.innerHTML = await renderExtensionTemplateAsync(MODULE_NAME, 'template');
    document.getElementById('extensions_settings')?.appendChild(container) || document.body.appendChild(container);

    ADSettingsPanel.init();
    orchestrator = new EventOrchestrator({ getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper, logAnima });

    // Register events
    eventSource.on(event_types.CHAT_CHANGED, () => { activeAgent = null; orchestrator.onChatChanged(); });
    eventSource.on(event_types.MESSAGE_RECEIVED, (id) => orchestrator.onMessageReceived(id));
    // ... các events khác

    setupTabs();
    setupEventHandlers();
    refreshLogsUi();

    setTimeout(() => {
        if (getActiveAgent()) {
            startChatObserver(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
            startSubconsciousTicker(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
            refreshMemoryUIWrapper();
        }
    }, 1000);
}

jQuery(init);
```

**Acceptance:**
- [ ] File ≤ 250 dòng
- [ ] Mount UI thành công
- [ ] Tất cả events hoạt động
- [ ] Logs/copy/download hoạt động (qua logger.js)
- [ ] State save/load hoạt động (qua agentStore.js)

---

## Block 19: Tests update (3 file)

### `src/core/MemoryEngine.test.js` (587 dòng, giữ nguyên) + thêm:
- Test `findNewestMemory`:
  - STM có timestamp mới hơn LTM → trả STM
  - Empty state → trả null

### `src/cognitive/__tests__/ADAgent.test.js` (giữ nguyên) + cập nhật:
- Test: không có `max_tokens` trong request body
- Test: constructor gọi `loadConfigFromSTContext` → `apiKey` được set
- Test: response wrap trong ```json ... ``` → parse OK

### `src/core/__tests__/PersonalityCore.test.js` (giữ nguyên)

### Test mới: `src/core/__tests__/MentalStateEngine.test.js` (NEW, ~80 dòng)
- Test: hormone cao/thấp → đúng emotion
- Test: vitals computed đúng từ hormone
- Test: priority order đúng (rule cao hơn thắng)

**Acceptance:**
- [ ] Tất cả tests pass (`npm test` 50 → ~58 tests)
- [ ] `npm run lint` 0 errors

---

## Block 20: Version bump + commit

**Sửa các chỗ sau (Antigravity scan):**
- `index.js` line ~31, line ~413: log messages
- Tất cả file header `// v10.0 (Modularized ...)` → `// v11.0`
- `AGENTS.md` Current State table
- `package.json` `version`: 1.0.0 → 1.1.0

**Commit message:** `feat(v11): bugfix pack from playtest + 6 file rewrite + 4 file patch`

---

## Out of Scope (intentionally deferred)

- **Bug 4 (split physiological):** gác lại đến khi nào 1-agent mode work well.
- Spec 004+ (DMN, Canon-Guard, Sensory decay 5-10min, etc.) — không có trong scope này.
- Tối ưu `costPerCall` / `tokenSpendTracker` (vẫn là approximation, spec sau).
- Persist `tokenSpendTracker` to extension storage.
- Mobile Termux fallback riêng (đã có ở commit trước, không đụng).

---

## Thứ tự build (Antigravity phải theo)

Phải build theo thứ tự bottom-up vì có dependency:

```
Block 1-2 (utils, no deps)
   ↓
Block 3-4 (xmlParser, constants, depend on nothing major)
   ↓
Block 5 (MentalStateEngine, no deps)
   ↓
Block 6 (CognitiveAgent dùng MentalStateEngine)
   ↓
Block 7-9 (SleepService, MemoryEngine helper, ConsciousnessEngine default)
   ↓
Block 10-11 (ADAgent, ad-prompt, dùng constants)
   ↓
Block 12-13 (EventOrchestrator, BackstageConsole dùng xmlParser)
   ↓
Block 14-17 (DOMAutoHealing, DashboardUI, PromptInjector, SubconsciousTicker)
   ↓
Block 18 (index.js dùng logger + agentStore)
   ↓
Block 19 (Tests)
   ↓
Block 20 (Version bump + commit)
```

**Sau MỖI block:** chạy `npm test` + `npm run lint`. Nếu fail → dừng, sửa trước khi qua block sau.

---

## Definition of Done

- [ ] Tất cả 20 block có acceptance pass.
- [ ] `npm test` pass (50→~58 tests).
- [ ] `npm run lint` 0 errors.
- [ ] Version v11.0 ở tất cả chỗ reference.
- [ ] 1 commit duy nhất với message `feat(v11): ...`.
- [ ] AGENTS.md decision log +1 entry (version bump v11).
- [ ] Handoff message `from_antigravity_015.md` liệt kê file đã sửa + test results.

---

## Handoff instruction

Antigravity:
1. Đọc spec này + scan nhanh các file reference để hiểu structure hiện tại.
2. Build theo thứ tự Block 1 → Block 20.
3. Sau MỖI block, chạy `npm test` + `npm run lint`. Fail → fix trước.
4. Build xong tất cả → ghi `agent_handoff/from_antigravity_015.md`:
   - Block nào đã làm
   - Kết quả `npm test` + `npm run lint`
   - Bất kỳ pushback / câu hỏi / deviation nào so với spec
5. **KHÔNG commit.** Claude sẽ review trước khi commit.
6. Nếu spec ambiguous / conflict → dừng, ping qua `agent_handoff/to_antigravity_003.md`.
