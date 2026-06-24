// v0.13.3.1 — Simplified State Manager
import { logAnima } from '../utils/logger.js';

export const AnimaState = {
    enabled: true,
    active_emotion: 'Neutral 😐',
    activePlan: null,
    lastUpdateTimestamp: null,
    environment: {
        location: 'Mặc định',
        timeOfDay: 'Mặc định',
        weather: 'Mặc định',
        inventory: []
    },
    snapshotState: null,

    snapshot() {
        this.snapshotState = {
            active_emotion: this.active_emotion,
            activePlan: this.activePlan ? JSON.parse(JSON.stringify(this.activePlan)) : null,
            environment: JSON.parse(JSON.stringify(this.environment))
        };
        logAnima('info', 'State', 'Đã lưu snapshot state.');
    },

    restoreSnapshot() {
        if (this.snapshotState) {
            this.active_emotion = this.snapshotState.active_emotion;
            this.activePlan = this.snapshotState.activePlan ? JSON.parse(JSON.stringify(this.snapshotState.activePlan)) : null;
            this.environment = JSON.parse(JSON.stringify(this.snapshotState.environment));
            logAnima('info', 'State', 'Đã khôi phục state từ snapshot.');
        }
    },

    resetToDefault() {
        this.enabled = true;
        this.active_emotion = 'Neutral 😐';
        this.activePlan = null;
        this.lastUpdateTimestamp = new Date().toISOString();
        this.environment = {
            location: 'Mặc định',
            timeOfDay: 'Mặc định',
            weather: 'Mặc định',
            inventory: []
        };
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
                this.environment = savedState.environment || {
                    location: 'Mặc định',
                    timeOfDay: 'Mặc định',
                    weather: 'Mặc định',
                    inventory: []
                };
                
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
            lastUpdateTimestamp: this.lastUpdateTimestamp,
            environment: this.environment
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
        if (gmOutput.state_update?.environment) {
            this.environment = {
                ...this.environment,
                ...gmOutput.state_update.environment
            };
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
