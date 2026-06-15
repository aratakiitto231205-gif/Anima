import { logAnima } from './logger.js';

export const LLMClient = {
    /**
     * Calls LLM API with given prompt
     * @param {string} prompt - The prompt to send
     * @param {Object} _options - Optional overrides
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, _options = {}) {
        if (typeof SillyTavern === 'undefined') {
            throw new Error('SillyTavern context not available');
        }

        try {
            let settings = {};
            try {
                const ext = await import('../../../../../extensions.js');
                settings = ext.extension_settings?.['st-anima'] || {};
            } catch {
                // Ignore in testing environments
            }

            if (settings.api_mode === 'custom') {
                const url = settings.custom_url || 'https://api.openai.com/v1';
                const key = settings.custom_key || '';
                const model = settings.custom_model || 'gpt-4o-mini';

                logAnima('info', 'LLM', `Calling Custom API: ${url} (Model: ${model})`);
                
                const endpoint = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 800
                    })
                });

                if (!response.ok) {
                    throw new Error(`Custom API returned ${response.status}: ${await response.text()}`);
                }

                const data = await response.json();
                const result = data.choices?.[0]?.message?.content;

                if (!result) throw new Error('No content in Custom API response');

                logAnima('success', 'LLM', `Generated ${result.length} chars (Custom API)`);
                return result;
            }

            // Fallback to ST's global API
            const context = SillyTavern.getContext();
            const { generateRaw } = context;

            if (!generateRaw) {
                throw new Error('generateRaw function not available in ST context');
            }

            logAnima('info', 'LLM', `Using ST Global API`);
            const result = await generateRaw(prompt, null, false, false);

            if (!result) {
                throw new Error('Empty response from LLM');
            }

            logAnima('success', 'LLM', `Generated ${result.length} chars (ST Global)`);
            return result;
        } catch (err) {
            logAnima('error', 'LLM', `Generation failed: ${err.message}`);
            throw err;
        }
    }
};
