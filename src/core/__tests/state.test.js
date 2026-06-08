// src/core/__tests__/state.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { AnimaState } from '../state.js';

describe('AnimaState Manager Tests', () => {
    beforeEach(() => {
        AnimaState.resetToDefault();
    });

    it('should initialize with correct default values', () => {
        expect(AnimaState.vitals.heart_rate).toBe(75);
        expect(AnimaState.body_status.energy).toBe(10.0);
        expect(AnimaState.body_status.pain).toBe(0.0);
        expect(AnimaState.hormones.dopamine).toBe(5.0);
        expect(AnimaState.mental_state).toBe('Cân bằng / Yên bình 😐');
    });

    it('should apply gentle decay correctly over elapsed time', () => {
        // Boost hormone levels to test decay towards baseline
        AnimaState.hormones.adrenaline = 8.0; // baseline is 2.0
        AnimaState.hormones.dopamine = 1.0;    // baseline is 5.0

        // Simulate 60 minutes passing
        AnimaState.decay(60);

        // Adrenaline should decay towards 2.0 (8.0 - 60 * 0.01 = 7.4)
        expect(AnimaState.hormones.adrenaline).toBeLessThan(8.0);
        expect(AnimaState.hormones.adrenaline).toBeGreaterThan(2.0);

        // Dopamine should recover towards 5.0 (1.0 + 60 * 0.01 = 1.6)
        expect(AnimaState.hormones.dopamine).toBeGreaterThan(1.0);
        expect(AnimaState.hormones.dopamine).toBeLessThan(5.0);

        // Energy decays, hunger/thirst increase
        expect(AnimaState.body_status.energy).toBeLessThan(10.0);
        expect(AnimaState.body_status.hunger).toBeGreaterThan(0.0);
    });

    it('should clamp toilet_need at 6.0 in soft ticks decay', () => {
        AnimaState.body_status.toilet_need = 5.9;
        
        // Decay for 500 minutes.
        // Formula: 5.9 + 500 * 0.0005 = 6.15 -> but clamped at 6.0!
        AnimaState.decay(500);

        expect(AnimaState.body_status.toilet_need).toBe(6.0);
    });

    it('should update state from GM Agent output plan', () => {
        const mockPlan = {
            state_update: {
                vitals_nudge: { heart_rate_delta: 10, energy_delta: -1.0, pain_delta: 2.0 },
                active_emotion: 'Phấn khích 🎉'
            },
            recalled_memories: ['Ký ức chiến đấu'],
            plan: {
                segments: [{ id: 'seg1', type: 'dialogue', length_words: 10, intent: 'test', tags: [] }]
            }
        };

        AnimaState.updateFromGM(mockPlan);

        expect(AnimaState.vitals.heart_rate).toBe(85); // 75 + 10
        expect(AnimaState.body_status.energy).toBe(9.0); // 10.0 - 1.0
        expect(AnimaState.body_status.pain).toBe(2.0); // 0.0 + 2.0
        expect(AnimaState.active_emotion).toBe('Phấn khích 🎉');
        expect(AnimaState.recalled_memories).toContain('Ký ức chiến đấu');
    });

    it('should parse body_update and neuro_update from XML tags', () => {
        // Test body_update XML tag parser helper
        AnimaState.applyXmlUpdates('body_update', 'energy=4.0, pain=5.5, hunger=2.0');
        expect(AnimaState.body_status.energy).toBe(4.0);
        expect(AnimaState.body_status.pain).toBe(5.5);
        expect(AnimaState.body_status.hunger).toBe(2.0);

        // Test neuro_update XML tag parser helper
        AnimaState.applyXmlUpdates('neuro_update', 'dopamine=8.0, adrenaline=1.0');
        expect(AnimaState.hormones.dopamine).toBe(8.0);
        expect(AnimaState.hormones.adrenaline).toBe(1.0);
    });
});
