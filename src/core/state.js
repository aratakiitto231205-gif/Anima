// v0.12.3 — Simplified State Manager
import { logAnima } from '../utils/logger.js';

export const AnimaState = {
    enabled: true,
    active_emotion: 'Neutral 😐',
    activePlan: null,
    lastUpdateTimestamp: null,

    resetToDefault() {
        this.enabled = true;
        this.active_emotion = 'Neutral 😐';
        this.activePlan = null;
        this.lastUpdateTimestamp = new Date().toISOString();
    },

    loadForCharacter(characterId) {
        if (typeof SillyTavern === 'undefined') {
            this.resetToDefault();
            return;
        }

        const context = SillyTavern.getContext();
        const character = context?.characters?.[characterId];
        if (!character) {
            this.resetToDefault();
            return;
        }

        const savedState = character.data?.extensions?.st_anima_state;
        if (savedState) {
            try {
                this.enabled = savedState.enabled !== false;
                this.active_emotion = savedState.active_emotion || 'Neutral 😐';
                this.activePlan = savedState.activePlan || null;
                this.lastUpdateTimestamp = savedState.lastUpdateTimestamp || new Date().toISOString();
                
                logAnima('success', 'State', `Đã tải trạng thái: emotion=${this.active_emotion}`);
            } catch (err) {
                logAnima('error', 'State', `Lỗi tải state, đặt mặc định: ${err.message}`);
                this.resetToDefault();
            }
        } else {
            this.resetToDefault();
        }
    },

    saveForCharacter(characterId) {
        if (typeof SillyTavern === 'undefined' || characterId === undefined) return;

        const context = SillyTavern.getContext();
        const { writeExtensionField } = context;
        
        this.lastUpdateTimestamp = new Date().toISOString();
        const stateData = {
            enabled: this.enabled,
            active_emotion: this.active_emotion,
            activePlan: this.activePlan,
            lastUpdateTimestamp: this.lastUpdateTimestamp
        };

        try {
            writeExtensionField(characterId, 'st_anima_state', stateData);
            logAnima('success', 'State', 'Đã lưu trạng thái.');
        } catch (e) {
            logAnima('error', 'State', `Lưu thất bại: ${e.message}`);
        }
    },

    updateFromGM(gmOutput) {
        if (!gmOutput) return;

        if (gmOutput.state_update?.active_emotion) {
            this.active_emotion = gmOutput.state_update.active_emotion;
        }
        if (gmOutput.plan) {
            this.activePlan = gmOutput.plan;
        }
        logAnima('success', 'State', 'Đã cập nhật trạng thái từ GM.');
    },

    applyXmlUpdates(tag, value) {
        if (tag === 'neuro_update' || tag === 'body_update') {
            const parts = value.split(',');
            parts.forEach(part => {
                const [k, v] = part.split('=').map(s => s.trim());
                if (k.toLowerCase() === 'emotion') {
                    this.active_emotion = v;
                    logAnima('success', 'State', `XML State Update: active_emotion = ${v}`);
                }
            });
        }
    }
};
