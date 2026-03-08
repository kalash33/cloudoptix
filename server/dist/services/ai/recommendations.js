"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIRecommendations = generateAIRecommendations;
exports.getEnhancedRecommendations = getEnhancedRecommendations;
const openai_1 = __importDefault(require("openai"));
// OpenRouter configuration - free tier
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
// GPT-OSS 120B Free - OpenAI's open-weight model
const MODEL = 'openai/gpt-4o-mini';
// Define tools for function calling
const recommendationTools = [
    {
        type: 'function',
        function: {
            name: 'generate_recommendation',
            description: 'Generate a cost optimization recommendation based on analyzing cloud resources',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['rightsizing', 'unused', 'commitment', 'scheduling', 'architecture'],
                        description: 'Type of optimization recommendation',
                    },
                    title: {
                        type: 'string',
                        description: 'Clear, actionable title for the recommendation',
                    },
                    description: {
                        type: 'string',
                        description: 'Detailed explanation of the issue and solution',
                    },
                    service: {
                        type: 'string',
                        description: 'Cloud service name (e.g., EC2, Cloud Storage, Virtual Machines)',
                    },
                    provider: {
                        type: 'string',
                        enum: ['aws', 'gcp', 'azure'],
                        description: 'Cloud provider',
                    },
                    currentCost: {
                        type: 'number',
                        description: 'Current monthly cost in USD',
                    },
                    projectedCost: {
                        type: 'number',
                        description: 'Projected monthly cost after optimization',
                    },
                    effort: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'Implementation effort required',
                    },
                    risk: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'Risk level of implementing this change',
                    },
                    implementationSteps: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Step-by-step implementation guide',
                    },
                    confidence: {
                        type: 'number',
                        description: 'Confidence score for this recommendation (0-100)',
                    },
                    reasoning: {
                        type: 'string',
                        description: 'Technical reasoning behind this recommendation',
                    },
                },
                required: ['type', 'title', 'description', 'service', 'provider', 'currentCost', 'projectedCost', 'effort', 'risk', 'implementationSteps', 'confidence', 'reasoning'],
            },
        },
    },
];
/**
 * Create OpenAI client configured for OpenRouter
 */
function createOpenRouterClient() {
    return new openai_1.default({
        apiKey: OPENROUTER_API_KEY,
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
            'HTTP-Referer': 'https://cloudoptix.app',
            'X-Title': 'CloudOptix Cost Optimizer',
        },
    });
}
/**
 * Generate AI-powered cost optimization recommendations using GPT-OSS 120B
 */
