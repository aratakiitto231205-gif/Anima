// v0.11.0 skeleton — sketch stage
import { describe, it, expect } from 'vitest';
import { planAndUpdate } from '../gm.js';

describe('GM contract (skeleton)', () => {
    it('returns object with required fields', async () => {
        const out = await planAndUpdate({
            userMessage: 'Itto ơi dậy đi',
            chat: [],
            state: {},
            agent: { memories: { ltm: [] } },
        });
        expect(out).toHaveProperty('appraisal');
        expect(out).toHaveProperty('state_update');
        expect(out).toHaveProperty('recalled_memories');
        expect(out).toHaveProperty('plan');
        expect(out).toHaveProperty('next_action');
    });

    it('plan has at least 1 segment with valid structure', async () => {
        const out = await planAndUpdate({
            userMessage: 'hi',
            chat: [],
            state: {},
            agent: { memories: { ltm: [] } },
        });
        expect(out.plan.segments).toBeInstanceOf(Array);
        expect(out.plan.segments.length).toBeGreaterThanOrEqual(1);
        const seg = out.plan.segments[0];
        expect(seg).toHaveProperty('id');
        expect(seg).toHaveProperty('type');
        expect(seg).toHaveProperty('length_words');
        expect(seg).toHaveProperty('intent');
        expect(seg).toHaveProperty('tags');
    });
});
