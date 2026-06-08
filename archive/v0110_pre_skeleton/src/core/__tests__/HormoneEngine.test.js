// v0.11.0
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HormoneEngine, applyHillEquation } from '../HormoneEngine.js';

describe('applyHillEquation', () => {
    it('returns current value when dosage is zero', () => {
        expect(applyHillEquation(5.0, 0)).toBe(5.0);
    });

    it('subtracts on negative dosage without going below 0', () => {
        expect(applyHillEquation(2.0, -3.0)).toBe(0.0);
        expect(applyHillEquation(1.0, -0.5)).toBe(0.5);
    });

    it('clamps to 10.0 max on saturation', () => {
        // currentVal=9.99, huge positive dosage → saturates at 10
        const result = applyHillEquation(9.99, 100.0);
        expect(result).toBeLessThanOrEqual(10.0);
    });

    it('uses Hill equation saturation kinetics for positive dosage', () => {
        // Hill: response = Emax * (D^n / (Kd^n + D^n))
        // Emax = 10 - 5 = 5; D=1.5, Kd=3, n=2
        // response = 5 * (1.5^2 / (3^2 + 1.5^2)) = 5 * (2.25 / 11.25) = 1.0
        // So 5 + 1 = 6 (roughly)
        const result = applyHillEquation(5.0, 1.5);
        expect(result).toBeGreaterThan(5.0);
        expect(result).toBeLessThan(10.0);
    });

    it('applies OXTR A/A polymorphism: 0.25x oxytocin sensitivity', () => {
        // Without genetics: 5 + ~1 = 6
        // With OXTR A/A: sensitivity 0.25, effective dosage reduced 4x → smaller response
        const baseline = applyHillEquation(5.0, 2.0, null, 'oxytocin');
        const resistant = applyHillEquation(5.0, 2.0, { oxtr: 'A/A' }, 'oxytocin');
        expect(resistant).toBeLessThan(baseline);
    });

    it('applies OXTR G/G polymorphism: 2.0x oxytocin sensitivity', () => {
        const baseline = applyHillEquation(5.0, 1.0, null, 'oxytocin');
        const hyper = applyHillEquation(5.0, 1.0, { oxtr: 'G/G' }, 'oxytocin');
        expect(hyper).toBeGreaterThan(baseline);
    });

    it('applies serotonin_transporter S/S stress sensitivity on cortisol', () => {
        // S/S = 1.8x cortisol response
        const baseline = applyHillEquation(5.0, 1.0, null, 'cortisol');
        const stressed = applyHillEquation(5.0, 1.0, { serotonin_transporter: 'S/S' }, 'cortisol');
        expect(stressed).toBeGreaterThan(baseline);
    });
});

