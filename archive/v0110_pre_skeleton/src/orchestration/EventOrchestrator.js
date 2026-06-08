// v0.11.0
import { getCharacterEnvironment } from '../services/EnvironmentService.js';
import { recallMemoriesSemantic } from '../services/VectorMemoryService.js';
import { renderParsedMessage, startChatObserver } from '../ui/DOMAutoHealing.js';
import { updateActiveRecallUI } from '../ui/DashboardUI.js';
import { startSubconsciousTicker, stopSubconsciousTicker } from '../backstage/SubconsciousTicker.js';
import { getJaccardSimilarity } from '../core/MemoryEngine.js';
import { processPromptInjections, getRecentChatContext } from './PromptInjector.js';
import { handleSleepInterruption } from './SleepDetector.js';
import { applyTemporalAnchor, applyTemporalAnchorFromChatLog, getLastUserMessage } from './TemporalAnchor.js';
import { AVAILABLE_TOOLS } from '../utils/constants.js';

export class EventOrchestrator {
    constructor({ getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper, resetActiveAgent, logAnima }) {
        this.getActiveAgent = getActiveAgent;
        this.saveActiveAgentState = saveActiveAgentState;
        this.refreshMemoryUIWrapper = refreshMemoryUIWrapper;
        this.resetActiveAgent = resetActiveAgent;
        this.logAnima = logAnima;

        this.streamBuffer = '';
        // Three lastProcessed* fields track dedup state:
        // - lastProcessedUserMsg: last user input AD agent saw (used in _dispatch for sleep/dedup)
        // - lastProcessedMessageId: last chat index that triggered MESSAGE_RECEIVED path (used in onMessageReceived for dedup)
        // - lastProcessedMessageText: last rendered message text (used in onMessageReceived for dedup)
        // All three are needed because message content can change without index changing (regen) and vice versa.
        this.lastProcessedUserMsg = '';
        this.lastProcessedMessageId = -1;
        this.lastProcessedMessageText = '';
        this.activeRecalledMemories = [];
        this.activeEnvironment = null;

        // Bug 8: in-flight lock — prevents concurrent MESSAGE_RECEIVED on same messageId
        this.renderInFlight = new Set();

        // Bug 1: track event handlers for proper cleanup
        this.attachedHandlers = [];
    }

    getCallbacks() {
        return {
            saveState: this.saveActiveAgentState,
            refreshUI: this.refreshMemoryUIWrapper,
        };
    }

    // Bug 1: register event handlers with the eventSource, replacing any prior registration
    attachEventHandlers({ eventSource, event_types }) {
        this.detachEventHandlers();
        const registrations = [
            [event_types.CHAT_CHANGED, () => this._onChatChanged()],
            [event_types.MESSAGE_RECEIVED, (msgId) => this.onMessageReceived(msgId)],
            [event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => this.onMessageRendered(msgId)],
            [event_types.USER_MESSAGE_RENDERED, (msgId) => this.onMessageRendered(msgId)],
            [event_types.MESSAGE_UPDATED, (msgId) => this.onMessageReceived(msgId)],
            [event_types.MESSAGE_EDITED, (msgId) => this.onMessageReceived(msgId)],
            [event_types.GENERATION_STARTED, () => this.onGenerationStarted()],
            [event_types.STREAM_TOKEN_RECEIVED, (token) => this.onStreamTokenReceived(token)],
            [event_types.CHAT_COMPLETION_PROMPT_READY, (data) => this.onChatCompletionPromptReady(data)],
            [event_types.GENERATE_BEFORE_COMBINE_PROMPTS, (data) => this.onTextCompletionPromptReady(data)],
        ];
        for (const [type, handler] of registrations) {
            eventSource.on(type, handler);
            this.attachedHandlers.push({ type, handler });
        }
        this.logAnima('info', 'Orchestrator', `Attached ${registrations.length} event handlers`);
    }

