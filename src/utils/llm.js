import { logAnima } from './logger.js';

export const LLMClient = {
    /**
     * Calls LLM API using ST's active connection profile
     * @param {string} prompt - The prompt to send
     * @param {Object} _options - Optional overrides
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, _options = {}) {
        if (typeof SillyTavern === 'undefined') {
            throw new Error('SillyTavern context not available');
        }

        try {
            // Use ST's generateRaw - automatically uses active connection profile
            const context = SillyTavern.getContext();
            const { generateRaw } = context;

            if (!generateRaw) {
                throw new Error('generateRaw function not available in ST context');
            }

            logAnima('info', 'LLM', 'Calling LLM using ST connection profile');
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
