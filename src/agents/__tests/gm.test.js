// src/agents/__tests__/gm.test.js
import { describe, it, expect } from 'vitest';
import { GMAgent } from '../gm.js';

describe('GMAgent Planner Tests', () => {
    it('should generate a valid plan for a fighting/action prompt', async () => {
        const mockChat = [{ role: 'user', mes: 'Ê Itto, đi đấm nhau không?' }];
        const mockState = {};

        const plan = await GMAgent.planAndUpdate(mockChat, mockState, 'Itto');

        expect(plan.appraisal).toContain('đấm nhau');
        expect(plan.state_update.vitals_nudge.heart_rate_delta).toBe(15);
        expect(plan.state_update.active_emotion).toContain('Phấn khích');
        expect(plan.recalled_memories[0]).toContain('Kujou Sara');
        expect(plan.plan.segments.length).toBeGreaterThan(0);
        expect(plan.plan.segments[0].type).toBe('dialogue');
    });

    it('should generate a tired/sleep plan when prompt mentions fatigue', async () => {
        const mockChat = [{ role: 'user', mes: 'Ta buồn ngủ quá, đi ngủ thôi.' }];
        const mockState = {};

        const plan = await GMAgent.planAndUpdate(mockChat, mockState, 'Itto');

        expect(plan.state_update.vitals_nudge.heart_rate_delta).toBe(-5);
        expect(plan.state_update.active_emotion).toContain('Buồn ngủ');
    });

    it('should return a valid fallback plan when chat history is empty', async () => {
        const plan = await GMAgent.planAndUpdate([], {}, 'Itto');
        expect(plan.appraisal).toBe('Bối cảnh mặc định.');
        expect(plan.plan.segments[0].id).toBe('default_seg');
    });
});
