# Anima Engine — ST Extension

> **v0.11.1** — Hello Anima (Scope A: wire check)
>
> Verify ST + Anima wire đúng trước khi build feature. Pattern tham khảo từ 4 ST extension GitHub ([research](../research_st_extensions.md)).

---

## Cài đặt (SillyTavern)

1. Copy folder này vào `SillyTavern/scripts/extensions/third-party/st-anima/`
2. Reload ST → mở Extensions drawer
3. Panel "Anima v0.11.1" xuất hiện ở cột phải

## Verify wire

- Toggle "enabled" → reload → state giữ nguyên
- Gửi 1 message trong chat → counter "Messages received" tăng
- Log panel hiển thị `#0 user: ...` hoặc `#0 char: ...`

## Cấu trúc

```
manifest.json     # 12 dòng — extension metadata
index.js          # 50 dòng — jQuery boot, eventSource, settings
panel.html        # 8 dòng — UI placeholder
style.css         # 50 dòng — minimal styling
package.json      # dev dependencies (vitest, eslint)
characters/itto/  # test character (personality.json)
docs/specs/       # spec từng version
docs/research_*.md # research backing
```

## Lộ trình tiếp

- **v0.11.1 (đây)** — Hello Anima, wire check
- **v0.12.0** — 1 LLM loop (user msg → echo)
- **v0.13.0** — Settings + persona override
- **v1.0.0** — 6 trụ cột theo VISION.md

Xem [VISION.md](VISION.md) cho tầm nhìn dài hạn.

---

*Pattern copy từ [city-unit/st-extension-example](https://github.com/city-unit/st-extension-example). Chi tiết research trong [docs/research_st_extensions.md](docs/research_st_extensions.md).*
