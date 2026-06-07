// v11.0
import { HormoneEngine } from './HormoneEngine.js';
import { MemoryEngine } from './MemoryEngine.js';
import { ConsciousnessEngine } from './ConsciousnessEngine.js';
import { PersonalityCore } from './PersonalityCore.js';
import { ADAgent } from '../cognitive/ADAgent.js';
import { MentalStateEngine } from './MentalStateEngine.js';

export class CognitiveAgent {
    constructor(saveState = null) {
        const memoryData = saveState || null;

        // Genetics
        this.genetics = memoryData?.genetics || {
            comt: 'Val/Met',
            serotonin_transporter: 'S/L',
            oxtr: 'A/G',
            drd4: '7R-'
        };

        this.hormones = new HormoneEngine(memoryData?.neuro_chemistry);
        this.memory = new MemoryEngine(memoryData, this.genetics);
        this.consciousness = new ConsciousnessEngine(memoryData?.config);
        this.personalityCore = new PersonalityCore(memoryData?.personality_traits);
        this.adAgent = null;

        this.body = memoryData?.body || 'Bình thường, khỏe mạnh.';

        // Physical status
        this.body_status = memoryData?.body_status || {
            energy: 10.0,
            pain: 0.0,
            hunger: 0.0,
            thirst: 0.0,
            toilet_need: 0.0,
            nausea: 0.0,
            dyspnea: 0.0,
            temp_sensation: 'Bình thường'
        };

        if (memoryData?.body_status?.bladder !== undefined && this.body_status.toilet_need === undefined) {
            this.body_status.toilet_need = memoryData.body_status.bladder;
            delete this.body_status.bladder;
        }

        // Clinical Vitals
        this.vitals = memoryData?.vitals || {
            heart_rate: 75,
            blood_pressure_sys: 120,
            blood_pressure_dia: 80,
            body_temp: 36.8,
            resp_rate: 16
        };

        this.mental_state = memoryData?.mental_state || 'Cân bằng / Yên bình 😐';
        this.last_update_timestamp = memoryData?.last_update_timestamp || new Date().toISOString();

        // SillyTavern properties
        this.personality = memoryData?.personality || {
            forgetting: 5,
            sensitivity: 5,
            healing: 5,
            habit_threshold: 3
        };

        if (this.genetics.drd4 === '7R+') {
            this.personality.habit_threshold = 5;
        }

        this.biomarker_triggers = memoryData?.biomarker_triggers || [];
        this.neuro_history = memoryData?.neuro_history || {};

        // Mental state evaluation engine
        this.mentalEngine = new MentalStateEngine(this.hormones, this.body_status, this.vitals);
    }

    updateVitalsAndSensations(updates) {
        if (!updates) return;
        for (const [key, val] of Object.entries(updates)) {
            const k = key.toLowerCase().trim();
            if (this.body_status[k] !== undefined) {
                if (typeof this.body_status[k] === 'number') {
                    this.body_status[k] = Math.min(Math.max(parseFloat(val), 0.0), 10.0);
                } else {
                    this.body_status[k] = val;
                }
            } else if (this.vitals[k] !== undefined) {
                this.vitals[k] = parseFloat(val);
            } else if (k === 'blood_pressure_sys') {
                this.vitals.blood_pressure_sys = parseInt(val);
            } else if (k === 'blood_pressure_dia') {
                this.vitals.blood_pressure_dia = parseInt(val);
            } else if (k === 'injury' || k === 'body') {
                this.body = val;
            }
        }
        this.updateDynamicMentalState();
    }

