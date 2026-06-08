// v0.11.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the modules that EventOrchestrator depends on, since they touch DOM/ST globals
vi.mock('../../services/EnvironmentService.js', () => ({
    getCharacterEnvironment: vi.fn(async () => ({ active_location: 'Phòng ngủ', locations: {} })),
}));
vi.mock('../../services/VectorMemoryService.js', () => ({
    recallMemoriesSemantic: vi.fn(async () => []),
}));
vi.mock('../../ui/DOMAutoHealing.js', () => ({
    renderParsedMessage: vi.fn(async () => {}),
    startChatObserver: vi.fn(),
}));
vi.mock('../../ui/DashboardUI.js', () => ({
    updateActiveRecallUI: vi.fn(),
}));
vi.mock('../../backstage/SubconsciousTicker.js', () => ({
    startSubconsciousTicker: vi.fn(),
    stopSubconsciousTicker: vi.fn(),
}));
vi.mock('../../core/MemoryEngine.js', () => ({
    getJaccardSimilarity: vi.fn(() => 0.5),
}));
vi.mock('./PromptInjector.js', () => ({
    processPromptInjections: vi.fn(),
    getRecentChatContext: vi.fn(() => ''),
}));
vi.mock('./SleepDetector.js', () => ({
    handleSleepInterruption: vi.fn(() => ({ shouldProcess: false, newLastProcessedUserMsg: '', wasSleeping: false })),
}));
vi.mock('./TemporalAnchor.js', () => ({
    applyTemporalAnchor: vi.fn(),
    applyTemporalAnchorFromChatLog: vi.fn(),
    getLastUserMessage: vi.fn(() => ''),
}));

import { EventOrchestrator } from '../EventOrchestrator.js';

function makeEventSource() {
    const handlers = [];
    return {
        on: vi.fn((type, handler) => handlers.push({ type, handler, on: true })),
        off: vi.fn((type, handler) => {
            const idx = handlers.findIndex((h) => h.type === type && h.handler === handler);
            if (idx >= 0) handlers[idx].on = false;
        }),
        removeListener: vi.fn((type, handler) => {
            const idx = handlers.findIndex((h) => h.type === type && h.handler === handler);
            if (idx >= 0) handlers[idx].on = false;
        }),
        _handlers: handlers,
    };
}

function makeEventTypes() {
    return {
        CHAT_CHANGED: 'CHAT_CHANGED',
        MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
        CHARACTER_MESSAGE_RENDERED: 'CHARACTER_MESSAGE_RENDERED',
        USER_MESSAGE_RENDERED: 'USER_MESSAGE_RENDERED',
        MESSAGE_UPDATED: 'MESSAGE_UPDATED',
        MESSAGE_EDITED: 'MESSAGE_EDITED',
        GENERATION_STARTED: 'GENERATION_STARTED',
        STREAM_TOKEN_RECEIVED: 'STREAM_TOKEN_RECEIVED',
        CHAT_COMPLETION_PROMPT_READY: 'CHAT_COMPLETION_PROMPT_READY',
        GENERATE_BEFORE_COMBINE_PROMPTS: 'GENERATE_BEFORE_COMBINE_PROMPTS',
    };
}

function makeOrchestrator() {
    return new EventOrchestrator({
        getActiveAgent: vi.fn(() => null),
        saveActiveAgentState: vi.fn(),
        refreshMemoryUIWrapper: vi.fn(),
        resetActiveAgent: vi.fn(),
        logAnima: vi.fn(),
    });
}

describe('EventOrchestrator event registration (bug 1)', () => {
    let eventSource, event_types, orchestrator;

    beforeEach(() => {
        eventSource = makeEventSource();
        event_types = makeEventTypes();
        orchestrator = makeOrchestrator();
        // detachEventHandlers reads from globalThis.SillyTavern, not the attach arg
        global.SillyTavern = { getContext: () => ({ eventSource }) };
    });

    afterEach(() => {
        delete global.SillyTavern;
    });

    it('attaches exactly 10 event handlers', () => {
        orchestrator.attachEventHandlers({ eventSource, event_types });
        expect(eventSource.on).toHaveBeenCalledTimes(10);
    });

    it('stores attached handler references for cleanup', () => {
        orchestrator.attachEventHandlers({ eventSource, event_types });
        expect(orchestrator.attachedHandlers.length).toBe(10);
    });

    it('detachEventHandlers removes all registered handlers', () => {
        orchestrator.attachEventHandlers({ eventSource, event_types });
        orchestrator.detachEventHandlers();
        expect(eventSource.off).toHaveBeenCalledTimes(10);
        expect(orchestrator.attachedHandlers.length).toBe(0);
    });

    it('attachEventHandlers is idempotent (no accumulation on multiple attach calls)', () => {
        orchestrator.attachEventHandlers({ eventSource, event_types });
        orchestrator.attachEventHandlers({ eventSource, event_types });
        orchestrator.attachEventHandlers({ eventSource, event_types });
        // After 3 attaches: 3 attaches × 10 events = 30 on() calls (3 attach rounds)
        // But only 1 round of detach() is needed (10 calls) — verifies no accumulation
        eventSource.off.mockClear();
        orchestrator.detachEventHandlers();
        expect(eventSource.off).toHaveBeenCalledTimes(10);
    });

    it('gracefully handles missing eventSource.off and removeListener', () => {
        const noOffES = { on: vi.fn() };
        global.SillyTavern = { getContext: () => ({ eventSource: noOffES }) };
        orchestrator.attachEventHandlers({ eventSource: noOffES, event_types });
        // Should not throw
        expect(() => orchestrator.detachEventHandlers()).not.toThrow();
    });
});

