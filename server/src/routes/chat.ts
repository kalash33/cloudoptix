import { Router, Response } from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { gatherServiceCostData } from './recommendations'; // Reuse existing logic

const router = Router();

// Ensure OpenRouter config is loaded
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

router.post('/', auth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { message, conversationHistory = [] } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        if (!OPENROUTER_API_KEY) {
            res.status(500).json({ error: 'OpenRouter API key not configured' });
            return;
        }

        // Gather context for the AI
        let contextString = "No active infrastructure data found.";
        try {
            const costData = await gatherServiceCostData(userId);
            if (costData.services && costData.services.length > 0) {
                contextString = `Total Monthly Spend: $${costData.totalCost.toFixed(2)}
Top Services:
${costData.services.slice(0, 10).map((s: any) => `- ${s.service} (${s.provider}): $${s.cost.toFixed(2)}/mo (CPU: ${s.cpuAvg}%, Mem: ${s.memAvg}%)`).join('\n')}
`;
            }
        } catch (e) {
            console.error('Failed to gather context for chat:', e);
        }

        const systemPrompt = `You are the CloudOptix AI Assistant, a specialized cloud cost optimization expert.
Your goal is to help the user understand their cloud environment, identify savings, and answer questions about cloud architecture.

Here is the current real-time state of the user's cloud infrastructure:
${contextString}

Answer the user's question concisely and accurately based on their actual data if relevant.
Format your responses using clean markdown (e.g., bolding, bullet points) for readability.
If the user asks a general cloud question outside of their data (e.g. 'what is a spot instance?'), answer it normally.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API failed with status ${response.status}`);
        }

        const data = await response.json() as any;
        const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response at this time.";

        res.json({ reply: aiResponse });

    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

export default router;
