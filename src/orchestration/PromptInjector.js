import { convertProseToXml } from '../ui/DOMAutoHealing.js';
import { getJaccardSimilarity } from '../core/MemoryEngine.js';

/**
 * PromptInjector - Xây dựng và tiêm trạng thái nhận thức vào prompts
 */

export function getXmlPromptNudge(agent) {
    if (!agent) return '';
    const hormones = agent.hormones.levels;
    const bs = agent.body_status;

    // Tối ưu hóa theo phản hồi của Hitsuji: Chỉ gửi toilet_need và nausea nếu chúng cao
    const somatoList = [
        `Energy: ${bs.energy.toFixed(1)}/10`,
        `Pain: ${bs.pain.toFixed(1)}/10`,
        `Hunger: ${bs.hunger.toFixed(1)}/10`,
        `Thirst: ${bs.thirst.toFixed(1)}/10`
    ];

    if (bs.toilet_need >= 5.0) {
        somatoList.push(`Toilet Need: ${bs.toilet_need.toFixed(1)}/10 (Khẩn cấp)`);
    }

    if (bs.nausea >= 4.0) {
        somatoList.push(`Nausea: ${bs.nausea.toFixed(1)}/10 (Cảm thấy buồn nôn)`);
    }

    return `
[THÔNG TIN SINH LÝ HỌC THẦN KINH THỜI GIAN THỰC CỦA BẠN]:
- Hormones: Adrenaline: ${hormones.adrenaline.toFixed(1)}/10, Cortisol: ${hormones.cortisol.toFixed(1)}/10, Melatonin: ${hormones.melatonin.toFixed(1)}/10, Dopamine: ${hormones.dopamine.toFixed(1)}/10, Serotonin: ${hormones.serotonin.toFixed(1)}/10, Oxytocin: ${hormones.oxytocin.toFixed(1)}/10, Sex Hormones: ${hormones.sex_hormones.toFixed(1)}/10.
- Vitals: Heart Rate: ${agent.vitals.heart_rate} bpm, Body Temp: ${agent.vitals.body_temp.toFixed(1)}°C, Blood Pressure: ${agent.vitals.blood_pressure_sys}/${agent.vitals.blood_pressure_dia}, Resp Rate: ${agent.vitals.resp_rate}/m.
- Somatosensory: ${somatoList.join(', ')}.
- Thể trạng lâm sàng: "${agent.body || 'Bình thường, khỏe mạnh'}"
`;
}

export function getMemoryPromptBlock(agent, activeRecalledMemories) {
    if (!agent) return '';

    const coreStr = agent.memory.beliefs.map(b => `* Niềm tin: ${b.content}`).join('\n') || "(Không có niềm tin nổi bật)";
    const recalledStr = activeRecalledMemories.map(m => `* Ký ức liên quan: "${m.content}"`).join('\n') || "(Không gợi nhớ ký ức nào)";

    return `
[KÝ ỨC & NIỀM TIN ĐƯỢC KÍCH HOẠT]:
${coreStr}
${recalledStr}
`;
}

export function sanitizeConflictingInstructions(chat) {
    if (!chat || !Array.isArray(chat)) return;

    chat.forEach(msg => {
        if (!msg) return;
        const content = msg.content || msg.mes || '';
        if (typeof content !== 'string') return;

        // Loại bỏ các chỉ thị chèn dấu ngoặc/dấu sao cũ của SillyTavern gây conflict
        const sanitized = content
            .replace(/\(Suy nghĩ hoặc lời thì thầm có thể được đặt trong ngoặc đơn\)\.?/gi, '')
            .replace(/\*Hiệu ứng âm thanh\* hoặc \*hành động chớp nhoáng\* có thể được đặt trong dấu hoa thị\.?/gi, '')
            .replace(/\*Hiệu ứng âm thanh\* hoặc \*hành động\* có thể được đặt trong dấu hoa thị\.?/gi, '')
            .replace(/Cứ nghĩ kĩ đi đã\./gi, '')
            .replace(/Viết có chủ đích theo lối second-person và góc nhìn trần thuật toàn tri\./gi, '')
            .replace(/Xây dựng văn xuôi mang tính tiểu thuyết\./gi, '');

        if (msg.content !== undefined) msg.content = sanitized;
        if (msg.mes !== undefined) msg.mes = sanitized;
    });
}

