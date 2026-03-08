"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const recommendations_1 = require("./recommendations"); // Reuse existing logic
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const router = (0, express_1.Router)();
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const MODEL_ID = 'openai.gpt-oss-120b-1:0';
router.post('/', auth_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { message, conversationHistory = [] } = req.body;
        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }
        // Gather context for the AI
        let contextString = "No active infrastructure data found.";
        try {
            const costData = await (0, recommendations_1.gatherServiceCostData)(userId);
            if (costData.services && costData.services.length > 0) {
                contextString = `Total Monthly Spend: $${costData.totalCost.toFixed(2)}
Top Services:
${costData.services.slice(0, 10).map((s) => `- ${s.service} (${s.provider}): $${s.cost.toFixed(2)}/mo (CPU: ${s.cpuAvg}%, Mem: ${s.memAvg}%)`).join('\n')}
`;
            }
        }
        catch (e) {
            console.error('Failed to gather context for chat:', e);
        }
        const systemPrompt = `You are the CloudOptix AI Assistant, a specialized cloud cost optimization expert.
Your goal is to help the user understand their cloud environment, identify savings, and answer questions about cloud architecture.

Here is the current real-time state of the user's cloud infrastructure:
${contextString}

Answer the user's question concisely and accurately based on their actual data if relevant.
Format your responses using clean markdown (e.g., bolding, bullet points) for readability.
If the user asks a general cloud question outside of their data (e.g. 'what is a spot instance?'), answer it normally.`;
        const payload = {
            max_tokens: 1024,
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory,
                { role: 'user', content: message }
            ],
            temperature: 0.7,
        };
        const command = new client_bedrock_runtime_1.InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(payload),
        });
        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        let aiResponse = responseBody.choices?.[0]?.message?.content || responseBody.content?.[0]?.text || "I'm sorry, I couldn't generate a response at this time.";
        aiResponse = aiResponse.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '').trim();
        res.json({ reply: aiResponse });
    }
    catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map