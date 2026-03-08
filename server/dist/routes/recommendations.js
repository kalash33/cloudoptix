"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatherServiceCostData = gatherServiceCostData;
const express_1 = require("express");
const Recommendation_1 = __importDefault(require("../models/Recommendation"));
const CloudAccount_1 = __importDefault(require("../models/CloudAccount"));
const auth_1 = require("../middleware/auth");
const generateMockData_1 = require("../utils/generateMockData");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.auth);
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const MODEL_ID = 'openai.gpt-oss-120b-1:0';
// Simple in-memory cache (userId -> {data, timestamp})
const recommendationCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
/**
 * Gather service cost data from all connected accounts
 */
async function gatherServiceCostData(userId) {
    const accountsRaw = await CloudAccount_1.default.query('userId').eq(userId).exec();
    const accounts = accountsRaw.filter(a => a.status === 'connected');
    const today = new Date();
    // Look back 60 days to ensure we always capture sufficient mock usage data for AI metrics
    const startOfRange = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));
    const formatDate = (d) => {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const startDate = formatDate(startOfRange);
    const endDate = formatDate(today);
    const serviceData = [];
    for (const account of accounts) {
        try {
            if (account.metadata?.isMock) {
                const mockData = (0, generateMockData_1.getMockDataFromJSON)(account.provider, startDate, endDate);
                for (const item of mockData) {
                    serviceData.push({
                        service: `${item.service}${item.usageType ? ' - ' + item.usageType : ''}`,
                        provider: account.provider,
                        cost: item.cost,
                        accountId: account.id
                    });
                }
            }
            // Real provider data can be added here following the costs.ts pattern
        }
        catch (error) {
            console.error(`Error fetching costs for recs from ${account.name}:`, error);
        }
    }
    // Aggregate by service+provider
    const aggregated = {};
    for (const item of serviceData) {
        const key = `${item.provider}:${item.service}`;
        if (!aggregated[key]) {
            aggregated[key] = { ...item };
        }
        else {
            aggregated[key].cost += item.cost;
        }
    }
    // Compute utilization metrics per service (same deterministic logic as costs.ts utilization endpoint)
    const servicesWithMetrics = Object.values(aggregated)
        .sort((a, b) => b.cost - a.cost)
        .map(s => {
        const svcLower = s.service.toLowerCase();
        const isCompute = svcLower.includes('compute') || svcLower.includes('ec2') || svcLower.includes('eks') || svcLower.includes('lambda') || svcLower.includes('vm');
        const isDatabase = svcLower.includes('rds') || svcLower.includes('database') || svcLower.includes('aurora') || svcLower.includes('dynamo') || svcLower.includes('sql');
        const isStorage = svcLower.includes('s3') || svcLower.includes('storage') || svcLower.includes('ebs') || svcLower.includes('blob');
        const isNetwork = svcLower.includes('cloudfront') || svcLower.includes('elb') || svcLower.includes('load balancer') || svcLower.includes('cdn') || svcLower.includes('nat');
        const seed = s.service.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const pseudoRandom = (offset) => ((seed * 17 + offset * 31) % 100);
        let cpuAvg, memAvg;
        if (isCompute) {
            cpuAvg = 15 + (pseudoRandom(1) % 40);
            memAvg = 20 + (pseudoRandom(3) % 45);
        }
        else if (isDatabase) {
            cpuAvg = 25 + (pseudoRandom(1) % 50);
            memAvg = 40 + (pseudoRandom(3) % 40);
        }
        else if (isStorage) {
            cpuAvg = 5 + (pseudoRandom(1) % 15);
            memAvg = 10 + (pseudoRandom(3) % 20);
        }
        else if (isNetwork) {
            cpuAvg = 10 + (pseudoRandom(1) % 30);
            memAvg = 15 + (pseudoRandom(3) % 25);
        }
        else {
            cpuAvg = 20 + (pseudoRandom(1) % 35);
            memAvg = 25 + (pseudoRandom(3) % 35);
        }
        const resourceType = isCompute ? 'compute' : isDatabase ? 'database' : isStorage ? 'storage' : isNetwork ? 'network' : 'other';
        return { ...s, cpuAvg, memAvg, resourceType };
    });
    return {
        accounts: accounts.map(a => ({
            name: a.name,
            provider: a.provider,
        })),
        services: servicesWithMetrics,
        totalCost: servicesWithMetrics.reduce((sum, s) => sum + s.cost, 0),
    };
}
/**
 * GET /api/recommendations
 * Get AI-generated recommendations based on actual service cost + utilization data
 */
