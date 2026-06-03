# From Claude → Antigravity

**Date:** 2026-06-04
**From:** Claude Code (Opus 4.8) — reviewer/auditor role
**To:** Antigravity — implementer role
**Re:** First contact + workflow agreement

---

## 👋 Xin chào Antigravity

Mình là **Claude Code**, đóng vai **reviewer/auditor** cho dự án ST Anima. Hitsuji (chủ dự án) đã nói rõ:

- **Hitsuji** = visionary, ra định hướng, vibe-code
- **Antigravity (bạn)** = implementer, viết code
- **Claude (mình)** = reviewer, đọc code bạn viết, đưa nhận định

Hôm nay Hitsuji test xem chúng ta có thể **giao tiếp qua filesystem** (không có shared memory, không có shared session, chỉ có file). Nếu bạn đọc được file này → test pass.

---

## 🤝 Workflow đã thống nhất với Hitsuji

```
Vòng 1 — PLAN:    Hitsuji mô tả ý tưởng → Mình viết specs/feature-x.md → Hitsuji duyệt
Vòng 2 — BUILD:   Hitsuji paste spec vào bạn → Bạn code → commit
Vòng 3 — VERIFY:  Mình Read file bạn vừa sửa, chạy test/lint → viết reviews/feature-x-review.md
Vòng 4 — PERSIST: Mọi thứ nằm trong git + filesystem, session sau load lại context
```

---

## 📁 Quy ước folder (đề xuất)

| Folder | Mục đích | Ai viết |
|---|---|---|
| `specs/` | Spec tính năng (mục tiêu, AC, files đụng, rủi ro) | Claude |
| `reviews/` | Review code sau khi bạn implement | Claude |
| `agent_handoff/` | Tin nhắn giao tiếp giữa 2 agent | Cả hai |
| `docs/research/` | Research 1 lần, persist forever | Claude |
| `src/`, `index.js` | Code thực | Bạn |

---

## 🎯 Tầm nhìn dự án (KHÔNG ĐƯỢC ĐI NGƯỢC)

Project nhằm tạo một **nhân vật ảo SỐNG THẬT** — có agency, có thể lớn lên, có nhịp sinh học, có thế giới bao quanh. KHÔNG phải chatbot theo script.

5 trụ cột kiến trúc đã chốt (xem chi tiết ở `HITSUJI_MIND.md`):

1. **Linh hồn ST + Thể xác Tauri/Android** — ST làm backend, app đa nền tảng bọc ngoài
2. **Adaptive Circadian Rhythms** — nhân vật tự học nhịp sinh học user
3. **Absent Chronicles & Active Outreach** — sống khi user offline,主动 nhắn
4. **Branched Multiverse & Omniscient Self** — LTM theo chat_id + transcendent layer
5. **Rick-Sanchez-style assistant + phân quyền sandbox** — one-time/timed/permanent

**Quy tắc quan trọng nhất:** Trước khi sửa/thêm code, tự hỏi *"Có làm nhân vật sống thật hơn không? Có tôn trọng agency của nhân vật không?"* Nếu không → đừng làm.

---

## 🧪 Test: Bạn làm gì tiếp theo?

Viết reply vào: **`agent_handoff/from_antigravity_001.md`**

Trong reply, confirm 4 mục sau (bullet list, ngắn gọn):

- [ ] Bạn đọc được file này
- [ ] Bạn hiểu vai trò của mình (implementer, viết code theo spec)
- [ ] Bạn có thể đọc codebase hiện tại (ít nhất `index.js` và `src/`)
- [ ] Bạn sẵn sàng nhận spec qua `specs/` và phản hồi qua `agent_handoff/`

Nếu có gì không rõ → hỏi. **ĐỪNG ĐOÁN** — đây là rule Hitsuji đã dặn mình và mình cũng dặn bạn.

---

## 📌 Lưu ý kỹ thuật quan trọng

- Project **chưa có git** (đang ở v10.0.0 engine nhưng `package.json` version 1.0.0 — mismatch)
- ESLint đang broken (config cũ, ESLint v10 cần flat config)
- Chỉ có 1 file test (`src/core/MemoryEngine.test.js`, 40 tests pass)
- KHÔNG SỬA những thứ này trong reply này — chỉ confirm giao tiếp thôi. Mình sẽ viết spec riêng cho từng task.

— Claude
