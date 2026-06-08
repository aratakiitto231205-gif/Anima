/**
 * MemoryEngine.test.js - Comprehensive unit tests for MemoryEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEngine, getKeywords, getJaccardSimilarity, findNewestMemory } from './MemoryEngine.js';

describe('MemoryEngine - Helper Functions', () => {
    describe('getKeywords', () => {
        it('should extract keywords from text', () => {
            const text = 'Tôi yêu lập trình JavaScript';
            const keywords = getKeywords(text);
            expect(keywords).toContain('yêu');
            expect(keywords).toContain('lập');
            expect(keywords).toContain('trình');
            expect(keywords).toContain('javascript');
        });

        it('should filter out stop words', () => {
            const text = 'Tôi là một lập trình viên';
            const keywords = getKeywords(text);
            expect(keywords).not.toContain('tôi');
            expect(keywords).not.toContain('là');
            expect(keywords).not.toContain('một');
        });

        it('should handle empty text', () => {
            expect(getKeywords('')).toEqual([]);
            expect(getKeywords(null)).toEqual([]);
            expect(getKeywords(undefined)).toEqual([]);
        });

        it('should normalize punctuation', () => {
            const text = 'Hello, world! How are you?';
            const keywords = getKeywords(text);
            expect(keywords).toContain('hello');
            expect(keywords).toContain('world');
            expect(keywords).toContain('how');
        });
    });

    describe('getJaccardSimilarity', () => {
        it('should calculate similarity between similar texts', () => {
            const text1 = 'I love programming in JavaScript';
            const text2 = 'I enjoy programming with JavaScript';
            const similarity = getJaccardSimilarity(text1, text2);
            expect(similarity).toBeGreaterThan(0.3);
        });

        it('should return 0 for completely different texts', () => {
            const text1 = 'I love programming';
            const text2 = 'The weather is nice';
            const similarity = getJaccardSimilarity(text1, text2);
            expect(similarity).toBeLessThan(0.2);
        });

        it('should return 0 for empty texts', () => {
            expect(getJaccardSimilarity('', 'test')).toBe(0);
            expect(getJaccardSimilarity('test', '')).toBe(0);
        });

        it('should return high similarity for identical texts', () => {
            const text = 'programming JavaScript';
            const similarity = getJaccardSimilarity(text, text);
            expect(similarity).toBe(1.0);
        });
    });
});

describe('MemoryEngine - Memory Creation', () => {
    let engine;
    let mockHormones;

    beforeEach(() => {
        engine = new MemoryEngine();
        mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };
    });

    it('should create STM entry with normal emotional intensity', () => {
        const result = engine.learnMemoryDynamically('I learned something new today', 0, mockHormones);

        expect(result).toBe('STM_CREATED');
        expect(engine.stm_buffer).toHaveLength(1);
        expect(engine.stm_buffer[0].content).toBe('I learned something new today');
    });

    it('should create memory with required fields', () => {
        engine.learnMemoryDynamically('Test memory', 0, mockHormones);

        const memory = engine.stm_buffer[0];
        expect(memory).toHaveProperty('id');
        expect(memory).toHaveProperty('content');
        expect(memory).toHaveProperty('timestamp');
        expect(memory).toHaveProperty('anchored_message_index');
        expect(memory).toHaveProperty('weight');
        expect(memory).toHaveProperty('count');
        expect(memory).toHaveProperty('emotions');
    });

    it('should include emotion stamps in memory', () => {
        engine.learnMemoryDynamically('Emotional memory', 0, mockHormones);

        const memory = engine.stm_buffer[0];
        expect(memory.emotions).toHaveProperty('joy');
        expect(memory.emotions).toHaveProperty('sadness');
        expect(memory.emotions).toHaveProperty('fear');
        expect(memory.emotions).toHaveProperty('anger');
        expect(memory.emotions).toHaveProperty('nostalgia');
    });

    it('should not create memory for very short text', () => {
        const result = engine.learnMemoryDynamically('Hi', 0, mockHormones);
        expect(result).toBe(false);
        expect(engine.stm_buffer).toHaveLength(0);
    });

    it('should not create memory for empty text', () => {
        const result = engine.learnMemoryDynamically('', 0, mockHormones);
        expect(result).toBe(false);
        expect(engine.stm_buffer).toHaveLength(0);
    });

    it('should create LTM directly with extreme emotional intensity', () => {
        const extremeHormones = {
            adrenaline: 9.0,
            cortisol: 8.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 1.0,
        };

        const result = engine.learnMemoryDynamically('Traumatic event', 0, extremeHormones);

        expect(result).toBe('LTM');
        expect(engine.recallable_drawer).toHaveLength(1);
        expect(engine.stm_buffer).toHaveLength(0);
        expect(engine.recallable_drawer[0].weight).toBe(9.0);
    });
});

describe('MemoryEngine - STM to LTM Consolidation', () => {
    let engine;
    let mockHormones;

    beforeEach(() => {
        engine = new MemoryEngine();
        mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };
    });

    it('should consolidate STM to LTM after reaching habit threshold', () => {
        const text = 'I practice coding every day';

        // Learn the same memory multiple times
        for (let i = 0; i < 3; i++) {
            engine.learnMemoryDynamically(text, i, mockHormones);
        }

        expect(engine.recallable_drawer).toHaveLength(1);
        expect(engine.stm_buffer).toHaveLength(0);
    });

    it('should apply Hebbian strengthening on repeated exposure', () => {
        const text = 'Important concept';

        engine.learnMemoryDynamically(text, 0, mockHormones);
        const initialWeight = engine.stm_buffer[0].weight;

        engine.learnMemoryDynamically(text, 1, mockHormones);
        const reinforcedWeight = engine.stm_buffer[0].weight;

        expect(reinforcedWeight).toBeGreaterThan(initialWeight);
        expect(engine.stm_buffer[0].count).toBe(2);
    });

    it('should return STM_REINFORCED when strengthening existing memory', () => {
        engine.learnMemoryDynamically('Repeated memory', 0, mockHormones);
        const result = engine.learnMemoryDynamically('Repeated memory', 1, mockHormones);

        expect(result).toBe('STM_REINFORCED');
    });

    it('should return LTM_CONSOLIDATED when moving to long-term', () => {
        const text = 'Habitual thought';

        engine.learnMemoryDynamically(text, 0, mockHormones);
        engine.learnMemoryDynamically(text, 1, mockHormones);
        const result = engine.learnMemoryDynamically(text, 2, mockHormones);

        expect(result).toBe('LTM_CONSOLIDATED');
    });

    it('should respect custom habit threshold from genetics', () => {
        const genetics = { drd4: '7R+' };
        engine = new MemoryEngine(null, genetics);

        expect(engine.habit_threshold).toBe(5);

        const text = 'Novelty seeking behavior';
        for (let i = 0; i < 4; i++) {
            engine.learnMemoryDynamically(text, i, mockHormones);
        }

        // Should still be in STM with higher threshold
        expect(engine.stm_buffer).toHaveLength(1);
        expect(engine.recallable_drawer).toHaveLength(0);
    });

    it('should consolidate similar memories using Jaccard similarity', () => {
        engine.learnMemoryDynamically('I love programming in JavaScript', 0, mockHormones);
        const result = engine.learnMemoryDynamically('I enjoy programming with JavaScript', 1, mockHormones);

        expect(result).toBe('STM_REINFORCED');
        expect(engine.stm_buffer).toHaveLength(1);
        expect(engine.stm_buffer[0].count).toBe(2);
    });
});

describe('MemoryEngine - Forgetting Curve (Ebbinghaus)', () => {
    let engine;
    let mockHormones;

    beforeEach(() => {
        engine = new MemoryEngine();
        mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };
    });

    it('should decay STM weight over time', () => {
        engine.learnMemoryDynamically('Temporary memory', 0, mockHormones);
        const initialWeight = engine.stm_buffer[0].weight;

        engine.decayShortTermMemory(10); // 10 minutes elapsed

        const decayedWeight = engine.stm_buffer[0].weight;
        expect(decayedWeight).toBeLessThan(initialWeight);
    });

    it('should remove memories below threshold after decay', () => {
        engine.learnMemoryDynamically('Weak memory', 0, mockHormones);

        engine.decayShortTermMemory(30); // 30 minutes elapsed

        expect(engine.stm_buffer).toHaveLength(0);
    });

    it('should not decay with very small time intervals', () => {
        engine.learnMemoryDynamically('Recent memory', 0, mockHormones);
        const initialWeight = engine.stm_buffer[0].weight;

        engine.decayShortTermMemory(0.01); // Very small interval

        expect(engine.stm_buffer[0].weight).toBe(initialWeight);
    });

    it('should decay LTM gradually with disuse', () => {
        engine.recallable_drawer.push({
            id: 'test_mem',
            content: 'Old memory',
            weight: 8.0,
            count: 5,
        });

        engine.decayLongTermMemory();

        expect(engine.recallable_drawer[0].weight).toBeLessThan(8.0);
        expect(engine.recallable_drawer[0].weight).toBeGreaterThanOrEqual(2.0);
    });

    it('should not decay LTM below minimum threshold', () => {
        engine.recallable_drawer.push({
            id: 'test_mem',
            content: 'Stable memory',
            weight: 2.5,
            count: 3,
        });

        for (let i = 0; i < 10; i++) {
            engine.decayLongTermMemory();
        }

        expect(engine.recallable_drawer[0].weight).toBeGreaterThanOrEqual(2.0);
    });

    it('should preserve memories with rehearsal', () => {
        engine.learnMemoryDynamically('Rehearsed memory', 0, mockHormones);

        // Rehearse before decay
        engine.learnMemoryDynamically('Rehearsed memory', 1, mockHormones);
        const weightAfterRehearsal = engine.stm_buffer[0].weight;
        expect(weightAfterRehearsal).toBeGreaterThan(0);

        engine.decayShortTermMemory(5);

        expect(engine.stm_buffer[0].weight).toBeGreaterThan(0);
        expect(engine.stm_buffer).toHaveLength(1);
    });
});

describe('MemoryEngine - Memory Associations', () => {
    let engine;

    beforeEach(() => {
        engine = new MemoryEngine();
    });

    it('should link related memories through Jaccard similarity', () => {
        const mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };

        // These two texts share enough keywords (>= 0.3 Jaccard) to be treated as
        // the same memory — the engine's association mechanism merges them into one
        // reinforced STM entry rather than storing duplicates.
        engine.learnMemoryDynamically('JavaScript is a programming language', 0, mockHormones);
        const result = engine.learnMemoryDynamically('Python is also a programming language', 1, mockHormones);

        // The engine recognises the association and reinforces the existing entry
        expect(result).toBe('STM_REINFORCED');
        expect(engine.stm_buffer).toHaveLength(1);
        expect(engine.stm_buffer[0].count).toBe(2);
    });

    it('should store unrelated memories as separate STM entries', () => {
        const mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };

        // These texts share no keywords, so Jaccard similarity is 0 — stored separately
        engine.learnMemoryDynamically('JavaScript excels at frontend web development', 0, mockHormones);
        engine.learnMemoryDynamically('Cooking pasta requires boiling water', 1, mockHormones);

        expect(engine.stm_buffer).toHaveLength(2);

        const similarity = getJaccardSimilarity(
            'JavaScript excels at frontend web development',
            'Cooking pasta requires boiling water'
        );
        expect(similarity).toBeLessThan(0.3);
    });

    it('should strengthen associations with repeated co-occurrence', () => {
        const mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };

        const relatedText = 'Coffee helps me code better';

        engine.learnMemoryDynamically(relatedText, 0, mockHormones);
        engine.learnMemoryDynamically(relatedText, 1, mockHormones);

        expect(engine.stm_buffer[0].count).toBe(2);
        expect(engine.stm_buffer[0].weight).toBeGreaterThan(5.0);
    });
});

describe('MemoryEngine - Serialization', () => {
    let engine;

    beforeEach(() => {
        engine = new MemoryEngine();
    });

    it('should serialize all memory components', () => {
        const serialized = engine.serialize();

        expect(serialized).toHaveProperty('core_memories');
        expect(serialized).toHaveProperty('recallable_drawer');
        expect(serialized).toHaveProperty('beliefs');
        expect(serialized).toHaveProperty('shattered_beliefs');
        expect(serialized).toHaveProperty('chronicles');
        expect(serialized).toHaveProperty('stm_buffer');
        expect(serialized).toHaveProperty('in_crisis');
    });

    it('should reconstruct memory state from serialized data', () => {
        const mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };

        engine.learnMemoryDynamically('Test memory', 0, mockHormones);
        engine.beliefs.push({ belief: 'Testing is important' });
        engine.in_crisis = true;

        const serialized = engine.serialize();
        const newEngine = new MemoryEngine(serialized);

        expect(newEngine.stm_buffer).toHaveLength(1);
        expect(newEngine.stm_buffer[0].content).toBe('Test memory');
        expect(newEngine.beliefs).toHaveLength(1);
        expect(newEngine.in_crisis).toBe(true);
    });

    it('should preserve memory weights and counts', () => {
        const mockHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };

        engine.learnMemoryDynamically('Important memory', 0, mockHormones);
        engine.learnMemoryDynamically('Important memory', 1, mockHormones);

        const serialized = engine.serialize();
        const newEngine = new MemoryEngine(serialized);

        expect(newEngine.stm_buffer[0].count).toBe(2);
        expect(newEngine.stm_buffer[0].weight).toBeGreaterThan(5.0);
    });

    it('should handle empty memory state', () => {
        const serialized = engine.serialize();

        expect(serialized.core_memories).toEqual([]);
        expect(serialized.recallable_drawer).toEqual([]);
        expect(serialized.stm_buffer).toEqual([]);
        expect(serialized.in_crisis).toBe(false);
    });
});

describe('MemoryEngine - Temporal Anchoring', () => {
    let engine;

    beforeEach(() => {
        engine = new MemoryEngine();
    });

    it('should clear crisis state when no shattered beliefs remain', () => {
        engine.in_crisis = true;
        engine.shattered_beliefs = [];

        engine.applyTemporalAnchor(5);

        expect(engine.in_crisis).toBe(false);
    });

    it('should maintain crisis state when shattered beliefs exist', () => {
        engine.in_crisis = true;
        engine.shattered_beliefs = [{ belief: 'Trust is broken' }];

        engine.applyTemporalAnchor(5);

        expect(engine.in_crisis).toBe(true);
    });

    it('should restore hormonal state from neuro_history', () => {
        const hormones = {
            adrenaline: 5.0,
            cortisol: 5.0,
            dopamine: 5.0,
        };

        const neuro_history = {
            3: { adrenaline: 2.0, cortisol: 2.0, dopamine: 8.0 },
            5: { adrenaline: 3.0, cortisol: 3.0, dopamine: 7.0 },
        };

        engine.applyTemporalAnchor(4, hormones, neuro_history);

        expect(hormones.levels.adrenaline).toBe(2.0);
        expect(hormones.levels.dopamine).toBe(8.0);
    });

    it('should handle missing neuro_history gracefully', () => {
        const hormones = { adrenaline: 5.0 };

        expect(() => {
            engine.applyTemporalAnchor(5, hormones, null);
        }).not.toThrow();
    });
});

describe('MemoryEngine - Emotional Intensity', () => {
    let engine;

    beforeEach(() => {
        engine = new MemoryEngine();
    });

    it('should calculate emotional intensity from hormones', () => {
        const highIntensityHormones = {
            adrenaline: 9.0,
            cortisol: 8.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 1.0,
        };

        const result = engine.learnMemoryDynamically('High intensity event', 0, highIntensityHormones);

        expect(result).toBe('LTM');
    });

    it('should reduce intensity with high melatonin', () => {
        const drowsyHormones = {
            adrenaline: 6.0,
            cortisol: 6.0,
            oxytocin: 5.0,
            dopamine: 5.0,
            sex_hormones: 5.0,
            melatonin: 8.0,
        };

        const result = engine.learnMemoryDynamically('Drowsy memory', 0, drowsyHormones);

        // High melatonin should reduce emotional intensity
        expect(result).toBe('STM_CREATED');
    });

    it('should stamp emotions based on hormone levels', () => {
        const joyfulHormones = {
            adrenaline: 2.0,
            cortisol: 2.0,
            oxytocin: 5.5,
            dopamine: 6.0,
            sex_hormones: 5.0,
            melatonin: 2.0,
        };

        // emotionalIntensity = max(2.0, 2.0, 5.5, 6.0, 5.0) - (2.0 * 0.5) = 6.0 - 1.0 = 5.0
        // This is < 7.0, so memory goes to STM
        engine.learnMemoryDynamically('Happy moment', 0, joyfulHormones);

        const memory = engine.stm_buffer[0];
        // joy = min(dopamine + (oxytocin * 0.3), 10.0) = min(6.0 + 1.65, 10.0) = 7.65
        expect(memory.emotions.joy).toBeGreaterThan(7.0);
    });
});

describe('MemoryEngine - findNewestMemory', () => {
    it('should return STM if it has a newer timestamp than LTM', () => {
        const agent = {
            memory: {
                recallable_drawer: [
                    { content: 'Old LTM memory', timestamp: new Date('2026-06-07T10:00:00Z').toISOString() },
                ],
                stm_buffer: [{ content: 'New STM memory', timestamp: new Date('2026-06-07T12:00:00Z').toISOString() }],
            },
        };
        const newest = findNewestMemory(agent);
        expect(newest.content).toBe('New STM memory');
    });

    it('should return null if memory state is empty', () => {
        const agentNull = null;
        const agentEmpty = {
            memory: {
                recallable_drawer: [],
                stm_buffer: [],
            },
        };
        expect(findNewestMemory(agentNull)).toBeNull();
        expect(findNewestMemory(agentEmpty)).toBeNull();
    });
});
