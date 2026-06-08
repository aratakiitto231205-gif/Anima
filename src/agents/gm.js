// v0.12.2 — Game Master Agent (Stub/Contract)
import { logAnima } from '../utils/logger.js';

export const GMAgent = {
    // Computes structured narrative plan & physiological state updates based on chat context
    async planAndUpdate(chat, state, characterName) {
        logAnima('info', 'GM Agent', `Đang lập kế hoạch kể chuyện cho ${characterName}...`);

        if (!chat || chat.length === 0) {
            return this.getFallbackPlan();
        }

        const lastMessageObj = chat[chat.length - 1];
        const lastUserText = lastMessageObj?.mes || '';

        // Simple context analysis (stub)
        let activeEmotion = 'Bình thường 😊';
        let heartRateDelta = 0;
        let appraisal = 'Cuộc hội thoại diễn ra bình thường.';
        let recalledMemory = 'Nhớ về lần đầu gặp mặt thân thiện.';

        if (lastUserText.toLowerCase().includes('đấm') || lastUserText.toLowerCase().includes('đánh')) {
            activeEmotion = 'Hào hứng / Phấn khích 🎉🔥';
            heartRateDelta = 15;
            appraisal = 'Người dùng rủ đi đấm nhau, kích hoạt adrenaline bẩm sinh của Itto.';
            recalledMemory = 'Hắn nhớ về các trận đấu hào hùng với Kujou Sara.';
        } else if (lastUserText.toLowerCase().includes('mệt') || lastUserText.toLowerCase().includes('ngủ')) {
            activeEmotion = 'Lơ mơ / Buồn ngủ 😴💤';
            heartRateDelta = -5;
            appraisal = 'Người dùng nhắc đến sự mệt mỏi, cộng hưởng nhịp sinh học.';
            recalledMemory = 'Nhớ lại những đêm thức trắng cày game.';
        }

        return {
            appraisal,
            state_update: {
                vitals_nudge: {
                    heart_rate_delta: heartRateDelta,
                    energy_delta: -0.1,
                    pain_delta: 0.0
                },
                active_emotion: activeEmotion
            },
            recalled_memories: [recalledMemory],
            plan: {
                segments: [
                    {
                        id: "seg1",
                        type: "dialogue",
                        length_words: 20,
                        intent: `Phản hồi với tâm trạng ${activeEmotion}`,
                        tags: ["colloquial", "loud"]
                    }
                ]
            },
            next_action: "rp"
        };
    },

    getFallbackPlan() {
        return {
            appraisal: 'Bối cảnh mặc định.',
            state_update: {
                vitals_nudge: { heart_rate_delta: 0, energy_delta: 0.0, pain_delta: 0.0 },
                active_emotion: 'Bình thường 😊'
            },
            recalled_memories: [],
            plan: {
                segments: [
                    { id: "default_seg", type: "dialogue", length_words: 15, intent: "Chào hỏi thông thường", tags: [] }
                ]
            },
            next_action: "rp"
        };
    }
};
