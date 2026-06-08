// v0.11.0 skeleton — sketch stage
// Orchestrator: wires ST events to GM + RP flow. No state mutation, no LLM calls yet.

import { planAndUpdate } from '../agents/gm.js';
import { writeProse } from '../agents/rp.js';
import { logAnima } from '../utils/logger.js';

export class Orchestrator {
    constructor() {
        /** @type {Array<{type: string, handler: Function}>} */
        this.attachedHandlers = [];
        this.state = null; // Set by attachEventHandlers via initState
    }

    /**
     * Initialize state for the current chat. SKETCH: empty state.
     */
    initState() {
        // SKETCH: real impl loads from ST character extension data
        this.state = { hormones: {}, emotion: { valence: 0, arousal: 0 } };
    }

    /**
     * Attach event handlers. Idempotent.
     * @param {Object} ctx - { eventSource, event_types }
     */
    attachEventHandlers({ eventSource, event_types }) {
        this.detachEventHandlers();
        const registrations = [
            [event_types.CHAT_CHANGED, () => this._onChatChanged()],
            [event_types.MESSAGE_RECEIVED, (msgId) => this._onMessageReceived(msgId)],
        ];
        for (const [type, handler] of registrations) {
            eventSource.on(type, handler);
            this.attachedHandlers.push({ type, handler });
        }
        logAnima('info', 'Orchestrator', `attached ${registrations.length} event handlers (skeleton)`);
    }

    /**
     * Remove all event handlers. Safe to call when nothing is attached.
     */
    detachEventHandlers() {
        if (typeof SillyTavern === 'undefined' || this.attachedHandlers.length === 0) return;
        const { eventSource } = SillyTavern.getContext();
        for (const { type, handler } of this.attachedHandlers) {
            try {
                if (typeof eventSource.off === 'function') eventSource.off(type, handler);
                else if (typeof eventSource.removeListener === 'function') eventSource.removeListener(type, handler);
            } catch (_) {
                // eventSource may not support removal in some ST versions; OK
            }
        }
        this.attachedHandlers = [];
    }

    _onChatChanged() {
        this.initState();
    }

    /**
     * SKETCH flow: user msg → GM plan → RP write. No state mutation, no LLM call yet.
     * @param {number} messageId
     */
    /**
     * Test/utility entry: add a message to chat context and process it.
     * SKETCH: real entry point is _onMessageReceived wired to ST event.
     * @param {string} text
     */
    async processMessage(text) {
        if (typeof SillyTavern === 'undefined') return;
        const ctx = SillyTavern.getContext();
        if (!ctx.chat) ctx.chat = [];
        const messageId = ctx.chat.length;
        ctx.chat.push({ mes: text, is_user: true });
        return this._onMessageReceived(messageId);
    }

    async _onMessageReceived(messageId) {
        if (typeof SillyTavern === 'undefined') return;
        const ctx = SillyTavern.getContext();
        if (!ctx?.chat) return;
        const msg = ctx.chat[messageId];
        if (!msg || !msg.mes) return;
        if (!this.state) this.initState();

        const gmOut = await planAndUpdate({
            userMessage: msg.mes,
            chat: ctx.chat,
            state: this.state,
            agent: null, // SKETCH: agent TBD
        });

        const rpOut = await writeProse({
            plan: gmOut.plan,
            characterStyle: '',
            chatExample: [],
            recalledMemories: gmOut.recalled_memories,
            state: this.state,
            llmCall: async () => 'skeleton: no LLM call', // SKETCH: real LLM in line stage
        });

        logAnima('info', 'Orchestrator', `skeleton: would write ${rpOut.segments.length} segment(s) for msg #${messageId}`);
    }
}