    tickPhysicalSensations(elapsedMinutes, isSleeping = false) {
        if (elapsedMinutes <= 0) return;
        if (isSleeping) {
            this.body_status.energy = Math.min(this.body_status.energy + elapsedMinutes * 0.05, 10.0);
            this.body_status.hunger = Math.min(this.body_status.hunger + elapsedMinutes * 0.002, 10.0);
            this.body_status.thirst = Math.min(this.body_status.thirst + elapsedMinutes * 0.003, 10.0);
            this.body_status.toilet_need = Math.min(this.body_status.toilet_need + elapsedMinutes * 0.007, 10.0);
        } else {
            this.body_status.energy = Math.max(this.body_status.energy - elapsedMinutes * 0.004, 0.0);
            this.body_status.hunger = Math.min(this.body_status.hunger + elapsedMinutes * 0.003, 10.0);
            this.body_status.thirst = Math.min(this.body_status.thirst + elapsedMinutes * 0.004, 10.0);
            this.body_status.toilet_need = Math.min(this.body_status.toilet_need + elapsedMinutes * 0.005, 10.0);
        }

        if (this.vitals.heart_rate < 100) {
            this.body_status.dyspnea = Math.max(this.body_status.dyspnea - elapsedMinutes * 0.08, 0.0);
        }
        this.body_status.nausea = Math.max(this.body_status.nausea - elapsedMinutes * 0.04, 0.0);
        this.body_status.pain = Math.max(this.body_status.pain - elapsedMinutes * 0.005, 0.0);
    }

    processMessage(text, role, currentMessageIndex) {
        const lastTime = new Date(this.last_update_timestamp).getTime();
        const elapsedMinutes = (Date.now() - lastTime) / 60000;

        this.hormones.decay(elapsedMinutes, this.body, this.genetics);
        this.memory.decayShortTermMemory(elapsedMinutes);
        this.memory.applyTemporalAnchor(currentMessageIndex, this.hormones, this.neuro_history);

        const isSleeping = this.hormones.levels.melatonin >= 8.0;
        this.tickPhysicalSensations(elapsedMinutes, isSleeping);

        this.updateDynamicMentalState();
        this.last_update_timestamp = new Date().toISOString();

        if (currentMessageIndex !== undefined && currentMessageIndex !== null) {
            this.neuro_history[currentMessageIndex] = { ...this.hormones.levels };
        }

        return [];
    }

    updateDynamicMentalState() {
        this.mental_state = this.mentalEngine.compute(this.memory.in_crisis);
    }

    async getADIntentForMessage(userInput, availableTools = [], characterName = 'itto') {
        if (!this.adAgent) {
            this.adAgent = new ADAgent();
        }

        let charPersonality = {};
        try {
            if (typeof window !== 'undefined' || typeof fetch !== 'undefined') {
                let moduleName = 'third-party/Anima';
                try {
                    const extensionPath = new URL('.', import.meta.url).pathname;
                    const extIdx = extensionPath.indexOf('/extensions/');
                    if (extIdx !== -1) {
                        moduleName = extensionPath.substring(extIdx + 12).replace(/\/$/, '');
                    }
                } catch {
                    // Quiet fallback to default path
                }

                const response = await fetch(`/extensions/${moduleName}/characters/${characterName.toLowerCase()}/personality.json`);
                if (response.ok) {
                    charPersonality = await response.json();
                }
            } else {
                const fs = await import('fs');
                const path = await import('path');
                const pPath = path.join(process.cwd(), 'characters', characterName.toLowerCase(), 'personality.json');
                if (fs.existsSync(pPath)) {
                    charPersonality = JSON.parse(fs.readFileSync(pPath, 'utf8'));
                }
            }
        } catch (err) {
            console.warn(`Could not load personality for ${characterName}:`, err.message);
        }

        const mergedTraits = { ...charPersonality, ...this.personalityCore.getAllTraits() };
        const context = `Mental State: ${this.mental_state}.`;

        const result = await this.adAgent.evaluate({
            context,
            userInput,
            availableTools,
            personality: mergedTraits,
            characterName
        });

        if (result) {
            console.log(`[AD] mood=${result.mood} tool=${result.toolChoice || 'none'} spend=$${this.adAgent.getTokenSpendToday().toFixed(4)}`);
        }
        return result;
    }

    serialize() {
        const memSerialized = this.memory.serialize();
        return {
            ...memSerialized,
            neuro_chemistry: this.hormones.serialize(),
            config: this.consciousness.serialize(),
            body: this.body,
            body_status: this.body_status,
            vitals: this.vitals,
            genetics: this.genetics,
            mental_state: this.mental_state,
            last_update_timestamp: this.last_update_timestamp,
            personality: this.personality,
            biomarker_triggers: this.biomarker_triggers,
            neuro_history: this.neuro_history,
            personality_traits: this.personalityCore.serialize()
        };
    }
}
