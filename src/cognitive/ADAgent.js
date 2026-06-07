// v11.0
import { buildADSystemPrompt } from './ad-prompt.js';
import { MOOD_WHITELIST } from '../utils/constants.js';

export class BudgetExceededError extends Error {
    constructor(message) {
        super(message);
        this.name = "BudgetExceededError";
    }
}

export class ADAgent {
    constructor() {
        this.apiKey = '';
        this.apiUrl = 'https://api.shopaikey.com/v1/chat/completions';
        this.model = 'gemini-3.1-flash-lite';
        this.dailyBudgetUsd = 0.50;
        this.tokenSpendTracker = 0;
        
        // Approx cost per call for Flash Lite
        this.costPerCall = 0.0001; 

        this.loadConfigFromSTContext();
    }

    loadConfigFromSTContext() {
        if (typeof SillyTavern !== 'undefined') {
            const context = SillyTavern.getContext();
            const settings = context?.extension_settings?.anima_engine || {};
            
            this.apiKey = settings.ad_api_key || '';
            this.apiUrl = settings.ad_api_url || 'https://api.shopaikey.com/v1/chat/completions';
            this.model = settings.ad_model || 'gemini-3.1-flash-lite';
            
            const parsedBudget = parseFloat(settings.ad_daily_budget_usd);
            if (!isNaN(parsedBudget)) {
                this.dailyBudgetUsd = parsedBudget;
            }
        }
    }

    getTokenSpendToday() {
        return this.tokenSpendTracker;
    }

    async evaluate({ context, userInput, availableTools = [], personality = {}, characterName = 'Itto' }) {
        this.loadConfigFromSTContext();

        if (!this.apiKey) {
            console.warn("AD Agent: apiKey not configured in ST extension settings");
            return null;
        }

        if (this.tokenSpendTracker + this.costPerCall > this.dailyBudgetUsd) {
            const errMsg = `Daily budget of $${this.dailyBudgetUsd} exceeded (Spent: $${this.tokenSpendTracker.toFixed(4)}).`;
            console.warn(`[AD Agent] Budget Limit: ${errMsg}`);
            throw new BudgetExceededError(errMsg);
        }

        const moodWhitelist = MOOD_WHITELIST;
        const systemPrompt = buildADSystemPrompt({ characterName, personalityTraits: personality, moodWhitelist });
        const userPrompt = `Context: ${context}\nUser Input: ${userInput}\nAvailable Tools: ${availableTools.join(", ")}\n`;

        const requestBody = {
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("ADAgent API Error:", errData);
                return null;
            }

            const data = await response.json();
            this.tokenSpendTracker += this.costPerCall;

            let rawText = data.choices[0].message.content;
            if (rawText.startsWith('```')) {
                rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            }

            const parsed = JSON.parse(rawText);
            
            // Validate tool choice hallucination
            if (parsed.should_use_tool && parsed.tool_choice && !availableTools.includes(parsed.tool_choice)) {
                parsed.tool_choice = null;
                parsed.should_use_tool = false;
                parsed.reasoning += " (Note: Tool hallucinated and neutralized by AD Agent validation).";
            }
            
            // Validate mood hallucination
            if (!moodWhitelist.includes(parsed.mood)) {
                parsed.mood = "calm";
            }

            return {
                mood: parsed.mood,
                relevantMemoriesToRecall: parsed.relevant_memories_to_recall || [],
                shouldUseTool: parsed.should_use_tool || false,
                toolChoice: parsed.tool_choice || null,
                reasoning: parsed.reasoning || ""
            };
        } catch (error) {
            console.error("ADAgent JSON/Fetch Error:", error.message);
            return null;
        }
    }
}
