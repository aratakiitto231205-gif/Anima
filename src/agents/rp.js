// v0.12.3 — Role-Play Writer Prompt Nudge Formatter
import { logAnima } from '../utils/logger.js';

export const RPAgent = {
    // Translates the GM's structured plan and active emotion into a System Note (Prompt Nudge)
    formatNudge(plan, state) {
        logAnima('info', 'RP Agent', 'Đang định hình System Note (Narrative Nudge) từ Kế hoạch GM...');

        if (!plan) return '';

        const segmentsInfo = plan.plan?.segments || [];
        const segmentLines = segmentsInfo.map((s, idx) => 
            `- Đoạn ${idx + 1} (${s.type}): intent="${s.intent}"`
        ).join('\n');

        const nudge = `
[HỆ THỐNG PHẬN SỰ NHẬN THỨC ANIMA (NARRATIVE NUDGE)]
Hệ thống quản lý tiềm thức gửi tín hiệu bắt buộc nhân vật tuân thủ các quy tắc biểu diễn sau:

- Cảm xúc đích turn này: ${plan.state_update?.active_emotion || state.active_emotion}

[KẾ HOẠCH HỘI THOẠI BẮT BUỘC]
Nhân vật PHẢI cấu trúc câu trả lời tuân thủ cấu trúc phân đoạn sau:
${segmentLines}

QUY TẮC PHẢN HỒI:
1. Nhập vai tự nhiên, hòa mình vào giọng điệu của nhân vật, KHÔNG đề cập trực tiếp tới các thông số kĩ thuật này trong hội thoại.
`;

        return nudge.trim();
    }
};
