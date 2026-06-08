import { describe, it, expect } from 'vitest';
import { MentalStateEngine } from '../MentalStateEngine.js';

describe('MentalStateEngine', () => {
    it('returns crisis state when inCrisis is true', () => {
        const engine = new MentalStateEngine({}, {});
        const result = engine.compute(true);
        expect(result).toBe('Khủng hoảng Nhận thức (Hệ niềm tin vỡ vụn) ⚠️');
    });

    it('computes vitals correctly from hormones and body status', () => {
        const hormones = {
            levels: {
                adrenaline: 5.0,
                cortisol: 5.0,
                melatonin: 2.0,
            },
        };
        const bodyStatus = {
            pain: 3.0,
            dyspnea: 2.0,
        };
        const vitals = {};
        const engine = new MentalStateEngine(hormones, bodyStatus, vitals);
        engine.compute(false);

        // Heart rate formula: 70 + (ad * 6.5) + (pain * 3.5) + (dyspnea * 4.0) - (mel * 2.0)
        // 70 + (5.0 * 6.5) + (3.0 * 3.5) + (2.0 * 4.0) - (2.0 * 2.0)
        // 70 + 32.5 + 10.5 + 8.0 - 4.0 = 117
        expect(vitals.heart_rate).toBe(117);

        // Temp: 36.5 + (pain * 0.15) + (ad * 0.08) - (mel * 0.05)
        // 36.5 + (3.0 * 0.15) + (5.0 * 0.08) - (2.0 * 0.05)
        // 36.5 + 0.45 + 0.40 - 0.10 = 37.25 -> rounded/fixed to 1 decimal: 37.3
        expect(vitals.body_temp).toBe(37.3);
        expect(bodyStatus.temp_sensation).toBe('Bình thường 🧘');
    });

    it('clamps vitals within safe biological limits', () => {
        const hormones = {
            levels: {
                adrenaline: 40.0, // extremely high
                cortisol: 20.0,
                melatonin: 0.1,
            },
        };
        const bodyStatus = {
            pain: 10.0,
            dyspnea: 10.0,
        };
        const vitals = {};
        const engine = new MentalStateEngine(hormones, bodyStatus, vitals);
        engine.compute(false);

        expect(vitals.heart_rate).toBe(180); // max clamp limit
        expect(vitals.body_temp).toBe(40.5); // max clamp limit
        expect(bodyStatus.temp_sensation).toBe('Sốt cao / Nóng bức 🥵');
    });

    it('maps high/low hormones to correct emotions', () => {
        const hormones = {
            levels: {
                adrenaline: 1.0,
                cortisol: 1.0,
                dopamine: 8.5,
                serotonin: 8.5,
                melatonin: 2.0,
            },
        };
        const bodyStatus = {};
        const engine = new MentalStateEngine(hormones, bodyStatus);
        const state = engine.compute(false);
        // Serene happy test: dopamine >= 6.5 && serotonin >= 6.5 && adrenaline < 2.5
        expect(state).toContain('Hài lòng / Bình yên');
    });

    it('obeys priority order (first matching rule wins)', () => {
        const hormones = {
            levels: {
                adrenaline: 6.0,
                cortisol: 6.0,
                oxytocin: 8.0, // compassionate_sad requires cortisol >= 5.0 && oxytocin >= 6.5
                dopamine: 1.0,
                serotonin: 1.0,
                melatonin: 1.0,
            },
        };
        const bodyStatus = {};
        const engine = new MentalStateEngine(hormones, bodyStatus);
        const state = engine.compute(false);
        // Since compassionate_sad rule is at index 0 (very high priority), it should win over other rules
        expect(state).toContain('Buồn bã Đồng cảm');
    });

    it('returns default balanced state when no rules match', () => {
        const hormones = {
            levels: {
                adrenaline: 1.0,
                cortisol: 1.0,
                dopamine: 4.0,
                serotonin: 4.0,
                oxytocin: 1.0,
                melatonin: 1.0,
            },
        };
        const bodyStatus = {};
        const engine = new MentalStateEngine(hormones, bodyStatus);
        const state = engine.compute(false);
        expect(state).toBe('Cân bằng / Yên bình 😐');
    });
});
