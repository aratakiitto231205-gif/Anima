// src/core/__tests__/state.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { AnimaState } from '../state.js';

describe('AnimaState Manager Tests', () => {
    beforeEach(() => {
        AnimaState.resetToDefault();
    });

    it('should initialize with correct default values', () => {
        expect(AnimaState.enabled).toBe(true);
        expect(AnimaState.active_emotion).toBe('Neutral 😐');
        expect(AnimaState.activePlan).toBeNull();
    });

    it('should update state from GM Agent output plan', () => {
        const mockPlan = {
            state_update: {
                active_emotion: 'Phấn khích 🎉'
            },
            plan: {
                appraisal: 'User rủ đi đấm nhau',
                segments: [{ type: 'dialogue', intent: 'Itto đồng ý!' }]
            }
        };

        AnimaState.updateFromGM(mockPlan);

        expect(AnimaState.active_emotion).toBe('Phấn khích 🎉');
        expect(AnimaState.activePlan.appraisal).toBe('User rủ đi đấm nhau');
    });

    it('should parse body_update and neuro_update from XML tags to change emotion', () => {
        // Test body_update XML tag parser helper
        AnimaState.applyXmlUpdates('body_update', 'emotion=Vui vẻ');
        expect(AnimaState.active_emotion).toBe('Vui vẻ');

        // Test neuro_update XML tag parser helper
        AnimaState.applyXmlUpdates('neuro_update', 'emotion=Giận dữ');
        expect(AnimaState.active_emotion).toBe('Giận dữ');
    });
});
