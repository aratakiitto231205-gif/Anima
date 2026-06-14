// v0.12.3 — Role-Play Writer Prompt Nudge Formatter
import { logAnima } from '../utils/logger.js';

export const RPAgent = {
    // Translates the GM's structured plan, active emotion, and environment into a clean prompt nudge
    formatNudge(plan, state) {
        logAnima('info', 'RP Agent', 'Đang định hình System Note (Narrative Nudge) từ Kế hoạch GM...');

        if (!plan) return '';

        const env = state.environment || {};
        const activeEmotion = plan.state_update?.active_emotion || state.active_emotion || 'Bình thường 😊';
        
        const segmentsInfo = plan.plan?.segments || [];
        const segmentLines = segmentsInfo.map((s, idx) => 
            `- Đoạn ${idx + 1} (${s.type}): intent="${s.intent}"`
        ).join('\n');

        const nudge = `
[BỐI CẢNH & TRẠNG THÁI HIỆN TẠI (ANIMA SYSTEM NOTE)]
Hệ thống giám sát thực tại cung cấp thông tin khách quan bắt buộc nhân vật tuân thủ:
- Vị trí hiện tại: ${env.location || 'Mặc định'}
- Thời gian: ${env.timeOfDay || 'Mặc định'}
- Thời tiết: ${env.weather || 'Mặc định'}
- Cảm xúc hiện tại: ${activeEmotion}

[KẾ HOẠCH HỘI THOẠI]
Nhân vật cần cấu trúc câu trả lời tuân thủ cấu trúc sau:
${segmentLines}

QUY TẮC PHẢN HỒI:
1. Nhập vai tự nhiên, hòa mình vào giọng điệu nhân vật và phản hồi dựa trên bối cảnh khách quan ở trên.
2. KHÔNG tự ý thay đổi bối cảnh hoặc tự bịa ra địa điểm mới trái với bối cảnh hiện tại.
3. KHÔNG đề cập trực tiếp đến các thông số kỹ thuật này trong hội thoại.
`;

        return nudge.trim();
    }
};
