// v0.13.3 — Game Master Agent (LLM-powered)
import { logAnima } from '../utils/logger.js';
import { LLMClient } from '../utils/llm.js';

export const GMAgent = {
    // Computes structured narrative plan & emotion updates based on chat context
    async planAndUpdate(chat, state, characterName, settings = {}) {
        logAnima('info', 'GM Agent', `Đang lập kịch bản kể chuyện cho ${characterName}...`);

        if (!chat || chat.length === 0) {
            return this.getFallbackPlan();
        }

        try {
            const context = this.buildContext(chat, state, characterName);
            const prompt = this.buildPrompt(context);

            const response = await LLMClient.generate(prompt, settings);
            const parsed = this.parseResponse(response);

            return parsed;
        } catch (err) {
            logAnima('error', 'GM Agent', `LLM call failed, using fallback: ${err.message}`);
            return this.getFallbackPlan();
        }
    },

    buildContext(chat, state, characterName) {
        const recentMessages = chat.slice(-5).map(m => ({
            role: m.is_user ? 'User' : characterName,
            text: m.mes || m.content || ''
        }));

        return {
            characterName,
            currentEmotion: state.active_emotion,
            currentEnv: state.environment,
            recentMessages
        };
    },

    buildPrompt(context) {
        const msgHistory = context.recentMessages
            .map(m => `${m.role}: ${m.text}`)
            .join('\n');

        return `Bạn là Game Master điều phối trải nghiệm nhập vai cho nhân vật "${context.characterName}".

Context hiện tại:
- Cảm xúc: ${context.currentEmotion}
- Môi trường: ${JSON.stringify(context.currentEnv)}

Lịch sử chat gần đây:
${msgHistory}

Hãy phân tích tình huống và đưa ra kế hoạch kể chuyện. Trả về JSON format SAU ĐÂY (không thêm text nào khác):
{
  "state_update": {
    "active_emotion": "Cảm xúc phù hợp (tiếng Việt + emoji)",
    "environment": {"location": "...", "weather": "...", "timeOfDay": "..."}
  },
  "plan": {
    "appraisal": "1-2 câu đánh giá tình huống",
    "segments": [{"type": "dialogue", "intent": "Ý định phản hồi của nhân vật"}]
  }
}`;
    },

    parseResponse(response) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        return JSON.parse(jsonMatch[0]);
    },

    getFallbackPlan() {
        return {
            state_update: {
                active_emotion: 'Bình thường 😊',
                environment: {}
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