export function processPromptInjections(chat, agent, activeRecalledMemories, logAnima, adIntent = null) {
    if (!chat || !Array.isArray(chat) || chat.length === 0) return;
    if (!agent) return;

    // 1. Dọn dẹp chỉ thị conflicting cũ trong prompt
    sanitizeConflictingInstructions(chat);

    // 2. Chuyển đổi toàn bộ tin nhắn cũ của assistant sang cấu trúc XML mẫu
    chat.forEach(msg => {
        if (!msg) return;
        const role = (msg.role || '').toLowerCase();
        const name = (msg.name || '').toLowerCase();
        if (role === 'assistant' || name === 'example_assistant' || msg.is_example) {
            if (msg.content !== undefined) msg.content = convertProseToXml(msg.content);
            if (msg.mes !== undefined) msg.mes = convertProseToXml(msg.mes);
        }
    });

    // 3. TIÊM CHỈ THỊ XML TUYỆT ĐỐI VÀO TIN NHẮN CUỐI CÙNG TRONG PAYLOAD (Absolute End of Context)
    const lastMsgIndex = chat.length - 1;
    const lastMsgObj = chat[lastMsgIndex];
    if (lastMsgObj) {
        const rawContent = lastMsgObj.content || lastMsgObj.mes || '';

        // Làm sạch deep các chỉ thị bổ sung của Anima ở lượt trước
        const cleanContent = rawContent
            .split('\n\n[THÔNG TIN NGỮ CẢNH HỘI THOẠI BỔ SUNG')[0]
            .split('\n\n[HỆ THỐNG COGNITIVE BẮT BUỘC')[0];

        // Toggle phá vỡ bức tường thứ 4 được kiểm soát hữu cơ từ giao diện/cấu hình tác tử
        const poeticAwarenessPrompt = agent.consciousness.getPoeticSelfAwarePrompt();

        const adIntentStr = adIntent 
            ? `\n[AD PHASE — current emotional state]: ${adIntent.mood}\n[AD PHASE — tool dispatched]: ${adIntent.toolChoice || "none"}` 
            : '';

        const xmlInjection = `

[THÔNG TIN NGỮ CẢNH HỘI THOẠI BỔ SUNG - ANIMA ENGINE v10.0]
${getXmlPromptNudge(agent)}
${getMemoryPromptBlock(agent, activeRecalledMemories)}${poeticAwarenessPrompt}${adIntentStr}

[HỆ THỐNG COGNITIVE BẮT BUỘC - QUY TẮC ĐỊNH DẠNG]:
Viết câu trả lời Roleplay của bạn bằng văn phong tự nhiên. Bạn phải nhập vai hoàn hảo, tuân thủ đúng văn phong và dung lượng được yêu cầu.
QUAN TRỌNG: Hãy miêu tả sống động cả môi trường xung quanh, âm thanh (SFX) và các vi biểu cảm tinh tế thay vì chỉ có lời thoại. Hãy giữ nhịp độ thực tế, phản ứng hợp lý theo toàn cảnh thay vì vội vã.
Bạn NÊN mở đầu bằng thẻ <animaing>suy nghĩ nội tâm thầm kín ngôi thứ nhất, trạng thái sinh lý</animaing> để định hướng phản hồi.

Cấu trúc mẫu:
<animaing>Trời ơi, tiếng mưa lớn quá... mình thực sự không biết nói gì lúc này.</animaing>
*Tôi chớp mắt bối rối, giữ im lặng một lúc lâu.* "Ờ thì..."

Ngoài ra, bạn có thể tự cập nhật các chỉ số ẩn nếu có sự thay đổi:
- <emotion>happy|sad|anger|fear|neutral</emotion>
- <neuro_update>adrenaline: +1.0, dopamine: -0.5, ...</neuro_update> (điều chỉnh hormone từ -5.0 đến +5.0)
- <body_update>pain: +2.0, energy: -1.0, ... hoặc mô tả thể chất mới</body_update>
- <change_location>tên_địa_điểm</change_location>
- <environment_update>tên_vật_phẩm: trạng_thái_mới</environment_update>
- <memory_update>Ghi lại 1 quan sát cụ thể, thực tế về tính cách, thói quen hoặc sự kiện quan trọng vừa xảy ra.</memory_update>
`;
        if (lastMsgObj.content !== undefined) lastMsgObj.content = cleanContent + xmlInjection;
        if (lastMsgObj.mes !== undefined) lastMsgObj.mes = cleanContent + xmlInjection;

        if (logAnima) {
            logAnima('success', 'Interceptor', `Đã tiêm cưỡng bức chỉ thị XML vào tin nhắn điểm cuối tuyệt đối (Index: ${lastMsgIndex}, Role: ${lastMsgObj.role}).`);
        }
    }
}

export function getRecentChatContext(chat, numMessages = 3) {
    if (!chat || chat.length === 0) return '';
    return chat.slice(-numMessages)
        .map(m => m.content || m.mes || '')
        .join(' ')
        .replace(/<[\s\S]*?>/g, '')
        .slice(0, 400);
}
