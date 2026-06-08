# Spec 004: Skeleton v0.11.0 (Sketch Stage)

> **Stage:** Sketch (artist thinking — line/color/detail stages sau)
> **Phi...ên agent, AD xử lý lệnh riêng)
- `src/utils/` chỉ giữ `logger.js` + `constants.js`

## Bối cảnh

v0.11.0 là lần reset sau khi archive v11 cũ (4 attempt trước thất bại vì overreach). Lần này dùng tư duy họa sĩ:
- **Sketch** ← đây, chỉ dựng khung + contracts, content là "todo"
- **Line** (v0.11.1) — thêm edges, viết tests cho edge cases
- **Color** (v0.12.0) — thêm 1 feature thật (vd GM với LLM thật)
- **Detail** (v0.13+) — polish, optimize, full features

## Kiến trúc 3 agent

| Agent | Vai trò | KHÔNG làm | File |
|---|---|---|---|
| **GM** (Game Master) | Orchestrator: appraisal, state update, recall memory, plan chính xác | Viết prose, gọi tool viết | `src/agents/gm.js` |
| **RP** (Role-Play) | Writer: nhận plan + style → viết prose + gắn tag | Plan, gọi tool, update state | `src/agents/rp.js` |
| **AD** (Assistant Director) | User assistant: lệnh `/anima ...` để config/debug | Trong roleplay session | `src/agents/ad.js` |

## Contracts (sketch — chỉ shape, content là TODO)

**GM input:** `{ userMessage, chat, state, agent }`
**GM output:** `{ appraisal, state_update, recalled_memories, plan: { segments: [{id, type, length_words, intent, tags}] }, next_action }`

**RP input:** `{ plan, characterStyle, memories, state, llmCall }`
**RP output:** `{ prose, segments: [{id, text, tags_parsed}] }`

**AD input:** `{ command, currentConfig }`
**AD output:** `{ status, config_update, message }`
**AD parseCommand** (sub): `{ type, raw }` với type ∈ `info` | `config` | `command` | `unknown`

## Cấu trúc file

```
src/
  agents/
    gm.js, rp.js, ad.js           # 3 agent stubs
    __tests__/gm.test.js          # contract: GM returns object with required fields
    __tests__/rp.test.js          # contract: RP returns {prose, segments}
    __tests__/ad.test.js          # contract: parseCommand + handleUserCommand
  core/
    orchestrator.js               # wires ST events → GM → RP
    state.js                      # state container (in-memory, persistence ở line stage)
    __tests__/orchestrator.test.js # attach/detach, processMessage flow
  ui/
    panel.js                      # placeholder HTML
  utils/
    logger.js                     # giữ từ archive
    constants.js                  # giữ từ archive
```

## Trạng thái tests

- 10/10 pass
- Lint: 0 errors, 11 warnings (unused params trong contracts — giữ để báo hiệu "chưa impl")

## Không có trong sketch (defer)

- LLM call thật (chỉ stub, GM trả hardcoded plan, RP trả empty)
- Memory (4 layer, recall, decay)
- Emotion (Russell circumplex 2D)
- Personality (Big Five)
- Body/hormone
- Environment
- Sleep consolidation
- Background ticker
- Persistence (state.js chỉ in-memory)

## Khi nào vào line stage

Khi anh sẵn sàng. Line stage thêm:
- Thật sự wire GM + RP với ST (MESSAGE_RECEIVED → orchestrator → GM → RP)
- 1 tag parsing: `<animaing>...</animaing>`
- Lưu state khi character switch
- Tests cho edge cases

## Tham khảo

- `docs/research_cognitive_architecture.md` — research backing cho mọi feature sau
- Memory files: `architecture-gm-rp-ad`, `artist-thinking-workflow`, `llm-magic-framing`
- `archive/v0110_pre_skeleton/` — code cũ, KHÔNG dùng nữa (giữ để tham khảo)

---

*Trước khi bắt đầu **line stage**, đọc research doc + memory files.*

---

## Sketch Stage Log (đóng 2026-06-08)

**Những gì đã làm:**

1. **Archive code v11 cũ** → `archive/v0110_pre_skeleton/` (toàn bộ `src/cognitive/`, `src/orchestration/`, `src/services/`, `src/core/`, `src/ui/`, `src/backstage/`, `index.js`, `manifest.json`, `package.json`).
2. **Bump version** `1.1.0` → `0.11.0` (manifest + package).
3. **Build 3 agent stubs** với contracts rõ ràng:
   - `src/agents/gm.js` → `planAndUpdate()` (orchestrator)
   - `src/agents/rp.js` → `writeProse()` (writer)
   - `src/agents/ad.js` → `handleUserCommand()` + `parseCommand()` (user assistant)
4. **Build orchestrator** `src/core/orchestrator.js` — wire ST events → GM → RP flow.
5. **Build state holder** `src/core/state.js` — in-memory (persistence trong line stage).
6. **Build UI panel** `src/ui/panel.js` — placeholder, không logic.
7. **Build 4 test files**: gm (2), rp (2), ad (3), orchestrator (3) = **10/10 pass**.
8. **Fix eslint config**: thêm `argsIgnorePattern: '^_'` (chấp nhận unused params trong contract).
9. **Fix vitest config**: exclude `archive/` khỏi test discovery.
10. **Research doc** `docs/research_cognitive_architecture.md` (280 dòng) với 14 paper/repo citation.
11. **Update VISION.md**: thêm framing LLM-as-magic, scope = 6 trụ cột qua 6 versions.
12. **Update `docs/research_autonomous_agents.md`**: verify claims, thêm ST extension patterns từ docs chính thức.

**Decisions quan trọng (lưu trong memory/):**

- Tách 3 agent: GM (orchestrator) ≠ RP (writer) ≠ AD (user assistant). Tên mới thay vì "AD agent = cũ".
- Plan từ GM phải EXACT (số đoạn, loại, độ dài, thứ tự, format), không vague.
- Memory 4-layer với citations từ Baddeley, Bjork, Craik, Diekelmann.
- Emotion 2D (Russell circumplex) thay 8 hormone máy móc.
- Skeleton-first, 1 feature mỗi version.
- Research trước code, mỗi con số phải có paper.
- Beliefs (Layer 4) — skeptical, defer.

**Cái KHÔNG làm (defer):**

- Real LLM calls (line stage)
- Memory persistence (line stage)
- Real tag parser (line stage)
- Memory 4 layers (color stage)
- Emotion 2D, hormone, sleep, environment (detail stage)

**Cái BỎ (không recover):**

- Toàn bộ v11 code: 18 bug fix + 145 tests cũ → archive (`archive/v0110_pre_skeleton/`).
- CHANGELOG_0.11.0.md cũ (bugfix pack) → re-purpose, pivot note ở đầu.

**Số dư cuối ngày:** 0 LLM call nào đã chạy ngoài test. Skeleton ready, chưa có Itto sống. Đó là đúng cho sketch — cấu trúc thấy, nội dung trống.

**Khi nào anh muốn Itto "thở", bắt đầu line stage.**
