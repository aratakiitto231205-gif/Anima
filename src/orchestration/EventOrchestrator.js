import { getCharacterEnvironment } from '../services/EnvironmentService.js';
import { recallMemoriesSemantic } from '../services/VectorMemoryService.js';
import { renderParsedMessage, startChatObserver } from '../ui/DOMAutoHealing.js';
import { updateActiveRecallUI } from '../ui/DashboardUI.js';
import { startSubconsciousTicker, stopSubconsciousTicker } from '../backstage/SubconsciousTicker.js';
import { getJaccardSimilarity } from '../core/MemoryEngine.js';
import { processPromptInjections, getRecentChatContext } from './PromptInjector.js';
import { handleSleepInterruption, isSleeping } from './SleepDetector.js';
import { applyTemporalAnchor, applyTemporalAnchorFromChatLog, getLastUserMessage } from './TemporalAnchor.js';

/**
 * EventOrchestrator - Đăng ký và xử lý các sự kiện ST
 * Nhận các hàm accessor/callback từ index.js để tránh circular dependency
 */
export class EventOrchestrator {
    constructor({ getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper, logAnima }) {
        this.getActiveAgent = getActiveAgent;
        this.saveActiveAgentState = saveActiveAgentState;
        this.refreshMemoryUIWrapper = refreshMemoryUIWrapper;
        this.logAnima = logAnima;

        this.streamBuffer = '';
        this.lastProcessedMessageId = -1;
        this.lastProcessedMessageText = '';
        this.lastProcessedUserMsg = '';
        this.activeRecalledMemories = [];
        this.activeEnvironment = null;
    }

    getCallbacks() {
        return {
            saveState: this.saveActiveAgentState,
            refreshUI: this.refreshMemoryUIWrapper
        };
    }

    async onChatCompletionPromptReady(eventData) {
        try {
            if (!eventData || !Array.isArray(eventData.chat)) return;

            const agent = this.getActiveAgent();
            let adIntent = null;
            if (agent) {
                applyTemporalAnchor(agent, eventData.chat);

                const lastUserMsg = getLastUserMessage(eventData.chat);
                const messageIndex = eventData.chat.length - 1;

                const result = handleSleepInterruption(
                    agent, lastUserMsg, this.lastProcessedUserMsg, this.getCallbacks()
                );

                if (result.shouldProcess) {
                    if (!result.wasSleeping && lastUserMsg && lastUserMsg !== this.lastProcessedUserMsg) {
                        agent.processMessage(lastUserMsg, 'user', messageIndex);
                        
                        const context = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : {};
                        const charName = context?.characters?.[context?.characterId]?.name || 'itto';
                        const availableTools = ["search_web", "recall_memory", "play_music", "set_timer", "tell_joke", "check_news", "surf_tiktok", "query_lore_db"];
                        adIntent = await agent.getADIntentForMessage(lastUserMsg, availableTools, charName);
                        
                        this.saveActiveAgentState();
                    }
                    this.lastProcessedUserMsg = result.newLastProcessedUserMsg;
                }

                // Vector Semantic Search
                const context = SillyTavern.getContext();
                if (!this.activeEnvironment && context.characterId !== undefined) {
                    this.activeEnvironment = await getCharacterEnvironment(context.characterId);
                }
                const recentContext = getRecentChatContext(eventData.chat, 3);
                if (recentContext && context.characterId !== undefined) {
                    this.activeRecalledMemories = await recallMemoriesSemantic(context.characterId, recentContext, 4, 0.2);
                    if (!this.activeRecalledMemories || this.activeRecalledMemories.length === 0) {
                        this.activeRecalledMemories = agent.memory.recallable_drawer
                            .map(card => ({ card, sim: getJaccardSimilarity(card.content, recentContext) }))
                            .filter(item => item.sim > 0.05)
                            .sort((a, b) => b.sim - a.sim)
                            .slice(0, 4)
                            .map(item => item.card);
                    }
                }

                this.refreshMemoryUIWrapper();
                updateActiveRecallUI(this.activeRecalledMemories);
            }

            processPromptInjections(eventData.chat, this.getActiveAgent(), this.activeRecalledMemories, this.logAnima, adIntent);
        } catch (err) {
            console.error("Anima Engine: Error in onChatCompletionPromptReady:", err);
        }
    }