describe('EventOrchestrator _onChatChanged (bug 1 + state reset)', () => {
    let orchestrator, resetActiveAgent;

    beforeEach(() => {
        resetActiveAgent = vi.fn();
        orchestrator = new EventOrchestrator({
            getActiveAgent: vi.fn(() => null),
            saveActiveAgentState: vi.fn(),
            refreshMemoryUIWrapper: vi.fn(),
            resetActiveAgent,
            logAnima: vi.fn(),
        });
        orchestrator.onChatChanged = vi.fn(); // mock deferred method
    });

    it('calls resetActiveAgent and resets local state', () => {
        orchestrator.lastProcessedUserMsg = 'hello';
        orchestrator.lastProcessedMessageId = 5;
        orchestrator.lastProcessedMessageText = 'world';
        orchestrator.renderInFlight.add(99);

        orchestrator._onChatChanged();

        expect(resetActiveAgent).toHaveBeenCalledOnce();
        expect(orchestrator.lastProcessedUserMsg).toBe('');
        expect(orchestrator.lastProcessedMessageId).toBe(-1);
        expect(orchestrator.lastProcessedMessageText).toBe('');
        expect(orchestrator.renderInFlight.size).toBe(0);
        expect(orchestrator.onChatChanged).toHaveBeenCalledOnce();
    });

    it('skips resetActiveAgent if not provided (backward compat)', () => {
        const noReset = new EventOrchestrator({
            getActiveAgent: vi.fn(() => null),
            saveActiveAgentState: vi.fn(),
            refreshMemoryUIWrapper: vi.fn(),
            logAnima: vi.fn(),
        });
        noReset.onChatChanged = vi.fn();
        expect(() => noReset._onChatChanged()).not.toThrow();
    });
});

describe('EventOrchestrator onMessageReceived (bugs 8, 18)', () => {
    let orchestrator, renderParsedMessage;

    beforeEach(async () => {
        renderParsedMessage = (await import('../../ui/DOMAutoHealing.js')).renderParsedMessage;
        renderParsedMessage.mockClear();

        orchestrator = new EventOrchestrator({
            getActiveAgent: vi.fn(() => null),
            saveActiveAgentState: vi.fn(),
            refreshMemoryUIWrapper: vi.fn(),
            resetActiveAgent: vi.fn(),
            logAnima: vi.fn(),
        });
    });

    it('dedups identical (messageId + text) without re-rendering', async () => {
        global.SillyTavern = {
            getContext: () => ({
                chat: [{ mes: 'hello world' }],
            }),
        };

        await orchestrator.onMessageReceived(0);
        await orchestrator.onMessageReceived(0);
        await orchestrator.onMessageReceived(0);

        expect(renderParsedMessage).toHaveBeenCalledOnce();
    });

    it('re-renders if text changes for same messageId (e.g., swipe)', async () => {
        global.SillyTavern = {
            getContext: () => ({
                chat: [{ mes: 'first version' }, { mes: 'second version' }],
            }),
        };

        await orchestrator.onMessageReceived(0);
        // Simulate swipe — text at index 0 changes
        global.SillyTavern.getContext = () => ({
            chat: [{ mes: 'swiped version' }, { mes: 'second version' }],
        });
        await orchestrator.onMessageReceived(0);

        expect(renderParsedMessage).toHaveBeenCalledTimes(2);
    });

    it('skips if same messageId is already being processed (in-flight lock)', async () => {
        // Make renderParsedMessage take a long time
        let releaseLock;
        const lockPromise = new Promise((resolve) => {
            releaseLock = () => resolve();
        });
        renderParsedMessage.mockImplementationOnce(async () => {
            await lockPromise;
        });

        global.SillyTavern = {
            getContext: () => ({
                chat: [{ mes: 'msg' }],
            }),
        };

        // Kick off first call (will block on the mock)
        const firstCall = orchestrator.onMessageReceived(0);
        // While first call is in-flight, fire second call with same id but different text
        global.SillyTavern.getContext = () => ({
            chat: [{ mes: 'msg updated' }],
        });
        const secondCall = orchestrator.onMessageReceived(0);

        // Second call should have returned (skipped) before the first finishes
        await secondCall;
        // Release the lock
        releaseLock();
        await firstCall;

        // renderParsedMessage called once (the in-flight one), not twice
        expect(renderParsedMessage).toHaveBeenCalledTimes(1);
    });

    it('returns early if SillyTavern is undefined', async () => {
        delete global.SillyTavern;
        await orchestrator.onMessageReceived(0);
        expect(renderParsedMessage).not.toHaveBeenCalled();
    });
});

describe('EventOrchestrator onGenerationStarted (bug 18 sanity)', () => {
    it('clears streamBuffer', () => {
        const orchestrator = makeOrchestrator();
        orchestrator.streamBuffer = 'leftover content';
        // Mock the DOM
        const thoughtsEl = { innerHTML: '' };
        global.document = { getElementById: vi.fn((id) => (id === 'cog_dash_thoughts' ? thoughtsEl : null)) };

        orchestrator.onGenerationStarted();

        expect(orchestrator.streamBuffer).toBe('');
        expect(thoughtsEl.innerHTML).toBe('<i>Thinking...</i>');
    });
});
