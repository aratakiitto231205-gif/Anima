// v0.12.3 — Game Master Agent (Simplified Stub/Contract)
import { logAnima } from '../utils/logger.js';

export const GMAgent = {
    // Computes structured narrative plan & emotion updates based on chat context
    async planAndUpdate(chat, state, characterName) {
        logAnima('info', 'GM Agent', `Đang lập kịch bản kể chuyện cho ${characterName}...`);

        if (!chat || chat.length === 0) {
            return this.getFallbackPlan();
        }

        const lastMessageObj = chat[chat.length - 1];
        const lastUserText = lastMessageObj?.mes || '';

        let activeEmotion = 'Bình thường 😊';
        let appraisal = 'Cuộc hội thoại diễn ra bình thường.';

        if (lastUserText.toLowerCase().includes('đấm') || lastUserText.toLowerCase().includes('đánh')) {
            activeEmotion = 'Hứng khởi / Phấn khích 🎉🔥';
            appraisal = 'Người dùng rủ đi đấm nhau, kích hoạt sự hăng hái bẩm sinh của Itto.';
        } else if (lastUserText.toLowerCase().includes('mệt') || lastUserText.toLowerCase().includes('ngủ')) {
            activeEmotion = 'Lơ mơ / Buồn ngủ 😴💤';
            appraisal = 'Người dùng nhắc đến sự mệt mỏi, Itto bắt đầu thấy dí mắt.';
        }

        return {
            state_update: {
                active_emotion: activeEmotion
            },
            plan: {
                appraisal,
                segments: [
                    {
                        type: 'dialogue',
                        intent: `Phản hồi với thái độ ${activeEmotion}`
                    }
                ]
            }
        };
    },

    getFallbackPlan() {
        return {
            state_update: {
                active_emotion: 'Bình thường 😊'
            },
            plan: {
                appraisal: 'Bối cảnh mặc định.',
                segments: [
                    { type: 'dialogue', intent: 'Chào hỏi thông thường' }
                ]
            }
        };
    }
};