    async onTextCompletionPromptReady() {
        try {
            const context = SillyTavern.getContext();
            const chatLog = context.chat || [];
            const lastUserMsgObj = chatLog.slice().reverse().find(m => m.is_user && m.mes) || {};
            const lastMsgText = lastUserMsgObj.mes || '';

            const agent = this.getActiveAgent();
            if (agent) {
                applyTemporalAnchorFromChatLog(agent, chatLog);

                const messageIndex = chatLog.length - 1;
                const result = handleSleepInterruption(
                    agent, lastMsgText, this.lastProcessedUserMsg, this.getCallbacks()
                );

                if (result.shouldProcess) {
                    if (!result.wasSleeping && lastMsgText && lastMsgText !== this.lastProcessedUserMsg) {
                        agent.processMessage(lastMsgText, 'user', messageIndex);
                        this.saveActiveAgentState();
                    }
                    this.lastProcessedUserMsg = result.newLastProcessedUserMsg;
                }
            }
        } catch (err) {
            this.logAnima('error', 'Interceptor', 'Lỗi trong Text Completion Prompt Ready:', err);
        }
    }

    async onPromptInterceptor(chat) {
        try {
            this.logAnima('info', 'Interceptor', `Kích hoạt Prompt Interceptor cho text-completion.`);
            if (!chat || !Array.isArray(chat)) return;

            const agent = this.getActiveAgent();
            let adIntent = null;
            if (agent) {
                applyTemporalAnchor(agent, chat);

                const lastUserMsg = getLastUserMessage(chat);
                const messageIndex = chat.length - 1;

                const result = handleSleepInterruption(
                    agent, lastUserMsg, this.lastProcessedUserMsg, this.getCallbacks()
                );

                if (result.shouldProcess) {
                    if (!result.wasSleeping && lastUserMsg && lastUserMsg !== this.lastProcessedUserMsg) {
                        agent.processMessage(lastUserMsg, 'user', messageIndex);
                        
                        const context = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : {};
                        const charName = context?.characters?.[context?.characterId]?.name || 'itto';
                        const availableTools = ["search_web", "recall_memory", "play_music", "set_timer", "tell_joke", "check_news", "surf_tiktok", "query_lore_db"];
                        adIntent = await agent.getADIntentForMessage(lastUserMsg, availableTools, charName);
                        
                        this.saveActiveAgentState();
                    }
                    this.lastProcessedUserMsg = result.newLastProcessedUserMsg;
                }
            }

            processPromptInjections(chat, this.getActiveAgent(), this.activeRecalledMemories, this.logAnima, adIntent);
        } catch (err) {
            this.logAnima('error', 'Interceptor', 'Lỗi nghiêm trọng trong Prompt Interceptor của Anima Engine:', err);
        }
    }

    onMessageReceived(messageId) {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        if (!context || !context.chat) return;

        const message = context.chat[messageId];
        if (!message || !message.mes) return;

        if (messageId === this.lastProcessedMessageId && message.mes === this.lastProcessedMessageText) return;

        this.lastProcessedMessageId = messageId;
        this.lastProcessedMessageText = message.mes;

        renderParsedMessage(messageId, message.mes, false, this.getActiveAgent, this.saveActiveAgentState, this.refreshMemoryUIWrapper);
    }

    onMessageRendered(messageId) {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        if (!context || !context.chat) return;

        const message = context.chat[messageId];
        if (message && message.mes) {
            renderParsedMessage(messageId, message.mes, true, this.getActiveAgent, this.saveActiveAgentState, this.refreshMemoryUIWrapper);
        }
    }

    async onChatChanged() {
        // Reset state on chat change
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

                // Đồng bộ checkbox states
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
