export class PersonalityCore {
    constructor(traits = {}) {
        this.traits = {};
        for (const [key, value] of Object.entries(traits)) {
            const val = parseFloat(value);
            if (isNaN(val) || val < 0 || val > 10) {
                throw new Error(`Invalid trait value for ${key}: must be a number between 0 and 10.`);
            }
            this.traits[key] = val;
        }
    }

    getTrait(name) {
        return this.traits[name] !== undefined ? this.traits[name] : 5.0; // Default to neutral 5.0
    }

    getAllTraits() {
        return { ...this.traits };
    }

    serialize() {
        return { ...this.traits };
    }
}
