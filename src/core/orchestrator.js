import { logAnima } from '../utils/logger.js';
import { AnimaState } from './state.js';
import { AnimaUI } from '../ui/dashboard.js';
import { GMAgent } from '../agents/gm.js';
import { RPAgent } from '../agents/rp.js';
import { extension_settings } from '../../../../../extensions.js';

export const AnimaOrchestrator = {
    eventSource: null,
    event_types: null,
    lastProcessedUserMsg: '',

    init({ eventSource, event_types }) {
        this.eventSource = eventSource;
        this.event_types = event_types;

        // Core ST events registration
        this.eventSource.on(this.event_types.CHAT_CHANGED, () => this.onChatChanged());
        this.eventSource.on(this.event_types.MESSAGE_RECEIVED, (msgId) => this.onMessageReceived(msgId));
        this.eventSource.on(this.event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => this.onMessageReceived(msgId));
        
        // ST prompt readiness interception
        this.eventSource.on(this.event_types.CHAT_COMPLETION_PROMPT_READY, (data) => this.onPromptInterceptor(data?.chat));
        this.eventSource.on(this.event_types.GENERATE_BEFORE_COMBINE_PROMPTS, () => this.onTextCompletionPromptReady());
        
        globalThis.animaCognitiveInterceptor = async (chat) => {
            await this.onPromptInterceptor(chat);
        };

        logAnima('success', 'Orchestrator', 'Đã khởi tạo Event Orchestrator.');
    },

    async onChatChanged() {
        this.lastProcessedUserMsg = '';
        
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        const characterId = context?.characterId;

        if (characterId !== undefined) {
            logAnima('info', 'Orchestrator', `Nạp trạng thái nhân vật: ${characterId}`);
            AnimaState.loadForCharacter(characterId);
            
            // Sync dashboardclock and UI
            const settings = extension_settings?.['st-anima'] || {};
            AnimaUI.updateLiveClock(settings.feature_time !== false);
            AnimaUI.updateUI(AnimaState);
        }
    },

    async onPromptInterceptor(chat) {
        if (!chat || !Array.isArray(chat) || chat.length === 0) return;
        
        try {
            if (typeof SillyTavern === 'undefined') return;
            const context = SillyTavern.getContext();
            const characterId = context?.characterId;
            if (characterId === undefined) return;
            
            const character = context.characters[characterId];
            const characterName = character?.name || 'itto';

            const lastMsgObj = chat[chat.length - 1];
            const lastUserMsg = lastMsgObj?.mes || lastMsgObj?.content || '';

            // Run GM planner
            const plan = await GMAgent.planAndUpdate(chat, AnimaState, characterName);

            // Update State & UI
            AnimaState.updateFromGM(plan);
            AnimaUI.updateUI(AnimaState);

            // Format RP Nudge
            const nudge = RPAgent.formatNudge(plan, AnimaState);

            // Inject nudge prompt CLEANLY (without mutating database)
            if (nudge && lastMsgObj) {
                const lastMsgIdx = chat.length - 1;
                const clonedLastMsg = { ...lastMsgObj };
                
                const rawText = clonedLastMsg.content || clonedLastMsg.mes || '';
                const cleanContent = rawText.split('\n\n[BỐI CẢNH & TRẠNG THÁI HIỆN TẠI')[0];
                
                const injection = `\n\n${nudge}`;
                if (clonedLastMsg.content !== undefined) clonedLastMsg.content = cleanContent + injection;
                if (clonedLastMsg.mes !== undefined) clonedLastMsg.mes = cleanContent + injection;
                
                chat[lastMsgIdx] = clonedLastMsg;
                logAnima('success', 'Orchestrator', 'Đã tiêm sạch Narrative Nudge vào prompt.');
            }

            // Save State
            AnimaState.saveForCharacter(characterId);
            this.lastProcessedUserMsg = lastUserMsg;
        } catch (err) {
            logAnima('error', 'Orchestrator', `Lỗi xử lý prompt interceptor: ${err.message}`);
        }
    },

    onTextCompletionPromptReady() {
        if (typeof SillyTavern === 'undefined') return;
        const chatLog = SillyTavern.getContext().chat || [];
        this.onPromptInterceptor(chatLog);
    },

    async onMessageReceived(messageId) {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        const chat = context?.chat;
        if (!chat) return;

        const messageObj = chat[messageId];
        if (!messageObj || messageObj.is_user || messageObj.is_system) return;

        const rawText = messageObj.mes || '';
        if (!rawText) return;

        // Quét XML tags
        let changed = false;

        const bodyMatch = rawText.match(/<body_update>([\s\S]*?)<\/body_update>/i);
        if (bodyMatch && bodyMatch[1]) {
            AnimaState.applyXmlUpdates('body_update', bodyMatch[1].trim());
            changed = true;
        }

        const neuroMatch = rawText.match(/<neuro_update>([\s\S]*?)<\/neuro_update>/i);
        if (neuroMatch && neuroMatch[1]) {
            AnimaState.applyXmlUpdates('neuro_update', neuroMatch[1].trim());
            changed = true;
        }

        if (changed) {
            const characterId = context.characterId;
            if (characterId !== undefined) {
                AnimaState.saveForCharacter(characterId);
            }
            AnimaUI.updateUI(AnimaState);
        }
    }
};