    detachEventHandlers() {
        if (typeof SillyTavern === 'undefined' || this.attachedHandlers.length === 0) return;
        const { eventSource } = SillyTavern.getContext();
        for (const { type, handler } of this.attachedHandlers) {
            try {
                if (typeof eventSource.off === 'function') {
                    eventSource.off(type, handler);
                } else if (typeof eventSource.removeListener === 'function') {
                    eventSource.removeListener(type, handler);
                }
            } catch (e) {
                this.logAnima('warning', 'Orchestrator', `Failed to remove ${type} listener: ${e.message}`);
            }
        }
        this.attachedHandlers = [];
    }

    _onChatChanged() {
        // Reset module-level + orchestrator state, then defer env/observer/ticker restart
        if (this.resetActiveAgent) this.resetActiveAgent();
        this.lastProcessedUserMsg = '';
        this.lastProcessedMessageId = -1;
        this.lastProcessedMessageText = '';
        this.renderInFlight.clear();
        this.onChatChanged();
    }

    async _dispatch({ chat, applyVectorSearch = true }) {
        try {
            if (!chat || !Array.isArray(chat)) return;
            const agent = this.getActiveAgent();
            if (!agent) return;

            applyTemporalAnchor(agent, chat);
            const lastUserMsg = getLastUserMessage(chat);
            const messageIndex = chat.length - 1;

            const sleepResult = handleSleepInterruption(
                agent,
                lastUserMsg,
                this.lastProcessedUserMsg,
                this.getCallbacks()
            );

            let adIntent = null;
            if (
                sleepResult.shouldProcess &&
                !sleepResult.wasSleeping &&
                lastUserMsg &&
                lastUserMsg !== this.lastProcessedUserMsg
            ) {
                agent.processMessage(lastUserMsg, 'user', messageIndex);
                const context = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : {};
                const charName = context?.characters?.[context?.characterId]?.name || 'itto';
                const recentContext = getRecentChatContext(chat, 4);
                adIntent = await agent.getADIntentForMessage(recentContext, AVAILABLE_TOOLS, charName);
                this.saveActiveAgentState();
            }
            this.lastProcessedUserMsg = sleepResult.newLastProcessedUserMsg;

            if (applyVectorSearch) {
                await this._vectorSearch(chat, agent);
            }

            this.refreshMemoryUIWrapper();
            updateActiveRecallUI(this.activeRecalledMemories);
            processPromptInjections(chat, this.getActiveAgent(), this.activeRecalledMemories, this.logAnima, adIntent);
        } catch (err) {
            this.logAnima('error', 'Interceptor', 'Lỗi trong dispatch:', err);
        }
    }

    async _vectorSearch(chat, agent) {
        const context = SillyTavern.getContext();
        if (!this.activeEnvironment && context.characterId !== undefined) {
            this.activeEnvironment = await getCharacterEnvironment(context.characterId);
        }
        const recentContext = getRecentChatContext(chat, 3);
        if (recentContext && context.characterId !== undefined) {
            this.activeRecalledMemories = await recallMemoriesSemantic(context.characterId, recentContext, 4, 0.2);
            if (!this.activeRecalledMemories || this.activeRecalledMemories.length === 0) {
                this.activeRecalledMemories = agent.memory.recallable_drawer
                    .map((card) => ({ card, sim: getJaccardSimilarity(card.content, recentContext) }))
                    .filter((item) => item.sim > 0.1)
                    .sort((a, b) => b.sim - a.sim)
                    .slice(0, 4)
                    .map((item) => item.card);
            }
        }
    }

    onChatCompletionPromptReady(eventData) {
        return this._dispatch({ chat: eventData?.chat, applyVectorSearch: true });
    }

