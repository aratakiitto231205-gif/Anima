// v0.12.2 — Event Orchestrator
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
    lastProcessedMsgId: -1,

    init({ eventSource, event_types }) {
        this.eventSource = eventSource;
        this.event_types = event_types;

        // Register ST event handlers
        this.eventSource.on(this.event_types.CHAT_CHANGED, () => this.onChatChanged());
        this.eventSource.on(this.event_types.MESSAGE_RECEIVED, (msgId) => this.onMessageReceived(msgId));
        this.eventSource.on(this.event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => this.onMessageRendered(msgId));
        this.eventSource.on(this.event_types.USER_MESSAGE_RENDERED, (msgId) => this.onMessageRendered(msgId));
        
        // Register ST prompt readiness hooks
        this.eventSource.on(this.event_types.CHAT_COMPLETION_PROMPT_READY, (data) => this.onPromptInterceptor(data?.chat));
        this.eventSource.on(this.event_types.GENERATE_BEFORE_COMBINE_PROMPTS, () => this.onTextCompletionPromptReady());
        
        // Global interceptor hook register for text-completion formats
        globalThis.animaCognitiveInterceptor = async (chat) => {
            await this.onPromptInterceptor(chat);
        };

        logAnima('success', 'Orchestrator', 'Đã khởi tạo Event Orchestrator và đăng ký các sự kiện SillyTavern.');
    },

    async onChatChanged() {
        this.lastProcessedUserMsg = '';
        this.lastProcessedMsgId = -1;
        
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        const characterId = context?.characterId;

        if (characterId !== undefined) {
            logAnima('info', 'Orchestrator', `Đổi phòng chat. Nạp trạng thái cho nhân vật: ${characterId}`);
            AnimaState.loadForCharacter(characterId);
            
            // Sync settings and UI
            const settings = extension_settings?.['st-anima'] || {};
            AnimaUI.updateLiveClock(settings.feature_time !== false);
            AnimaUI.updateUI(AnimaState);
        }
    },

    async onPromptInterceptor(chat) {
        if (!chat || !Array.isArray(chat) || chat.length === 0) return;
        
        try {
            logAnima('info', 'Orchestrator', `Trực tiếp chặn Prompt: Lịch sử có ${chat.length} tin nhắn.`);

            if (typeof SillyTavern === 'undefined') return;
            const context = SillyTavern.getContext();
            const characterId = context?.characterId;
            if (characterId === undefined) return;
            
            const character = context.characters[characterId];
            const characterName = character?.name || 'itto';

            // 1. Phân rã sinh học thời gian trôi qua
            AnimaState.applyDecaySinceLastUpdate();

            // 2. Lấy tin nhắn người dùng cuối cùng
            const lastMsgObj = chat[chat.length - 1];
            const lastUserMsg = lastMsgObj?.mes || lastMsgObj?.content || '';

            // 3. Gọi GM Agent để phân tích và sinh Kế hoạch kể chuyện (Narrative Plan)
            const plan = await GMAgent.planAndUpdate(chat, AnimaState, characterName);

            // 4. Cập nhật State từ GM Plan
            AnimaState.updateFromGM(plan);

            // 5. Cập nhật giao diện Dashboard UI
            AnimaUI.updateUI(AnimaState);

            // 6. Gọi RP Agent định hình System Note (Narrative Nudge)
            const nudge = RPAgent.formatNudge(plan, AnimaState);

            // 7. Tiêm Narrative Nudge vào Prompt cuối cùng trước khi chuyển tiếp cho API chính
            this.injectNudge(chat, nudge);

            // 8. Lưu trạng thái nhân vật
            AnimaState.saveForCharacter(characterId);

            this.lastProcessedUserMsg = lastUserMsg;
        } catch (err) {
            logAnima('error', 'Orchestrator', `Lỗi xử lý prompt interceptor: ${err.message}`);
            console.error('[st-anima] interceptor error:', err);
        }
    },

    onTextCompletionPromptReady() {
        if (typeof SillyTavern === 'undefined') return;
        const chatLog = SillyTavern.getContext().chat || [];
        this.onPromptInterceptor(chatLog);
    },

    injectNudge(chat, nudge) {
        if (!chat || chat.length === 0) return;
        
        const lastMsgObj = chat[chat.length - 1];
        if (!lastMsgObj) return;

        const rawContent = lastMsgObj.content || lastMsgObj.mes || '';
        
        // Clean any old Anima instruction blocks
        const cleanContent = rawContent.split('\n\n[HỆ THỐNG PHẬN SỰ NHẬN THỨC ANIMA')[0];

        // Format prompt instruction block
        const injection = `\n\n${nudge}\n\n[QUY TẮC PHÂN ĐOẠN XML]: Bạn BẮT BUỘC trả lời dưới dạng cấu trúc XML: <thought>suy nghĩ</thought><dialogue>lời thoại</dialogue>.`;

        if (lastMsgObj.content !== undefined) lastMsgObj.content = cleanContent + injection;
        if (lastMsgObj.mes !== undefined) lastMsgObj.mes = cleanContent + injection;

        logAnima('success', 'Orchestrator', 'Đã tiêm Narrative Nudge vào prompt thành công.');
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

        logAnima('info', 'Orchestrator', `Nhận tin nhắn phản hồi của nhân vật (#${messageId}). Đang quét XML tags...`);

        // Simple XML tag scanner for state update synchronization
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

        const locationMatch = rawText.match(/<change_location>([\s\S]*?)<\/change_location>/i);
        if (locationMatch && locationMatch[1]) {
            AnimaState.applyXmlUpdates('change_location', locationMatch[1].trim());
            changed = true;
        }

        if (changed) {
            const characterId = context.characterId;
            if (characterId !== undefined) {
                AnimaState.saveForCharacter(characterId);
            }
            AnimaUI.updateUI(AnimaState);
        }
    },

    onMessageRendered(messageId) {
        // Safe check for history render
        this.onMessageReceived(messageId);
    }
};
