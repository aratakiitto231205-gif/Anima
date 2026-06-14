// v0.13.0 — LLM Integration (reuse SillyTavern's generation API)
import { logAnima } from './logger.js';

export const LLMClient = {
    /**
     * Calls ST's generation API with given prompt
     * @param {string} prompt - The prompt to send
     * @param {Object} _options - Optional overrides (model, temperature, etc.)
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, _options = {}) {
        if (typeof SillyTavern === 'undefined') {
            throw new Error('SillyTavern context not available');
        }

        try {
            const context = SillyTavern.getContext();
            const { generateRaw } = context;

            if (!generateRaw) {
                throw new Error('generateRaw function not available in ST context');
            }

            // Check if user configured a specific model for GM
            let gmModel = null;
            try {
                const ext = await import('../../../../../extensions.js');
                gmModel = ext.extension_settings?.['st-anima']?.gm_model;
            } catch {
                // Ignore in testing environments
            }

            if (gmModel) {
                logAnima('info', 'LLM', `Using GM-specific model: ${gmModel}`);
                // ST's generateRaw will use the currently active API settings
                // Model override would need deeper ST API integration
            }

            // Use ST's generateRaw API (respects user's current API/model settings)
            const result = await generateRaw(prompt, null, false, false);

            if (!result) {
                throw new Error('Empty response from LLM');
            }

            logAnima('success', 'LLM', `Generated ${result.length} chars`);
            return result;
        } catch (err) {
            logAnima('error', 'LLM', `Generation failed: ${err.message}`);
            throw err;
        }
    }
};
