// v0.12.2 — State Manager (Single Source of Truth)
import { logAnima } from '../utils/logger.js';

export const AnimaState = {
    vitals: {
        heart_rate: 75,
        blood_pressure_sys: 120,
        blood_pressure_dia: 80,
        body_temp: 36.8,
        resp_rate: 16
    },
    body_status: {
        energy: 10.0,
        pain: 0.0,
        hunger: 0.0,
        thirst: 0.0,
        toilet_need: 0.0,
        nausea: 0.0,
        temp_sensation: 'Bình thường 🧘'
    },
    hormones: {
        adrenaline: 2.0,
        cortisol: 2.0,
        melatonin: 2.0,
        dopamine: 5.0,
        serotonin: 5.0,
        oxytocin: 5.0,
        endorphins: 3.0,
        sex_hormones: 5.0
    },
    mental_state: 'Cân bằng / Yên bình 😐',
    active_emotion: 'Neutral 😐',
    activePlan: null,
    recalled_memories: [],
    lastUpdateTimestamp: null,

    resetToDefault() {
        this.vitals = { heart_rate: 75, blood_pressure_sys: 120, blood_pressure_dia: 80, body_temp: 36.8, resp_rate: 16 };
        this.body_status = { energy: 10.0, pain: 0.0, hunger: 0.0, thirst: 0.0, toilet_need: 0.0, nausea: 0.0, temp_sensation: 'Bình thường 🧘' };
        this.hormones = { adrenaline: 2.0, cortisol: 2.0, melatonin: 2.0, dopamine: 5.0, serotonin: 5.0, oxytocin: 5.0, endorphins: 3.0, sex_hormones: 5.0 };
        this.mental_state = 'Cân bằng / Yên bình 😐';
        this.active_emotion = 'Neutral 😐';
        this.activePlan = null;
        this.recalled_memories = [];
        this.lastUpdateTimestamp = new Date().toISOString();
    },

    // Dynamic state loading based on current ST context character
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
                this.vitals = { ...this.vitals, ...savedState.vitals };
                this.body_status = { ...this.body_status, ...savedState.body_status };
                this.hormones = { ...this.hormones, ...savedState.hormones };
                this.mental_state = savedState.mental_state || 'Cân bằng / Yên bình 😐';
                this.active_emotion = savedState.active_emotion || 'Neutral 😐';
                this.activePlan = savedState.activePlan || null;
                this.recalled_memories = savedState.recalled_memories || [];
                this.lastUpdateTimestamp = savedState.lastUpdateTimestamp || new Date().toISOString();
                
                logAnima('success', 'State', `Đã tải trạng thái cho nhân vật: ${character.name}`);
            } catch (err) {
                logAnima('error', 'State', `Lỗi parse state cho ${character.name}: ${err.message}. Đặt mặc định.`);
                this.resetToDefault();
            }
        } else {
            logAnima('info', 'State', `Không tìm thấy dữ liệu cũ của ${character.name}, khởi tạo mặc định.`);
            this.resetToDefault();
        }
        
        // Trigger decay checks since last chat update
        this.applyDecaySinceLastUpdate();
    },

    saveForCharacter(characterId) {
        if (typeof SillyTavern === 'undefined' || characterId === undefined) return;

        const context = SillyTavern.getContext();
        const { writeExtensionField } = context;
        
        this.lastUpdateTimestamp = new Date().toISOString();
        const stateData = {
            vitals: this.vitals,
            body_status: this.body_status,
            hormones: this.hormones,
            mental_state: this.mental_state,
            active_emotion: this.active_emotion,
            activePlan: this.activePlan,
            recalled_memories: this.recalled_memories,
            lastUpdateTimestamp: this.lastUpdateTimestamp
        };

        try {
            writeExtensionField(characterId, 'st_anima_state', stateData);
            logAnima('success', 'State', `Đã lưu trạng thái nhận thức vào thẻ nhân vật.`);
        } catch (e) {
            logAnima('error', 'State', `Lưu trạng thái thất bại: ${e.message}`);
        }
    },

    applyDecaySinceLastUpdate() {
        if (!this.lastUpdateTimestamp) {
            this.lastUpdateTimestamp = new Date().toISOString();
            return;
        }

        const elapsedMs = Date.now() - new Date(this.lastUpdateTimestamp).getTime();
        const elapsedMinutes = elapsedMs / 60000;
        
        if (elapsedMinutes <= 0.5) return; // Ignore ticks less than 30s
        
        this.decay(elapsedMinutes);
        this.lastUpdateTimestamp = new Date().toISOString();
    },

    // Gentle baseline decay (No over-mathematization ticks)
    decay(elapsedMinutes) {
        const baseLevels = {
            adrenaline: 2.0, cortisol: 2.0, melatonin: 2.0,
            dopamine: 5.0, serotonin: 5.0, oxytocin: 5.0,
            endorphins: 3.0, sex_hormones: 5.0
        };

        // Hormone linear decay (very soft decay)
        for (const [key, base] of Object.entries(baseLevels)) {
            const current = this.hormones[key] || base;
            const diff = current - base;
            if (Math.abs(diff) > 0.05) {
                // Decay rate per minute (moves 0.01 units closer to baseline)
                const step = elapsedMinutes * 0.01 * Math.sign(diff);
                if (Math.abs(step) >= Math.abs(diff)) {
                    this.hormones[key] = base;
                } else {
                    this.hormones[key] -= step;
                }
            }
        }

        // Physical sensations linear shifts (extremely gentle)
        this.body_status.hunger = Math.min(this.body_status.hunger + elapsedMinutes * 0.001, 10.0);
        this.body_status.thirst = Math.min(this.body_status.thirst + elapsedMinutes * 0.002, 10.0);
        this.body_status.energy = Math.max(this.body_status.energy - elapsedMinutes * 0.0015, 0.0);

        // Bladder/toilet need: Safe linear cap at 6.0 to avoid force accidents by code ticks
        this.body_status.toilet_need = Math.min(this.body_status.toilet_need + elapsedMinutes * 0.0005, 6.0);
        
        logAnima('info', 'State', `Đã phân rã nhẹ sinh lý học (${elapsedMinutes.toFixed(1)} phút trôi qua)`);
    },

    updateFromGM(gmOutput) {
        if (!gmOutput) return;

        // Vitals nudge
        if (gmOutput.state_update?.vitals_nudge) {
            const nudge = gmOutput.state_update.vitals_nudge;
            this.vitals.heart_rate = Math.min(Math.max(this.vitals.heart_rate + (nudge.heart_rate_delta || 0), 50), 180);
            this.body_status.energy = Math.min(Math.max(this.body_status.energy + (nudge.energy_delta || 0), 0), 10);
            this.body_status.pain = Math.min(Math.max(this.body_status.pain + (nudge.pain_delta || 0), 0), 10);
        }

        // State updates via XML-like tags parsing
        if (gmOutput.state_update?.active_emotion) {
            this.active_emotion = gmOutput.state_update.active_emotion;
        }

        if (gmOutput.recalled_memories) {
            this.recalled_memories = gmOutput.recalled_memories;
        }

        if (gmOutput.plan) {
            this.activePlan = gmOutput.plan;
        }

        logAnima('success', 'State', `Đã cập nhật trạng thái từ kế hoạch của Game Master.`);
    },

    applyXmlUpdates(tag, value) {
        // Safe physiological update helper from LLM XML tags
        if (tag === 'body_update') {
            // value format: "energy=5.0, hunger=3.0, pain=0.0"
            const parts = value.split(',');
            parts.forEach(part => {
                const [k, v] = part.split('=').map(s => s.trim().toLowerCase());
                if (k && v && this.body_status[k] !== undefined) {
                    this.body_status[k] = Math.min(Math.max(parseFloat(v), 0), 10);
                    logAnima('success', 'State', `XML Body Update: ${k} = ${this.body_status[k]}`);
                }
            });
        } else if (tag === 'neuro_update') {
            // value format: "adrenaline=4.0, cortisol=1.0"
            const parts = value.split(',');
            parts.forEach(part => {
                const [k, v] = part.split('=').map(s => s.trim().toLowerCase());
                if (k && v && this.hormones[k] !== undefined) {
                    this.hormones[k] = Math.min(Math.max(parseFloat(v), 0), 10);
                    logAnima('success', 'State', `XML Neuro Update: ${k} = ${this.hormones[k]}`);
                }
            });
        }
    }
};
