# Anima Engine — ST Extension

> **v0.12.2** — Dashboard UI Shell

Verify ST + Anima wire đúng trước khi build feature. Pattern tham khảo từ 4 ST extension GitHub ([research](docs/research_st_extensions.md)).

---

## Cài đặt (SillyTavern)

1. Copy folder này vào `SillyTavern/scripts/extensions/third-party/st-anima/`
2. Reload ST → mở Extensions drawer
3. Panel "Anima" xuất hiện ở cột phải

## Verify wire

- Toggle "enabled" → reload → state giữ nguyên
- Gửi 1 message trong chat → counter "Messages received" tăng
- Log panel hiển thị `#0 user: ...` hoặc `#0 char: ...`

## Cấu trúc

```
manifest.json     # extension metadata
index.js          # jQuery boot, eventSource, settings
panel.html        # UI panel layout with placeholders
style.css         # dashboard styling
src/utils/        # logger.js, constants.js
characters/itto/  # test character (personality.json)
docs/specs/       # spec từng version
docs/research_*.md # research backing
```

## Lộ trình tiếp

- **v0.11.1** — Hello Anima, wire check
- **v0.12.2 (đây)** — Dashboard UI Shell (placeholders)
- **v0.13.0** — 1 LLM loop (user msg → echo)
- **v0.14.0** — Settings + persona override
- **v1.0.0** — 6 trụ cột theo VISION.md

Xem [VISION.md](docs/VISION.md) cho tầm nhìn dài hạn.

---

*Pattern copy từ [city-unit/st-extension-example](https://github.com/city-unit/st-extension-example). Chi tiết research trong [docs/research_st_extensions.md](docs/research_st_extensions.md).*
