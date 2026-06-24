import { logAnima } from './logger.js';

export const LLMClient = {
    /**
     * Calls LLM API using ST's active connection profile
     * @param {string} prompt - The prompt to send
     * @param {Object} _options - Optional overrides
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, settings = {}) {
        if (settings.api_type === 'custom') {
            return this.generateCustom(prompt, settings);
        }

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
    },

    async generateCustom(prompt, settings) {
        logAnima('info', 'LLM', 'Calling Custom API (OpenAI format)');
        
        const url = settings.custom_api_url;
        if (!url) throw new Error('Chưa thiết lập URL cho Custom API.');
        
        let targetUrl = url.trim();
        if (!targetUrl.endsWith('/chat/completions')) {
            if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
            targetUrl = `${targetUrl}/chat/completions`;
        }
        
        const apiKey = settings.custom_api_key || '';
        const model = settings.custom_api_model || 'gpt-3.5-turbo';

        const headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const body = JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        });

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.choices && data.choices.length > 0) {
            const result = data.choices[0].message.content;
            logAnima('success', 'LLM', `Generated ${result.length} chars from Custom API`);
            return result;
        } else {
            throw new Error('Custom API trả về định dạng không hợp lệ.');
        }
    }
};
