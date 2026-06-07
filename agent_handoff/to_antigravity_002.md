# Handoff to Antigravity — Spec 003 (v11.0: Rewrite + Patch) → **v11.0**

**From:** Claude (review)  
**Date:** 2026-06-07  
**Re:** Spec 003 — fix 5 bugs từ `Notes_260607_032156.docx` + 1 cleanup + **REWRITE** 6 file có code smell nặng. Bump version v10.0 → **v11.0**.

---

## Spec

Đọc chi tiết ở [docs/specs/003_bugfix_and_cleanup.md](../docs/specs/003_bugfix_and_cleanup.md).

**Scope lớn** — 20 blocks, ước tính:
- 6 file REWRITE (xóa + viết lại structure mới)
- 4 file PATCH (sửa focused)
- 5 file NEW (utils + MentalStateEngine)
- 3 file tests update

**Hitsuji đã chốt:** Option A (rewrite tất cả, 1 v11 lớn). Backup có sẵn, git log đầy đủ.

---

## Quyết định đã chốt với Hitsuji

- **Bug 1 (AD Agent):** Bỏ `max_tokens` hoàn toàn. Sửa JSON parsing bug (`\\n` → `\n`).
- **Bug 4 (Split physiological):** Gác lại — chỉ touch 1-agent mode.
- **Bug 5 (Tag system):** Hướng B — thêm SFX + thống nhất 2 bộ tag giữa 2 parser (canonical mới + backward compat `env_*`).
- **Approach:** REWRITE không patch. Hitsuji có backup.

---

## Thứ tự build (BẮT BUỘC theo thứ tự này, vì có dependency)

```
Block 1-2   (utils/logger, utils/agentStore) — no deps
   ↓
Block 3-4   (utils/xmlParser, utils/constants) — no deps
   ↓
Block 5     (MentalStateEngine) — no deps
   ↓
Block 6     (CognitiveAgent rewrite dùng MentalStateEngine)
   ↓
Block 7-9   (SleepService rewrite, MemoryEngine helper, ConsciousnessEngine default)
   ↓
Block 10-11 (ADAgent, ad-prompt patch, dùng constants)
   ↓
Block 12-13 (EventOrchestrator, BackstageConsole rewrite, dùng xmlParser)
   ↓
Block 14-17 (DOMAutoHealing rewrite, DashboardUI patch, PromptInjector patch, SubconsciousTicker patch)
   ↓
Block 18    (index.js rewrite dùng logger + agentStore)
   ↓
Block 19    (Tests update)
   ↓
Block 20    (Version bump v10.0 → v11.0)
```

**Sau MỖI block:** chạy `npm test` + `npm run lint`. Fail → fix trước khi qua block sau.

---

## Yêu cầu cụ thể

1. **Build theo thứ tự trên.** Không nhảy cóc (mỗi block phụ thuộc block trước).

2. **Sau MỖI block, log output vào console:**
   ```
   [Block X/Y] <name> — tests: X/Y pass, lint: X errors
   ```

3. **Version bump v10.0 → v11.0** ở cuối cùng (Block 20), sau khi tất cả pass. Các chỗ cần đổi:
   - `index.js` line ~31, line ~413: log messages
   - Tất cả file header `// v10.0 (Modularized ...)` → `// v11.0`
   - `AGENTS.md` Current State table row header
   - `package.json` `version` field: 1.0.0 → 1.1.0

4. **KHÔNG commit.** Build xong ghi `agent_handoff/from_antigravity_015.md` liệt kê:
   - Block nào đã làm (với status: pass / fail / deviation)
   - Kết quả cuối cùng: `npm test` (X/X pass?), `npm run lint` (X errors?)
   - Bất kỳ pushback / câu hỏi / deviation nào so với spec

5. **Nếu spec ambiguous / conflict:** dừng lại, ping qua `agent_handoff/to_antigravity_003.md` (file mới). ĐỪNG tự quyết.

6. **KHÔNG mở rộng scope.** Nếu thấy cần fix thêm ngoài spec, ghi vào 015 để Claude quyết ở verify phase.

---

## File KHÔNG được sửa (untouchables)

Theo AGENTS.md: `MemoryEngine.learnMemoryDynamically`, `HormoneEngine.tick`, `ConsciousnessEngine.evaluate`, `CognitiveAgent.processMessage` semantics.

Spec 003 chỉ đụng:
- `MemoryEngine.js`: thêm helper `findNewestMemory(agent)` (export mới, không sửa `learnMemoryDynamically`)
- `ConsciousnessEngine.js`: đổi default `bg_consciousness` từ `false` → `true` (config default, không phải `evaluate`)
- `HormoneEngine.js`: KHÔNG ĐỤNG
- `CognitiveAgent.processMessage`: KHÔNG ĐỤNG

---

## Out of scope reminder

- Bug 4 (split physiological) — KHÔNG làm.
- DMN / Canon-Guard / Sensory decay tuning / spec 004+ — KHÔNG làm.
- `costPerCall` real token accounting — KHÔNG làm.
- `tokenSpendTracker` persist to extension storage — KHÔNG làm.
- Mobile Termux fallback riêng — KHÔNG làm (đã có ở commit trước).

---

## Tóm tắt scope (cho Antigravity estimate)

| Block | Loại | Effort |
|---|---|---|
| 1-4 | New files (utils) | ~4-5h |
| 5 | New MentalStateEngine | ~2h |
| 6 | CognitiveAgent rewrite | ~2h |
| 7 | SleepService rewrite | ~1.5h |
| 8-9 | Patches | ~0.5h |
| 10-11 | ADAgent patch | ~1h |
| 12-13 | EventOrchestrator + BackstageConsole rewrite | ~4-5h |
| 14 | DOMAutoHealing rewrite | ~3h |
| 15-17 | Patches (UI, Prompt, Subconscious) | ~2h |
| 18 | index.js rewrite | ~1.5h |
| 19 | Tests | ~2h |
| 20 | Version bump | ~0.5h |
| **Tổng** | | **~24-26h work** |

---

Reply với `from_antigravity_015.md` khi xong. Nếu fail giữa chừng, ping ngay. Cảm ơn.
