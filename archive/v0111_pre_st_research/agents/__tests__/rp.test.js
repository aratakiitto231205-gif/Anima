// v0.11.0 skeleton — sketch stage
import { describe, it, expect } from 'vitest';
import { writeProse } from '../rp.js';

describe('RP contract (skeleton)', () => {
    it('returns { prose, segments } for a valid plan', async () => {
        const plan = {
            segments: [
                { id: 1, type: 'dialogue', length_words: [5, 20], intent: 'respond', tags: ['dialogue'] },
            ],
        };
        const out = await writeProse({
            plan,
            characterStyle: { tone: 'casual' },
            memories: [],
            state: {},
            llmCall: async () => '',
        });
        expect(out).toHaveProperty('prose');
        expect(out).toHaveProperty('segments');
        expect(out.segments).toHaveLength(1);
    });

    it('does NOT plan — only writes what plan dictates', async () => {
        const plan = {
            segments: [
                { id: 1, type: 'action', length_words: [3, 10], intent: 'smile', tags: ['action'] },
                { id: 2, type: 'dialogue', length_words: [5, 15], intent: 'greet', tags: ['dialogue'] },
            ],
        };
        const out = await writeProse({
            plan,
            characterStyle: {},
            memories: [],
            state: {},
            llmCall: async () => '',
        });
        expect(out.segments).toHaveLength(2);
        expect(out.segments[0].tags_parsed.type).toBe('action');
        expect(out.segments[1].tags_parsed.type).toBe('dialogue');
    });
});
