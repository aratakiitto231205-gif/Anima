import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ADAgent, BudgetExceededError } from '../ADAgent.js';
import { buildADSystemPrompt } from '../ad-prompt.js';

// Mock fetch globally
const originalFetch = global.fetch;

describe('ADAgent', () => {
    let agent;

    beforeEach(() => {
        agent = new ADAgent();
        global.fetch = vi.fn();
        
        global.SillyTavern = {
            getContext: () => ({
                extension_settings: {
                    anima_engine: {
                        ad_api_key: 'test_key',
                        ad_daily_budget_usd: 0.50
                    }
                }
            })
        };
    });

    afterEach(() => {
        global.fetch = originalFetch;
        delete global.SillyTavern;
    });

    it('returns null + logs warning when apiKey is empty', async () => {
        global.SillyTavern.getContext = () => ({
            extension_settings: { anima_engine: { ad_api_key: '' } }
        });
        
        const originalWarn = console.warn;
        console.warn = vi.fn();

        const result = await agent.evaluate({
            context: "Test",
            userInput: "Hello"
        });

        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith("AD Agent: apiKey not configured in ST extension settings");
        expect(global.fetch).not.toHaveBeenCalled();

        console.warn = originalWarn;
    });

    it('returns valid JSON shape on 200 response', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: JSON.stringify({
                        mood: "excited",
                        relevant_memories_to_recall: ["test memory"],
                        should_use_tool: false,
                        tool_choice: null,
                        reasoning: "Test reasoning"
                    })
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await agent.evaluate({
            context: "Test",
            userInput: "Hello",
            availableTools: ["test_tool"]
        });

        expect(result).not.toBeNull();
        expect(result.mood).toBe("excited");
        expect(result.shouldUseTool).toBe(false);
        expect(agent.getTokenSpendToday()).toBeGreaterThan(0);
    });

    it('marks tool as hallucinated if LLM returns tool not in availableTools', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: JSON.stringify({
                        mood: "calm",
                        relevant_memories_to_recall: [],
                        should_use_tool: true,
                        tool_choice: "fake_tool_xyz",
                        reasoning: "Trying a fake tool"
                    })
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await agent.evaluate({
            context: "Test",
            userInput: "Hello",
            availableTools: ["real_tool"]
        });

        expect(result.shouldUseTool).toBe(false);
        expect(result.toolChoice).toBeNull();
        expect(result.reasoning).toContain("neutralized by AD Agent");
    });

    it('throws BudgetExceededError when daily cap exceeded', async () => {
        agent.loadConfigFromSTContext();
        agent.tokenSpendTracker = 0.50; // Max budget reached
        
        await expect(agent.evaluate({
            context: "Test",
            userInput: "Hello"
        })).rejects.toThrow(BudgetExceededError);
    });

    it('handles malformed JSON gracefully', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: "This is not JSON..."
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        // Suppress console.error for this test
        const originalError = console.error;
        console.error = vi.fn();

        const result = await agent.evaluate({
            context: "Test",
            userInput: "Hello"
        });

        expect(result).toBeNull();

        console.error = originalError;
    });

    it('builds system prompt with correct character name + personality traits', () => {
        const prompt = buildADSystemPrompt({
            characterName: "TestChar",
            personalityTraits: { ambition: 9 },
            moodWhitelist: ["calm", "excited"]
        });
        
        expect(prompt).toContain("Subconscious AD Agent for TestChar");
        expect(prompt).toContain("ambition: 9/10");
        expect(prompt).toContain("calm, excited");
    });

    it('does not include max_tokens in the request body', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: JSON.stringify({
                        mood: "calm",
                        relevant_memories_to_recall: [],
                        should_use_tool: false,
                        tool_choice: null,
                        reasoning: "Test reasoning"
                    })
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        await agent.evaluate({
            context: "Test context",
            userInput: "Hello",
            availableTools: []
        });

        expect(global.fetch).toHaveBeenCalled();
        const fetchArgs = global.fetch.mock.calls[0];
        const bodyParsed = JSON.parse(fetchArgs[1].body);
        expect(bodyParsed).not.toHaveProperty('max_tokens');
    });

    it('calls loadConfigFromSTContext in constructor and sets apiKey', () => {
        const newAgent = new ADAgent();
        expect(newAgent.apiKey).toBe('test_key');
    });

    it('parses response correctly when wrapped in markdown JSON code block', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: "```json\n{\n  \"mood\": \"excited\",\n  \"relevant_memories_to_recall\": [],\n  \"should_use_tool\": false,\n  \"tool_choice\": null,\n  \"reasoning\": \"Markdown JSON\"\n}\n```"
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await agent.evaluate({
            context: "Test context",
            userInput: "Hello",
            availableTools: []
        });

        expect(result).not.toBeNull();
        expect(result.mood).toBe("excited");
        expect(result.reasoning).toBe("Markdown JSON");
    });
});
