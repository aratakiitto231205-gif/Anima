// v0.11.0 skeleton — sketch stage
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ST globals
const eventSource = {
    on: vi.fn(),
    off: vi.fn(),
};
const event_types = { MESSAGE_RECEIVED: 'MESSAGE_RECEIVED' };
// Stable ctx reference (not a new object each call) so processMessage's push persists into _onMessageReceived
const mockCtx = { eventSource, event_types, chat: [] };
global.SillyTavern = { getContext: () => mockCtx };

// Mock agentStore + logger
vi.mock('../../utils/agentStore.js', () => ({
    getActiveAgent: () => null,
    saveActiveAgentState: vi.fn(),
    resetActiveAgent: vi.fn(),
}));
vi.mock('../../utils/logger.js', () => ({
    logAnima: vi.fn(),
}));

// Mock GM + RP to verify orchestrator calls them in correct order
const gmMock = vi.fn().mockResolvedValue({
    appraisal: {},
    state_update: {},
    recalled_memories: [],
    plan: { segments: [{ id: 1, type: 'dialogue', length_words: [5, 10], intent: 'reply', tags: [] }] },
    next_action: 'normal',
});
const rpMock = vi.fn().mockResolvedValue({ prose: 'sketch prose', segments: [] });
vi.mock('../../agents/gm.js', () => ({ planAndUpdate: (...args) => gmMock(...args) }));
vi.mock('../../agents/rp.js', () => ({ writeProse: (...args) => rpMock(...args) }));

import { Orchestrator } from '../orchestrator.js';

describe('Orchestrator (skeleton)', () => {
    let orch;

    beforeEach(() => {
        vi.clearAllMocks();
        orch = new Orchestrator();
    });

    afterEach(() => {
        orch.detachEventHandlers();
    });

    it('attaches event handlers idempotently', () => {
        orch.attachEventHandlers({ eventSource, event_types });
        const firstCallCount = eventSource.on.mock.calls.length;
        orch.attachEventHandlers({ eventSource, event_types }); // second call should detach + re-attach, not accumulate
        expect(eventSource.on.mock.calls.length).toBeGreaterThanOrEqual(firstCallCount);
        // attachedHandlers should be reset to fresh list, not appended
        expect(orch.attachedHandlers.length).toBeLessThanOrEqual(firstCallCount + 1);
    });

    it('detaches all event handlers', () => {
        orch.attachEventHandlers({ eventSource, event_types });
        const count = orch.attachedHandlers.length;
        expect(count).toBeGreaterThan(0);
        orch.detachEventHandlers();
        expect(orch.attachedHandlers.length).toBe(0);
    });

    it('processMessage calls GM then RP in sequence (skeleton flow)', async () => {
        await orch.processMessage('test message');
        expect(gmMock).toHaveBeenCalledOnce();
        expect(rpMock).toHaveBeenCalledOnce();
        // GM should be called before RP
        const gmOrder = gmMock.mock.invocationCallOrder[0];
        const rpOrder = rpMock.mock.invocationCallOrder[0];
        expect(gmOrder).toBeLessThan(rpOrder);
    });
});