router.get('/', async (req, res) => {
    try {
        const { type, status } = req.query;
        // Always calculate currentSpend for the frontend
        const costData = await gatherServiceCostData(req.userId);
        const allRecs = await Recommendation_1.default.query('userId').eq(req.userId).exec();
        let filtered = allRecs.filter(r => {
            let match = true;
            if (type)
                match = match && r.type === type;
            if (status)
                match = match && r.status === status;
            else
                match = match && r.status !== 'dismissed';
            return match;
        });
        let recommendations = filtered.sort((a, b) => b.savings - a.savings).slice(0, 100);
        const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);
        const byType = recommendations.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {});
        res.json({
            recommendations,
            summary: {
                totalCount: recommendations.length,
                totalSavings,
                byType,
                currentSpend: costData.totalCost
            }
        });
    }
    catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});
/**
 * GET /api/recommendations/anomalies
 * Detect spending anomalies using AI
 */
router.get('/anomalies', async (req, res) => {
    try {
        const userId = req.userId;
        const cacheKey = `anomalies-${userId}`;
        const cached = recommendationCache[cacheKey];
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
            console.log(`[AI Anomalies] ✅ Cache HIT`);
            res.json({ anomalies: cached.data });
            return;
        }
        // Removed API key check
        const costData = await gatherServiceCostData(userId);
        if (costData.services.length === 0) {
            res.json({ anomalies: [] });
            return;
        }
        const targetServices = costData.services.slice(0, 5); // Analyze top 5 for speed
        let anomalies = [];
        for (const service of targetServices) {
            console.log(`[AI Anomalies] Analyzing resource: ${service.service}`);
            const prompt = `You are a cloud cost detection AI. Analyze this individual service and identify if there is a realistic spending anomaly (spike, unusual pattern). Make up realistic percent increases and dates based on its monthly cost if one exists.
If there is NO anomaly (e.g. it is perfectly stable), return an empty array [].

Service to analyze:
- Name: ${service.service}
- Provider: ${service.provider.toUpperCase()}
- Monthly Cost: $${service.cost.toFixed(2)}
- Type: ${service.resourceType}
- CPU Util: ${service.cpuAvg}%
- Mem Util: ${service.memAvg}%

Respond ONLY with valid JSON (no markdown):
{
  "anomalies": [
    {
      "id": "anom-xyz",
      "type": "spike|gradual|unusual",
      "service": "${service.service}",
      "provider": "${service.provider}",
      "amount": 123.45,
      "percentIncrease": 45,
      "detectedAt": "2024-03-01T12:00:00Z",
      "status": "active"
    }
  ]
}`;
            try {
                const payload = {
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5,
                };
                const command = new client_bedrock_runtime_1.InvokeModelCommand({
                    modelId: MODEL_ID,
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify(payload),
                });
                const response = await bedrockClient.send(command);
                const responseBody = JSON.parse(new TextDecoder().decode(response.body));
                const content = responseBody.choices?.[0]?.message?.content || responseBody.content?.[0]?.text || '{}';
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
                const parsed = JSON.parse(jsonMatch[1] || content);
                if (parsed.anomalies && Array.isArray(parsed.anomalies)) {
                    // Map to guarantee specific properties are filled correctly
                    const mapped = parsed.anomalies.map((a) => ({
                        ...a,
                        id: a.id || `anom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        service: service.service,
                        provider: service.provider
                    }));
                    anomalies = anomalies.concat(mapped);
                }
            }
            catch (e) {
                console.error(`Error parsing AI anomaly response for ${service.service}`, e);
            }
        }
        recommendationCache[cacheKey] = { data: anomalies, timestamp: Date.now() };
        res.json({ anomalies });
    }
    catch (error) {
        console.error('Anomalies error:', error);
        res.json({ anomalies: [] });
    }
});
/**
 * GET /api/recommendations/resources
 * Get AI-enriched resource inventory
 */
router.get('/resources', async (req, res) => {
    try {
        const userId = req.userId;
        const cacheKey = `resources - ${userId}`;
        const cached = recommendationCache[cacheKey];
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
            console.log(`[AI Resources] ✅ Cache HIT`);
            res.json({ resources: cached.data });
            return;
        }
        // Removed API key check
        const costData = await gatherServiceCostData(userId);
        if (costData.services.length === 0) {
            res.json({ resources: [] });
            return;
        }
        const prompt = `You are a cloud architect AI.Given these high - level services and their average utilization metrics, break them down into 4 - 6 specific realistic resources(like particular DB instances, VMs, or Storage Buckets) showing their individual CPU / Memory utilization.Include AI - generated recommendations for each if applicable.
          Services:
${costData.services.slice(0, 5).map((s) => `- ${s.service} (CPU avg: ${s.cpuAvg}%, Mem avg: ${s.memAvg}%)`).join('\n')}

Respond ONLY with valid JSON(no markdown):
        {
          "resources": [
            {
              "id": "res-1",
              "name": "Specific Resource Name (e.g. prod-db-1)",
              "type": "Instance/Resource Type",
              "provider": "aws|gcp|azure",
              "region": "us-east-1",
              "cpuUtilization": 45,
              "memoryUtilization": 60,
              "cost": 150.00,
              "status": "running|stopped|idle",
              "recommendation": "Brief actionable advice or null"
            }
          ]
        } `;
        const payload = {
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6,
        };
        const command = new client_bedrock_runtime_1.InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(payload),
        });
        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const content = responseBody.choices?.[0]?.message?.content || responseBody.content?.[0]?.text || '{}';
        const jsonMatch = content.match(/```(?: json) ?\s * ([\s\S] *?) \s * ```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1] || content);
        const resources = parsed.resources || [];
        recommendationCache[cacheKey] = { data: resources, timestamp: Date.now() };
        res.json({ resources });
    }
    catch (error) {
        console.error('Resources error:', error);
        res.json({ resources: [] });
    }
});
/**
 * POST /api/recommendations/generate
 * Generate new recommendations by analyzing resources sequentially and saving to DB
 */
router.post('/generate', async (req, res) => {
    try {
        const userId = req.userId;
        // Removed API key check
        // Clear existing DB recommendations to force AI regeneration
        const existingRecs = await Recommendation_1.default.query('userId').eq(userId).exec();
        await Promise.all(existingRecs.map(rec => rec.delete()));
        // Clear in-memory caches and insights
        delete recommendationCache[userId];
        delete recommendationCache[`anomalies - ${userId} `];
        delete recommendationCache[`resources - ${userId} `];
        // Gather all service data for this user
        const costData = await gatherServiceCostData(userId);
        // Iterate through top services to generate resource-specific recommendations
        const targetServices = costData.services.slice(0, 8); // analyzing top 8 resources
        const generatedRecommendations = [];
        for (const service of targetServices) {
            console.log(`[AI Target] Analyzing resource: ${service.service} `);
            const prompt = `You are a cloud cost optimization expert analyzing a real cloud environment.
  
Service to analyze:
        - Name: ${service.service}
        - Provider: ${service.provider.toUpperCase()}
        - Monthly Cost: $${service.cost.toFixed(2)}
        - Resource Type: ${service.resourceType}
        - CPU Utilization: ${service.cpuAvg}% avg over 30 days
          - Memory Utilization: ${service.memAvg}% avg over 30 days

Generate 1 specific, actionable cost optimization recommendation for this specific resource based on its utilization metrics and high monthly cost.
Even if the resource is somewhat utilized, find a creative way to optimize it (e.g., Rightsizing, Reserved Instances, Archival). Only return an empty array for recommendations[] if utilizing is remarkably perfect (CPU > 85% and Memory > 85%).

Respond ONLY with valid JSON (no markdown):
        {
          "recommendations": [
            {
              "type": "rightsizing|unused|commitment|service-switch|migration",
              "title": "Short title",
              "description": "Detailed explanation citing the specific CPU percentage and Memory percentage from above.",
              "category": "Same as type",
              "projectedCost": 67.89,
              "savings": 55.56,
              "savingsPercent": 45,
              "effort": "low|medium|high",
              "risk": "low|medium|high",
              "implementationSteps": ["step 1", "step 2"]
            }
          ]
        } `;
            try {
                console.log(`[OpenRouter API] Sending request for ${service.service}...`);
                console.log(`[OpenRouter API]Prompt: `, prompt);
                const payload = {
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.6,
                };
                const command = new client_bedrock_runtime_1.InvokeModelCommand({
                    modelId: MODEL_ID,
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify(payload),
                });
                const response = await bedrockClient.send(command);
                const responseBody = JSON.parse(new TextDecoder().decode(response.body));
                console.log(`[Bedrock API] Received response for ${service.service}: `, JSON.stringify(responseBody, null, 2));
                const content = responseBody.choices?.[0]?.message?.content || responseBody.content?.[0]?.text || '{}';
                const jsonMatch = content.match(/```(?: json) ?\s * ([\s\S] *?) \s * ```/) || [null, content];
                const parsed = JSON.parse(jsonMatch[1] || content);
                const recs = parsed.recommendations || [];
                for (const r of recs) {
                    const newRec = new Recommendation_1.default({
                        userId,
                        accountId: service.accountId,
                        resourceId: r.resourceId || `res - ${Date.now()} -${Math.floor(Math.random() * 1000)} `,
                        resourceName: service.service,
                        provider: service.provider,
                        service: service.service,
                        type: r.type || 'rightsizing',
                        category: r.category || r.type || 'rightsizing',
                        title: r.title || `Optimize ${service.service} `,
                        description: r.description || `Improve utilization for ${service.service}`,
                        currentCost: service.cost,
                        projectedCost: r.projectedCost || (service.cost * 0.7),
                        savings: r.savings || (service.cost - (r.projectedCost || (service.cost * 0.7))),
                        savingsPercent: r.savingsPercent || Math.round(((r.savings || (service.cost * 0.3)) / service.cost) * 100),
                        effort: r.effort || 'medium',
                        risk: r.risk || 'low',
                        status: 'active',
                        actionable: true,
                        implementationSteps: r.implementationSteps || [],
                    });
                    await newRec.save();
                    generatedRecommendations.push(newRec);
                }
            }
            catch (e) {
                console.error(`Error parsing AI response for ${service.service}`, e);
            }
        }
        res.json({
            message: 'AI Recommendations generated and saved successfully',
            generated: generatedRecommendations.length,
        });
    }
    catch (error) {
        console.error('Generate recommendations error:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});
/**
 * PATCH /api/recommendations/:id/status
 * Update recommendation status (dismiss or apply)
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'dismissed', 'applied'].includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        if (status === 'dismissed') {
            const recommendation = await Recommendation_1.default.get(req.params.id);
            if (!recommendation || recommendation.userId !== req.userId) {
                res.status(404).json({ error: 'Recommendation not found' });
                return;
            }
            await recommendation.delete();
            // Return the deleted record but with 'dismissed' status to satisfy frontend
            res.json({ recommendation: { ...recommendation, status: 'dismissed' } });
            return;
        }
        const recommendation = await Recommendation_1.default.get(req.params.id);
        if (!recommendation || recommendation.userId !== req.userId) {
            res.status(404).json({ error: 'Recommendation not found' });
            return;
        }
        recommendation.status = status;
        if (status === 'applied')
            recommendation.appliedAt = new Date();
        await recommendation.save();
        res.json({ recommendation });
    }
    catch (error) {
        console.error('Update recommendation error:', error);
        res.status(500).json({ error: 'Failed to update recommendation' });
    }
});
exports.default = router;
//# sourceMappingURL=recommendations.js.map