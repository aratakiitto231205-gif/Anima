const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Set GEMINI_API_KEY in your environment before running this probe.");
    process.exit(1);
}

const API_URL = "https://api.shopaikey.com/v1/chat/completions";

const baseScenarios = [
  {
    context: "Hitsuji has been drawing for 3 hours straight without a break.",
    current_user_input: "Trời ơi mỏi lưng quá Itto ơi...",
    available_tools: ["search_web", "recall_memory", "play_music", "set_timer"]
  },
  {
    context: "Itto and Hitsuji were talking about Onikabuto (beetles) yesterday.",
    current_user_input: "Đố anh biết hnay tui bắt được con gì?",
    available_tools: ["search_web", "recall_memory"]
  },
  {
    context: "Hitsuji is feeling sad about a bad grade.",
    current_user_input: "Tui thi rớt môn Toán rồi... buồn quá...",
    available_tools: ["search_web", "recall_memory", "tell_joke"]
  },
  {
    context: "Silence for 5 hours. Hitsuji is offline.",
    current_user_input: "[SYSTEM: IDLE_TIMEOUT]",
    available_tools: ["search_web", "recall_memory", "check_news"]
  },
  {
    context: "Hitsuji mentions a new TikTok dance trend that Itto doesn't know.",
    current_user_input: "Anh xem cái trend Mèo méo meo chưa? Hài xỉu!",
    available_tools: ["search_web", "recall_memory", "surf_tiktok"]
  },
  {
    context: "Late at night, 2 AM.",
    current_user_input: "Vẫn chưa muốn ngủ... cày game tiếp thui.",
    available_tools: ["search_web", "recall_memory", "force_sleep_mode"]
  },
  {
    context: "Hitsuji asks a complex lore question about Genshin.",
    current_user_input: "Anh có nhớ Nham Thần tên thật là gì không?",
    available_tools: ["search_web", "recall_memory", "query_lore_db"]
  },
  {
    context: "Flirting context.",
    current_user_input: "Hôm nay nhìn anh bảnh phết đấy nha~",
    available_tools: ["search_web", "recall_memory"]
  },
  {
    context: "Hitsuji is angry about work.",
    current_user_input: "Sếp giao đống việc, ghét ghê á!!!",
    available_tools: ["search_web", "recall_memory", "smash_rocks"]
  },
  {
    context: "Random philosophical question.",
    current_user_input: "Anh nghĩ xem ý nghĩa cuộc sống là gì?",
    available_tools: ["search_web", "recall_memory"]
  }
];

// Duplicate to reach 100
const scenarios = [];
for (let i = 0; i < 100; i++) {
  const base = baseScenarios[i % 10];
  scenarios.push({
    id: i + 1,
    ...base
  });
}

const systemPrompt = `You are the Subconscious AD Agent for Arataki Itto (Genshin Impact). 
Itto is loud, proud, energetic, deeply cares about his friends (especially Hitsuji), and hates losing. 
Your job is NOT to talk to the user. Your job is to analyze the context and decide Itto's internal state and next action.

Output STRICTLY valid JSON with no markdown formatting or extra text.
Format:
{
  "mood": "string" (one of: calm, excited, annoyed, sleepy, concerned, competitive, affectionate),
  "relevant_memories_to_recall": ["string", "string"], (guess keywords to search in memory)
  "should_use_tool": boolean,
  "tool_choice": "string" (must be from available_tools, or null if should_use_tool is false),
  "reasoning": "string" (1 short sentence explaining why)
}`;

async function runProbe() {
  console.log("Starting Gemini 3.1 Flash Lite AD Probe (100 requests)...\n");
  const results = [];
  let totalTime = 0;
  let validJsonCount = 0;
  let hallucinatedToolCount = 0;

  // We process in batches of 10 to speed it up but avoid immediate rate limits
  const batchSize = 10;
  for (let i = 0; i < scenarios.length; i += batchSize) {
    const batch = scenarios.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1}/${scenarios.length/batchSize}...`);
    
    const promises = batch.map(async (scenario) => {
      const prompt = `Context: ${scenario.context}\nUser Input: ${scenario.current_user_input}\nAvailable Tools: ${scenario.available_tools.join(", ")}\n`;
      
      const requestBody = {
        model: "gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      };

      const startTime = performance.now();
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          },
          body: JSON.stringify(requestBody)
        });
        
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        const data = await response.json();
        
        if (!response.ok) {
           return { id: scenario.id, duration_ms: duration, status: "error", error: data.error?.message || "Unknown API error" };
        }

        let rawText = data.choices[0].message.content;
        
        // Clean up markdown code blocks if any
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/```json\n/g, '').replace(/\n```/g, '').trim();
        }

        let parsed = null;
        let validJson = false;
        let hallucinatedTool = false;

        try {
          parsed = JSON.parse(rawText);
          validJson = true;
          
          if (parsed.should_use_tool && parsed.tool_choice && !scenario.available_tools.includes(parsed.tool_choice)) {
            hallucinatedTool = true;
          }
        } catch (err) {
           console.error(`JSON Parse Error on Scenario ${scenario.id}:`, err);
        }

        return {
          id: scenario.id,
          duration_ms: duration,
          valid_json: validJson,
          hallucinated_tool: hallucinatedTool,
          parsed_output: parsed,
          raw_output: rawText
        };

      } catch (err) {
        return { id: scenario.id, status: "fetch_error", error: err.message };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Tiny delay between batches to be safe
    await new Promise(resolve => {
        setTimeout(resolve, 500);
    });
  }

  // Calculate stats
  for (const r of results) {
     if (r.duration_ms) totalTime += r.duration_ms;
     if (r.valid_json) validJsonCount++;
     if (r.hallucinated_tool) hallucinatedToolCount++;
  }

  const avgLatency = Math.round(totalTime / scenarios.length);
  const jsonSuccessRate = (validJsonCount / scenarios.length) * 100;
  
  let report = `# Gemini 3.1 Flash Lite AD Probe Results\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Total Scenarios:** ${scenarios.length}\n`;
  report += `**Avg Latency:** ${avgLatency} ms\n`;
  report += `**Valid JSON Rate:** ${jsonSuccessRate}%\n`;
  report += `**Tool Hallucination Count:** ${hallucinatedToolCount}\n\n`;
  report += `## Detailed Results (First 10 shown)\n\n`;

  results.slice(0, 10).forEach(r => {
    report += `### Scenario ${r.id}\n`;
    if (r.status === "error" || r.status === "fetch_error") {
        report += `- **Error:** ${r.error}\n\n`;
        return;
    }
    report += `- **Latency:** ${r.duration_ms} ms\n`;
    report += `- **Valid JSON:** ${r.valid_json ? '✅' : '❌'}\n`;
    report += `- **Hallucinated Tool:** ${r.hallucinated_tool ? '❌ YES' : '✅ NO'}\n`;
    report += `- **Output:**\n\`\`\`json\n${JSON.stringify(r.parsed_output || r.raw_output, null, 2)}\n\`\`\`\n\n`;
  });

  const reportPath = path.join(__dirname, 'probe-results.md');
  fs.writeFileSync(reportPath, report);
  
  const rawPath = path.join(__dirname, 'probe-results.json');
  fs.writeFileSync(rawPath, JSON.stringify(results, null, 2));
  
  console.log(`\nProbe complete! Results saved to ${reportPath}`);
}

runProbe();
