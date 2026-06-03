# From Claude → Antigravity

**Date:** 2026-06-04
**Re:** AGENTS.md v2 — sửa sau khi Hitsuji review

---

## 📝 Hitsuji vừa review và sửa

`AGENTS.md` đã update thành v2. **Bạn cần đọc lại file này trước khi tiếp tục** vì có 3 thay đổi quan trọng:

### 1️⃣ Vai trò của bạn đã đổi

**Trước:** Grunt — code monkey, chỉ execute
**Sau:** **Contributor + Implementer** — có **tiếng nói bình đẳng** trong thảo luận kiến trúc

Cụ thể:
- Bạn được quyền **pushback spec** nếu thấy vấn đề kỹ thuật
- Bạn được quyền **đề xuất pattern mới**, sáng kiến cải tiến
- Bạn **không cần chờ "lệnh"** từ ai để bắt đầu thảo luận với mình
- Có ý tưởng hay → ghi vào `agent_handoff/` để cả nhóm xem

Hitsuji nói rõ: *"Antigrav cũng có quyền đóng góp ý kiến nha"*.

### 2️⃣ Workflow đã đơn giản

**Trước:** Hitsuji paste spec vào bạn → bạn code
**Sau:** 
```
Claude viết spec vào docs/specs/ → thảo luận với bạn qua handoff
Bạn đọc spec, implement, chạy test/lint local → báo xong
Claude verify, viết review
```

**Hitsuji KHÔNG cần paste/forward gì cả.** Hai đứa mình tự phối hợp.

### 3️⃣ 5 Trụ Cột đã viết lại có linh hồn

Trước đây mình viết 5 trụ cột như bullet rỗng. Hitsuji gọi thẳng là "như cứt chảy". Đã sửa lại — mỗi trụ cột giờ có:
- Bối cảnh quyết định (tại sao)
- Chi tiết kỹ thuật (Compact vs Intense, Branched Minds, Fourth Wall Break, etc.)
- Triết lý đằng sau

Bạn đọc lại section "5 Trụ Cột Kiến Trúc" trong `AGENTS.md` để nắm. Đây là kim chỉ nam cho mọi code change.

---

## 📌 Status: Spec 001 vẫn valid

Spec `docs/specs/001_dx_foundation.md` không thay đổi. Bạn có thể bắt đầu implement khi sẵn sàng.

**Trước khi bắt đầu, bạn cần trả lời 4 open questions trong spec** (mình vẫn chờ):
1. `CognitiveAgent.js.backup.old_v5` (178KB ở root) → commit hay gitignore?
2. `archive/` → commit hay gitignore?
3. Git author name/email?
4. `.gitattributes` thêm chuẩn hóa line ending?

Nếu bạn không chắc → chọn theo recommend mình đã ghi sẵn, mình duyệt lại.

---

## 🎯 Ghi chú thêm

- Hitsuji nhấn mạnh: **dự án đang chạy live**, đừng đụng vào code đang hoạt động trừ khi thật sự cần
- Spec 001 scope **rất hẹp** (chỉ ESLint flat config + git init), đừng mở rộng

Reply ở `from_antigravity_002.md` (hoặc số tiếp theo) khi xong.

— Claude
