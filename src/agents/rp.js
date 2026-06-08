// v0.12.2 — Role-Play Writer Prompt Nudge Formatter
import { logAnima } from '../utils/logger.js';

export const RPAgent = {
    // Translates the GM's structured plan and biological state into a System Note (Prompt Nudge)
    formatNudge(plan, state) {
        logAnima('info', 'RP Agent', 'Đang định hình System Note (Narrative Nudge) từ Kế hoạch GM...');

        if (!plan) return '';

        const segmentsInfo = plan.plan?.segments || [];
        const segmentLines = segmentsInfo.map((s, idx) => 
            `- Đoạn ${idx + 1} (${s.type}): intent="${s.intent}", tags=[${s.tags.join(', ')}], độ dài ước tính ≈ ${s.length_words} từ.`
        ).join('\n');

        const memoriesInfo = plan.recalled_memories || [];
        const memorySection = memoriesInfo.length > 0 
            ? `\n[KÝ ỨC PHỤ TRỢ (Gợi nhớ)]\nNhân vật đang gợi nhớ lại các sự kiện sau:\n${memoriesInfo.map(m => `- ${m}`).join('\n')}` 
            : '';

        const nudge = `
[HỆ THỐNG PHẬN SỰ NHẬN THỨC ANIMA (NARRATIVE NUDGE)]
Hệ thống quản lý tiềm thức gửi tín hiệu bắt buộc nhân vật tuân thủ các quy tắc biểu diễn sau:

[CẢM GIÁC THỂ TRẠNG]
- Năng lượng: ${state.body_status.energy.toFixed(1)}/10.0
- Đau đớn: ${state.body_status.pain.toFixed(1)}/10.0
- Cơn đói: ${state.body_status.hunger.toFixed(1)}/10.0
- Cảm giác nhiệt: ${state.body_status.temp_sensation}
- Nhịp tim: ${state.vitals.heart_rate} bpm (Trạng thái: ${state.vitals.heart_rate > 100 ? 'Đập nhanh' : 'Bình thường'})

[TÂM LÝ & CẢM XÚC HIỆN TẠI]
- Cảm xúc đích turn này: ${plan.state_update?.active_emotion || state.active_emotion}
${memorySection}

[KẾ HOẠCH HỘI THOẠI BẮT BUỘC]
Nhân vật PHẢI cấu trúc câu trả lời tuân thủ cấu trúc phân đoạn sau:
${segmentLines}

QUY TẮC PHẢN HỒI:
1. Nhập vai tự nhiên, hòa mình vào giọng điệu và lore vốn có của nhân vật, KHÔNG đề cập trực tiếp tới các thông số kĩ thuật này trong hội thoại.
2. Thể hiện cảm giác thể trạng và cảm xúc đích một cách tinh tế qua hành động và từ ngữ biểu đạt.
`;

        return nudge.trim();
    }
};