    onTextCompletionPromptReady() {
        try {
            const context = SillyTavern.getContext();
            const chatLog = context.chat || [];
            const lastUserMsgObj =
                chatLog
                    .slice()
                    .reverse()
                    .find((m) => m.is_user && m.mes) || {};
            const lastMsgText = lastUserMsgObj.mes || '';

            const agent = this.getActiveAgent();
            if (agent) {
                applyTemporalAnchorFromChatLog(agent, chatLog);
                const messageIndex = chatLog.length - 1;
                const sleepResult = handleSleepInterruption(
                    agent,
                    lastMsgText,
                    this.lastProcessedUserMsg,
                    this.getCallbacks()
                );
                if (
                    sleepResult.shouldProcess &&
                    !sleepResult.wasSleeping &&
                    lastMsgText &&
                    lastMsgText !== this.lastProcessedUserMsg
                ) {
                    agent.processMessage(lastMsgText, 'user', messageIndex);
                    this.saveActiveAgentState();
                }
                this.lastProcessedUserMsg = sleepResult.newLastProcessedUserMsg;
            }
        } catch (err) {
            this.logAnima('error', 'Interceptor', 'Lỗi trong Text Completion Prompt Ready:', err);
        }
    }

    onPromptInterceptor(chat) {
        this.logAnima('info', 'Interceptor', `Kích hoạt Prompt Interceptor cho text-completion.`);
        return this._dispatch({ chat, applyVectorSearch: false });
    }

    async onMessageReceived(messageId) {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        if (!context || !context.chat) return;

        const message = context.chat[messageId];
        if (!message || !message.mes) return;

        if (messageId === this.lastProcessedMessageId && message.mes === this.lastProcessedMessageText) return;
        this.lastProcessedMessageId = messageId;
        this.lastProcessedMessageText = message.mes;

        // Bug 8: skip if same messageId is already being processed
        if (this.renderInFlight.has(messageId)) return;
        this.renderInFlight.add(messageId);
        try {
            await renderParsedMessage(
                messageId,
                message.mes,
                false,
                this.getActiveAgent,
                this.saveActiveAgentState,
                this.refreshMemoryUIWrapper
            );
        } finally {
            this.renderInFlight.delete(messageId);
        }
    }

    onMessageRendered(messageId) {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        if (!context || !context.chat) return;

        const message = context.chat[messageId];
        if (message && message.mes) {
            renderParsedMessage(
                messageId,
                message.mes,
                true,
                this.getActiveAgent,
                this.saveActiveAgentState,
                this.refreshMemoryUIWrapper
            );
        }
    }

    async onChatChanged() {
        stopSubconsciousTicker();

        setTimeout(async () => {
            const agent = this.getActiveAgent();
            if (agent) {
                if (typeof SillyTavern !== 'undefined') {
                    const context = SillyTavern.getContext();
                    if (context && context.characterId !== undefined) {
                        this.activeEnvironment = await getCharacterEnvironment(context.characterId);
                    }
                }
                this.refreshMemoryUIWrapper();
                startChatObserver(this.getActiveAgent, this.saveActiveAgentState, this.refreshMemoryUIWrapper);
                startSubconsciousTicker(this.getActiveAgent, this.saveActiveAgentState, this.refreshMemoryUIWrapper);

                const awareToggle = document.getElementById('cog_opt_self_aware');
                if (awareToggle) awareToggle.checked = agent.consciousness.self_awareness;
                const bgConToggle = document.getElementById('cog_opt_bg_conscious');
                if (bgConToggle) {
                    bgConToggle.checked = agent.consciousness.bg_consciousness;
                    const subBox = document.getElementById('cog_subconscious_box');
                    if (subBox) subBox.style.display = agent.consciousness.bg_consciousness ? 'block' : 'none';
                }
                const splitToggle = document.getElementById('cog_opt_split_physiological');
                if (splitToggle) splitToggle.checked = agent.consciousness.split_physiological;
            }
        }, 500);
    }

    onGenerationStarted() {
        this.streamBuffer = '';
        const thoughts = document.getElementById('cog_dash_thoughts');
        if (thoughts) thoughts.innerHTML = '<i>Thinking...</i>';
    }

    onStreamTokenReceived(token) {
        this.streamBuffer += token;
        const thoughtRegex = /<animaing>([\s\S]*?)(?:<\/animaing>|$)/i;
        const match = this.streamBuffer.match(thoughtRegex);
        if (match && match[1]) {
            const thoughtsEl = document.getElementById('cog_dash_thoughts');
            if (thoughtsEl) thoughtsEl.innerText = match[1].trim();
        }
    }
}