describe('HormoneEngine', () => {
    let engine;
    beforeEach(() => {
        engine = new HormoneEngine();
    });

    it('initializes with base levels', () => {
        expect(engine.levels.adrenaline).toBe(2.0);
        expect(engine.levels.dopamine).toBe(5.0);
        expect(engine.levels.melatonin).toBe(2.0);
        expect(engine.levels.oxytocin).toBe(5.0);
    });

    it('initializes with 8 neurochemicals', () => {
        expect(Object.keys(engine.levels).length).toBe(8);
        expect(Object.keys(engine.levels).sort()).toEqual(
            ['adrenaline', 'cortisol', 'dopamine', 'endorphins', 'melatonin', 'oxytocin', 'serotonin', 'sex_hormones'].sort()
        );
    });

    describe('decay', () => {
        it('returns early if elapsed <= 0.01 minutes', () => {
            const before = { ...engine.levels };
            engine.decay(0.001);
            expect(engine.levels).toEqual(before);
        });

        it('decays toward base levels over time', () => {
            engine.levels.adrenaline = 9.0;
            engine.decay(60); // 1 hour
            expect(engine.levels.adrenaline).toBeLessThan(9.0);
            // Chaos jitter (±0.075) can bring value slightly below base, so use tolerance
            expect(engine.levels.adrenaline).toBeGreaterThanOrEqual(1.9);
        });

        it('clamps to 0-10 range', () => {
            engine.levels.adrenaline = 0.0;
            engine.decay(10000);
            expect(engine.levels.adrenaline).toBeGreaterThanOrEqual(0.0);
        });

        it('applies COMT Val/Val (4x dopamine decay)', () => {
            engine.levels.dopamine = 9.0;
            const baseline = new HormoneEngine();
            baseline.levels.dopamine = 9.0;
            // Warrior (Val/Val) decays faster
            engine.decay(30, '', { comt: 'Val/Val' });
            baseline.decay(30, '', { comt: 'Met/Met' });
            // Warrior should have lower dopamine after 30 min
            expect(engine.levels.dopamine).toBeLessThan(baseline.levels.dopamine);
        });

        it('auto-accumulates melatonin at night (22:00-05:00)', () => {
            engine.levels.melatonin = 2.0;
            // Mock Date to be 23:00
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-08T23:00:00'));
            engine.decay(10);
            vi.useRealTimers();
            expect(engine.levels.melatonin).toBeGreaterThan(2.0);
        });
    });

    describe('evaluateEvent', () => {
        it('returns false for unknown tags', () => {
            const changed = engine.evaluateEvent(new Set(['#unknown_tag']));
            expect(changed).toBe(false);
        });

        it('#danger raises adrenaline and cortisol, drops melatonin', () => {
            engine.levels.adrenaline = 2.0;
            engine.levels.cortisol = 2.0;
            engine.levels.melatonin = 5.0;
            engine.evaluateEvent(new Set(['#danger']));
            expect(engine.levels.adrenaline).toBeGreaterThan(2.0);
            expect(engine.levels.cortisol).toBeGreaterThan(2.0);
            expect(engine.levels.melatonin).toBeLessThan(5.0);
        });

        it('#intimate raises oxytocin and serotonin', () => {
            engine.levels.oxytocin = 5.0;
            engine.levels.serotonin = 5.0;
            engine.evaluateEvent(new Set(['#intimate']));
            expect(engine.levels.oxytocin).toBeGreaterThan(5.0);
            expect(engine.levels.serotonin).toBeGreaterThan(5.0);
        });

        it('#reward raises dopamine', () => {
            engine.levels.dopamine = 5.0;
            engine.evaluateEvent(new Set(['#reward']));
            expect(engine.levels.dopamine).toBeGreaterThan(5.0);
        });

        it('#betray spikes cortisol, drops dopamine + serotonin + oxytocin', () => {
            engine.levels.cortisol = 2.0;
            engine.levels.dopamine = 5.0;
            engine.levels.serotonin = 5.0;
            engine.levels.oxytocin = 5.0;
            engine.evaluateEvent(new Set(['#betray']));
            expect(engine.levels.cortisol).toBeGreaterThan(2.0);
            expect(engine.levels.dopamine).toBeLessThan(5.0);
            expect(engine.levels.serotonin).toBeLessThan(5.0);
            expect(engine.levels.oxytocin).toBeLessThan(5.0);
        });

        it('#sleep raises melatonin, drops adrenaline', () => {
            engine.levels.melatonin = 2.0;
            engine.levels.adrenaline = 8.0;
            engine.evaluateEvent(new Set(['#sleep']));
            expect(engine.levels.melatonin).toBeGreaterThan(2.0);
            expect(engine.levels.adrenaline).toBeLessThan(8.0);
        });

        it('handles multiple tags in one call', () => {
            engine.levels.dopamine = 5.0;
            engine.levels.endorphins = 3.0;
            engine.evaluateEvent(new Set(['#laugh', '#reward']));
            expect(engine.levels.dopamine).toBeGreaterThan(5.0);
            expect(engine.levels.endorphins).toBeGreaterThan(3.0);
        });
    });

    describe('serialize', () => {
        it('returns a copy of levels', () => {
            const serialized = engine.serialize();
            expect(serialized).toEqual(engine.levels);
            // Mutating serialized should not affect engine
            serialized.adrenaline = 999;
            expect(engine.levels.adrenaline).not.toBe(999);
        });
    });
});
