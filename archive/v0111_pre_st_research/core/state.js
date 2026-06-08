// v0.11.0 skeleton — sketch stage
// State container: simple in-memory holder. Persistence added in line stage.

export class State {
    constructor(initial = {}) {
        this.hormones = initial.hormones ?? {};
        this.body = initial.body ?? null;
        this.environment = initial.environment ?? null;
        this.memory = initial.memory ?? { stm: [], ltm: [], beliefs: [] };
        this.emotion = initial.emotion ?? { valence: 0, arousal: 0 };
        this.personality = initial.personality ?? { ocean: { O: 0.5, C: 0.5, E: 0.5, A: 0.5, N: 0.5 } };
    }

    /**
     * Apply a state_update from GM output. Returns the new state.
     * @param {Object} update - partial state to merge
     */
    apply(update) {
        if (!update) return this;
        if (update.hormones) Object.assign(this.hormones, update.hormones);
        if (update.body !== undefined) this.body = update.body;
        if (update.environment !== undefined) this.environment = update.environment;
        if (update.emotion) Object.assign(this.emotion, update.emotion);
        return this;
    }

    serialize() {
        return {
            hormones: { ...this.hormones },
            body: this.body,
            environment: this.environment,
            memory: { stm: [...this.memory.stm], ltm: [...this.memory.ltm], beliefs: [...this.memory.beliefs] },
            emotion: { ...this.emotion },
            personality: { ocean: { ...this.personality.ocean } },
        };
    }
}