async function generateAIRecommendations(resources, costData) {
    try {
        if (!OPENROUTER_API_KEY) {
            console.log('OpenRouter API key not configured, skipping AI recommendations');
            return [];
        }
        const client = createOpenRouterClient();
        const systemPrompt = `You are an expert cloud cost optimization consultant with deep experience in AWS, GCP, and Azure.

Your task is to analyze cloud infrastructure data and generate actionable cost optimization recommendations.

For EACH optimization opportunity you identify, you MUST call the generate_recommendation function with complete details.

Focus on these optimization types:
1. Rightsizing - Over-provisioned instances, databases, or storage
2. Unused - Idle resources with low utilization (<10% CPU/memory)
3. Commitment - Reserved Instances or Savings Plans opportunities for steady workloads
4. Scheduling - Dev/test environments that can be shut down nights/weekends
5. Architecture - Design improvements like spot instances, storage tiering, CDN usage

Be specific and quantitative. Base savings estimates on the actual utilization and cost data provided.
Generate between 3-5 recommendations, prioritized by potential savings.`;
        const resourceSummary = resources.map(r => ({
            id: r.resourceId,
            name: r.resourceName,
            type: r.resourceType,
            provider: r.provider,
            monthlyCost: r.currentCost,
            utilization: r.utilizationMetrics,
        }));
        const costSummary = costData.map(c => ({
            provider: c.provider,
            totalMonthly: c.totalMonthly,
            topServices: c.serviceCosts.slice(0, 5),
            trend: calculateTrend(c.dailyCosts),
        }));
        const userPrompt = `Analyze this cloud infrastructure and generate cost optimization recommendations.

## Resources:
${JSON.stringify(resourceSummary, null, 2)}

## Cost Data:
${JSON.stringify(costSummary, null, 2)}

For each optimization opportunity, call the generate_recommendation function with complete details. Generate 3-5 recommendations.`;
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            tools: recommendationTools,
            tool_choice: 'auto',
            max_tokens: 4096,
            temperature: 0.7,
        });
        const recommendations = [];
        // Extract recommendations from tool calls
        const message = response.choices[0]?.message;
        if (message?.tool_calls && message.tool_calls.length > 0) {
            for (const toolCall of message.tool_calls) {
                // Access tool call properties safely
                const funcName = toolCall.function?.name || toolCall.name;
                const funcArgs = toolCall.function?.arguments || toolCall.arguments;
                if (funcName === 'generate_recommendation' && funcArgs) {
                    try {
                        const rec = JSON.parse(funcArgs);
                        recommendations.push({
                            type: rec.type,
                            title: rec.title,
                            description: rec.description,
                            service: rec.service,
                            provider: rec.provider,
                            currentCost: rec.currentCost,
                            projectedCost: rec.projectedCost,
                            savings: rec.currentCost - rec.projectedCost,
                            savingsPercent: rec.currentCost > 0
                                ? ((rec.currentCost - rec.projectedCost) / rec.currentCost) * 100
                                : 0,
                            effort: rec.effort,
                            risk: rec.risk,
                            implementationSteps: rec.implementationSteps || [],
                            aiConfidence: rec.confidence,
                            reasoning: rec.reasoning,
                        });
                    }
                    catch (parseError) {
                        console.error('Failed to parse tool call arguments:', parseError);
                    }
                }
            }
        }
        // Fallback: try to parse JSON from response content
        if (recommendations.length === 0 && message?.content) {
            const parsed = tryParseRecommendations(message.content);
            recommendations.push(...parsed);
        }
        console.log(`Generated ${recommendations.length} AI recommendations using GPT-OSS 120B`);
        return recommendations;
    }
    catch (error) {
        console.error('OpenRouter AI recommendation generation error:', error);
        return [];
    }
}
function calculateTrend(dailyCosts) {
    if (dailyCosts.length < 7)
        return 'insufficient_data';
    const recent = dailyCosts.slice(-7);
    const earlier = dailyCosts.slice(-14, -7);
    const recentAvg = recent.reduce((sum, d) => sum + d.cost, 0) / recent.length;
    const earlierAvg = earlier.length > 0
        ? earlier.reduce((sum, d) => sum + d.cost, 0) / earlier.length
        : recentAvg;
    const change = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    if (change > 10)
        return 'increasing';
    if (change < -10)
        return 'decreasing';
    return 'stable';
}
function tryParseRecommendations(content) {
    try {
        let cleanContent = content.trim();
        // Try to find JSON array in the content
        const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            cleanContent = jsonMatch[0];
        }
        // Remove markdown code blocks
        cleanContent = cleanContent.replace(/```json?\n?/g, '').replace(/```/g, '');
        const parsed = JSON.parse(cleanContent);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.map((rec) => ({
            type: rec.type || 'architecture',
            title: rec.title || 'Optimization Opportunity',
            description: rec.description || '',
            service: rec.service || 'General',
            provider: rec.provider || 'aws',
            currentCost: rec.currentCost || 0,
            projectedCost: rec.projectedCost || 0,
            savings: (rec.currentCost || 0) - (rec.projectedCost || 0),
            savingsPercent: rec.currentCost > 0
                ? ((rec.currentCost - rec.projectedCost) / rec.currentCost) * 100
                : 0,
            effort: rec.effort || 'medium',
            risk: rec.risk || 'low',
            implementationSteps: rec.implementationSteps || [],
            aiConfidence: rec.confidence || rec.aiConfidence || 70,
            reasoning: rec.reasoning || '',
        }));
    }
    catch {
        return [];
    }
}
/**
 * Combine static analysis with AI recommendations
 */
async function getEnhancedRecommendations(staticRecommendations, resources, costData) {
    const aiRecommendations = await generateAIRecommendations(resources, costData);
    // Merge and deduplicate
    const allRecommendations = [...staticRecommendations];
    for (const aiRec of aiRecommendations) {
        const exists = allRecommendations.some(r => r.resourceId === aiRec.resourceId && r.type === aiRec.type);
        if (!exists) {
            allRecommendations.push(aiRec);
        }
    }
    // Sort by savings
    allRecommendations.sort((a, b) => b.savings - a.savings);
    return allRecommendations;
}
//# sourceMappingURL=recommendations.js.map