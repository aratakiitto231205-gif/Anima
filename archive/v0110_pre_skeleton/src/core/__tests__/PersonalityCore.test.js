import { describe, it, expect } from 'vitest';
import { PersonalityCore } from '../PersonalityCore.js';

describe('PersonalityCore', () => {
    it('initializes and validates traits in 0-10 range', () => {
        const p = new PersonalityCore({ ambition: 8.5, extroversion: 10 });
        expect(p.getTrait('ambition')).toBe(8.5);
        expect(p.getTrait('extroversion')).toBe(10);
    });

    it('throws error for out-of-range trait values', () => {
        expect(() => new PersonalityCore({ ambition: 11 })).toThrow(/0 and 10/);
        expect(() => new PersonalityCore({ ambition: -1 })).toThrow(/0 and 10/);
        expect(() => new PersonalityCore({ ambition: 'NaN_string' })).toThrow(/0 and 10/);
    });

    it('returns default 5.0 for unknown trait', () => {
        const p = new PersonalityCore();
        expect(p.getTrait('unknown_trait')).toBe(5.0);
    });

    it('serializes traits perfectly', () => {
        const original = { ambition: 9, loyalty: 8 };
        const p = new PersonalityCore(original);
        expect(p.serialize()).toEqual(original);
        expect(p.getAllTraits()).toEqual(original);
    });
});
