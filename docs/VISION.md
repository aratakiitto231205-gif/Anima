# Vision: Anima Engine

> Tầm nhìn dài hạn. File này là nguồn sự thật về **đích đến** của dự án.
> Khi lạc hướng hoặc quên "mình đang build cái gì", đọc lại file này trước.
> Cập nhật lần cuối: 2026-06-08 (sau khi reset v11 → v0.11.0).

## Một câu tóm tắt

**App giống nuôi thú ảo — Trợ lý AI tự hành.**
Nhân vật sống thật, không phải chatbot.

## Vì sao "không phải chatbot"

- Chatbot = chờ user hỏi mới phản hồi, không có initiative.
- Anima = nhân vật có đời sống riêng. Tự cảm nhận. Tự phản ứng. Tự viết tiếp cốt truyện khi user vắng mặt.
- Khi user quay lại, nhân vật **đã sống tiếp**, không reset mỗi session.

## 6 trụ cột (xây theo thứ tự ưu tiên, UI trước)

1. **UI** — nơi user thấy, thao tác, tương tác. Làm trước vì UX là ưu tiên #1.
2. **AD agent + RP agent** — AD phân tích intent/user state, RP render phản hồi theo intent.
3. **Memory & phản ứng** — hợp lý, không OOC, nhất quán. Nhớ chuyện cũ, phản ứng đúng tính cách.
4. **Môi trường chính xác, chống hallucinate** — LLM không bịa location, vật, NPC. Môi trường là data cứng.
5. **Cơ thể** — vitals, hormone, somatosensory. Nhân vật có thể đói, đau, mệt, có nhịp sinh học.
6. **Novelist AI** — khi user vắng mặt, AI tự viết tiếp cốt truyện (sleep, daily life, sự kiện ngẫu nhiên).

## Nguyên tắc kiến trúc

### 1. Engine phải character-agnostic
- Nhân vật = config (folder `characters/<name>/personality.json`), không phải code.
- Itto là test character. Thêm nhân vật mới = thêm folder, không sửa engine.
- Mọi quyết định tính cách, ký ức, hành vi đều **data-driven**.

### 2. Tách concerns: ST vs Anima Engine vs Client
- **SillyTavern**: hạ tầng chat, event system, character card, UI chat mặc định. Anima tích hợp qua extension API.
- **Anima Engine**: logic cốt lõi (memory, hormone, environment, parser, time). Không biết gì về ST.
- **Client** (extension glue): gắn engine vào ST, parse LLM output, render UI. Biết về ST, gọi engine.

### 3. Độc lập với cấu trúc ST
- Không patch ST internals. Chỉ dùng public extension API (`getContext`, `eventSource`, `event_types`, `renderExtensionTemplateAsync`).
- ST update không được vỡ Anima. Nếu ST đổi API → engine không vỡ, chỉ client phải update.

### 4. Hòa hợp với system prompt của ST
- Không override character card system prompt. Chỉ inject thêm (và chỉ khi cần).
- Nhân vật vẫn "là nhân vật" theo character card. Anima là lớp cognitive bên dưới, không phải lớp personality.

## LLM output contract

LLM phải trả message có cấu trúc, không phải prose thuần. 4 thẻ chuẩn cho v0.11.0:

- `<sfx>` — âm thanh, hiệu ứng
- `<environment>` — môi trường (location, weather, atmosphere)
- `<action>` — hành động
- `<emotion>` — biểu cảm khuôn mặt

(Có thể thêm sau nếu cần, vd `<body>`, `<memory>`. Mỗi thẻ mới → tag parser, AC, test.)

**Ràng buộc cứng**: LLM không được lạm dụng thẻ. Mỗi thẻ có:
- Parser riêng
- Acceptance criteria rõ ràng
- Test case (vitest)

Nếu LLM dùng sai → parser fail mềm (bỏ qua thẻ lỗi, render phần còn lại), không vỡ UI.

## Khung thoại ngày tháng

Luôn hiển thị **ngày/giờ hiện tại** của nhân vật trong UI.

Muốn nhảy thời gian → chỉnh ngày/giờ. Engine tự xử lý:
- Memory decay theo quãng thời gian
- Hormone/body update
- Sleep/wake transitions nếu qua giờ ngủ
- "Nhân vật đã sống qua khoảng thời gian đó" — narrative continuity, không skip cả đoạn

## Ưu tiên (cao → thấp, không thay đổi)

1. **Trải nghiệm người dùng** — không lỗi, hiển thị tốt, mượt.
2. **Ổn định lâu dài** — chạy lâu không vỡ, test kỹ, defensive.
3. **Code sạch, nhẹ** — readable, maintainable. Hơn 70% code v11 đã bị archive vì quá nặng.
4. **Chi phí phải chăng** — API call ít, model rẻ, batch tốt.

Nếu phải đánh đổi giữa các mục → ưu tiên mục trên. Đừng bao giờ đánh đổi UX lấy code "xịn".

## Nhân vật hiện tại (test case)

**Arataki Itto** — Genshin Impact, oni. Personality config ở `characters/itto/personality.json`. Đây là nhân vật dùng để test engine. Engine không hardcode Itto.

Tham khảo lore: `archive/CyclOnipedia.txt` (lưu trong archive vì nặng, không phải vì lỗi thời).

## Phiên bản & quy ước

- **Hiện tại**: v0.11.0 (reset từ v11.0.0 ngày 2026-06-08).
  - Quy ước: v0.x = pre-1.0, đánh số theo iteration. 0.11.0 = iteration thứ 11.
  - **Scope của mỗi iteration do spec quyết định, không gán cứng ở VISION.**
  - Khi engine đủ chín (có đủ 6 trụ cột) → 1.0.0.
- **Mỗi spec = 1 file**: `docs/specs/00X_*.md`. Spec hiện hành = số lớn nhất.
- **AGENTS.md**: quy trình làm việc, role, decision log, "đừng quên" lessons.
- **README.md**: 3-5 dòng giới thiệu cho người mới.
- **VISION.md** (file này): tầm nhìn dài hạn, đích đến.

## Tài liệu tham khảo

- [shopaikey.com/api-docs](https://shopaikey.com/api-docs) — API cho AD agent, novelist AI, các tác vụ phụ.
- [docs.sillytavern.app](https://docs.sillytavern.app/) — SillyTavern extension API chính thức.
- [X00LA gist](https://gist.github.com/X00LA/ea409ec5541e56cf3c4166845fcb226b) — extension patterns từ cộng đồng, tham khảo cấu trúc.

## Lessons đã ghi nhớ (từ MEMORY.md)

- **Đừng viết roadmap 9-phase khi chỉ cần fix bug** — đã xảy ra 3 lần, lần cuối 2026-06-04.
- **Mỗi spec = scope chặt, có "out of scope" rõ ràng** — tránh feature creep.
- **Archive mạnh tay** — code cũ không dùng thì chuyển archive, đừng giữ "phòng khi".
- **Engine character-agnostic** — Itto = config, không phải code.
- **Nói chuyện với Hitsuji = bình dân, jargon để dành cho handoff anti-kun (Antigravity)**.

---

*Nếu có lúc nào đó dự án đi chệch hướng — quá nhiều tính năng, quên user, quên "nuôi thú ảo" — đọc lại file này.*
