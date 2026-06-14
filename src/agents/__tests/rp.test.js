// src/agents/__tests__/rp.test.js
import { describe, it, expect } from 'vitest';
import { RPAgent } from '../rp.js';

describe('RPAgent Nudge Formatter Tests', () => {
    it('should format a valid nudge prompt containing environment details', () => {
        const mockPlan = {
            state_update: {
                active_emotion: 'Phấn khích 🎉'
            },
            plan: {
                segments: [
                    { type: 'dialogue', intent: 'Thách thức đối thủ' }
                ]
            }
        };

        const mockState = {
            active_emotion: 'Neutral 😐',
            environment: {
                location: 'Vũ đài thi đấu 🏟️',
                timeOfDay: 'Buổi chiều 🌅',
                weather: 'Nắng gắt ☀️'
            }
        };

        const nudge = RPAgent.formatNudge(mockPlan, mockState);

        expect(nudge).toContain('[BỐI CẢNH & TRẠNG THÁI HIỆN TẠI (ANIMA SYSTEM NOTE)]');
        expect(nudge).toContain('Vị trí hiện tại: Vũ đài thi đấu 🏟️');
        expect(nudge).toContain('Cảm xúc hiện tại: Phấn khích 🎉');
        expect(nudge).toContain('Đoạn 1 (dialogue): intent="Thách thức đối thủ"');
    });

    it('should return empty string if no plan is provided', () => {
        const nudge = RPAgent.formatNudge(null, {});
        expect(nudge).toBe('');
    });
});
