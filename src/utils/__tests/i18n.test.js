import { describe, it, expect } from 'vitest';
import { translations } from '../i18n.js';

describe('i18n Translations Symmetry Tests', () => {
    it('should have all 4 supported languages defined', () => {
        expect(translations).toHaveProperty('en');
        expect(translations).toHaveProperty('vi');
        expect(translations).toHaveProperty('ja');
        expect(translations).toHaveProperty('zh');
    });

    it('should have symmetric keys across all languages', () => {
        const enKeys = Object.keys(translations.en).sort();
        const viKeys = Object.keys(translations.vi).sort();
        const jaKeys = Object.keys(translations.ja).sort();
        const zhKeys = Object.keys(translations.zh).sort();

        expect(viKeys).toEqual(enKeys);
        expect(jaKeys).toEqual(enKeys);
        expect(zhKeys).toEqual(enKeys);
    });

    it('should not contain empty translation values', () => {
        for (const lang of ['en', 'vi', 'ja', 'zh']) {
            for (const value of Object.values(translations[lang])) {
                expect(value).toBeDefined();
                expect(typeof value).toBe('string');
                expect(value.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
