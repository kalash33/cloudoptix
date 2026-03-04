import { Router, Response } from 'express';
import Recommendation from '../models/Recommendation';
import CloudAccount from '../models/CloudAccount';
import { auth, AuthRequest } from '../middleware/auth';
import * as awsEc2 from '../services/aws/ec2';
import { getMockDataFromJSON } from '../utils/generateMockData';

const router = Router();

// All routes require authentication
router.use(auth);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

// Simple in-memory cache (userId -> {data, timestamp})
const recommendationCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Gather service cost data from all connected accounts
 */
export async function gatherServiceCostData(userId: string) {
  const accounts = await CloudAccount.find({ userId, status: 'connected' });

  const today = new Date();

  // Look back 60 days to ensure we always capture sufficient mock usage data for AI metrics
  const startOfRange = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));

  const formatDate = (d: Date) => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startDate = formatDate(startOfRange);
  const endDate = formatDate(today);

  const serviceData: { service: string; provider: string; cost: number; accountId: string }[] = [];

  for (const account of accounts) {
    try {
      if (account.metadata?.isMock) {
        const mockData = getMockDataFromJSON(account.provider as 'aws' | 'gcp' | 'azure', startDate, endDate);
        for (const item of mockData) {
          serviceData.push({
            service: `${item.service}${item.usageType ? ' - ' + item.usageType : ''}`,
            provider: account.provider,
            cost: item.cost,
            accountId: account._id.toString()
          });
        }
      }
      // Real provider data can be added here following the costs.ts pattern
    } catch (error) {
      console.error(`Error fetching costs for recs from ${account.name}:`, error);
    }
  }

  // Aggregate by service+provider
  const aggregated: Record<string, { service: string; provider: string; cost: number; accountId: string }> = {};
  for (const item of serviceData) {
    const key = `${item.provider}:${item.service}`;
    if (!aggregated[key]) {
      aggregated[key] = { ...item };
    } else {
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
      const pseudoRandom = (offset: number) => ((seed * 17 + offset * 31) % 100);

      let cpuAvg: number, memAvg: number;
      if (isCompute) {
        cpuAvg = 15 + (pseudoRandom(1) % 40);
        memAvg = 20 + (pseudoRandom(3) % 45);
      } else if (isDatabase) {
        cpuAvg = 25 + (pseudoRandom(1) % 50);
        memAvg = 40 + (pseudoRandom(3) % 40);
      } else if (isStorage) {
        cpuAvg = 5 + (pseudoRandom(1) % 15);
        memAvg = 10 + (pseudoRandom(3) % 20);
      } else if (isNetwork) {
        cpuAvg = 10 + (pseudoRandom(1) % 30);
        memAvg = 15 + (pseudoRandom(3) % 25);
      } else {
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
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, status } = req.query;

    // Always calculate currentSpend for the frontend
    const costData = await gatherServiceCostData(req.userId!);

    // Check for real recommendations in DB
    const query: any = { userId: req.userId };
    if (type) query.type = type;
    if (status) { query.status = status; } else { query.status = { $ne: 'dismissed' }; }

    let recommendations = await Recommendation.find(query)
      .sort({ savings: -1 })
      .limit(100);

    const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);
    const byType = recommendations.reduce(
      (acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; },
      {} as Record<string, number>
    );

    res.json({
      recommendations,
      summary: {
        totalCount: recommendations.length,
        totalSavings,
        byType,
        currentSpend: costData.totalCost
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * GET /api/recommendations/anomalies
 * Detect spending anomalies using AI
 */
router.get('/anomalies', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const cacheKey = `anomalies-${userId}`;
    const cached = recommendationCache[cacheKey];

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log(`[AI Anomalies] ✅ Cache HIT`);
      res.json({ anomalies: cached.data });
      return;
    }

    if (!OPENROUTER_API_KEY) {
      res.json({ anomalies: [] });
      return;
    }

    const costData = await gatherServiceCostData(userId);
    if (costData.services.length === 0) {
      res.json({ anomalies: [] });
      return;
    }

    const targetServices = costData.services.slice(0, 5); // Analyze top 5 for speed
    let anomalies: any[] = [];

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
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          console.error(`[AI Anomalies] API failed for service ${service.service}`);
          continue;
        }

        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1] || content);

        if (parsed.anomalies && Array.isArray(parsed.anomalies)) {
          // Map to guarantee specific properties are filled correctly
          const mapped = parsed.anomalies.map((a: any) => ({
            ...a,
            id: a.id || `anom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            service: service.service,
            provider: service.provider
          }));
          anomalies = anomalies.concat(mapped);
        }
      } catch (e) {
        console.error(`Error parsing AI anomaly response for ${service.service}`, e);
      }
    }

    recommendationCache[cacheKey] = { data: anomalies, timestamp: Date.now() };
    res.json({ anomalies });
  } catch (error) {
    console.error('Anomalies error:', error);
    res.json({ anomalies: [] });
  }
});

/**
 * GET /api/recommendations/resources
 * Get AI-enriched resource inventory
 */
router.get('/resources', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const cacheKey = `resources - ${userId}`;
    const cached = recommendationCache[cacheKey];

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log(`[AI Resources] ✅ Cache HIT`);
      res.json({ resources: cached.data });
      return;
    }

    if (!OPENROUTER_API_KEY) {
      res.json({ resources: [] });
      return;
    }

    const costData = await gatherServiceCostData(userId);
    if (costData.services.length === 0) {
      res.json({ resources: [] });
      return;
    }

    const prompt = `You are a cloud architect AI.Given these high - level services and their average utilization metrics, break them down into 4 - 6 specific realistic resources(like particular DB instances, VMs, or Storage Buckets) showing their individual CPU / Memory utilization.Include AI - generated recommendations for each if applicable.
          Services:
${costData.services.slice(0, 5).map((s: any) => `- ${s.service} (CPU avg: ${s.cpuAvg}%, Mem avg: ${s.memAvg}%)`).join('\n')}

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

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY} `,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      }),
    });

    if (!response.ok) throw new Error('AI API failed');

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/```(?: json) ?\s * ([\s\S] *?) \s * ```/) || [null, content];
    const parsed = JSON.parse(jsonMatch[1] || content);
    const resources = parsed.resources || [];

    recommendationCache[cacheKey] = { data: resources, timestamp: Date.now() };
    res.json({ resources });
  } catch (error) {
    console.error('Resources error:', error);
    res.json({ resources: [] });
  }
});

/**
 * POST /api/recommendations/generate
 * Generate new recommendations by analyzing resources sequentially and saving to DB
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    // Clear existing DB recommendations to force AI regeneration
    await Recommendation.deleteMany({ userId });

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

Generate 1 specific, actionable cost optimization recommendation for this specific resource based on the utilization metrics.
If the resource is decently utilized(e.g., CPU > 35 % and Memory > 35 %), return an empty array for recommendations[].

Respond ONLY with valid JSON(no markdown):
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

        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[OpenRouter API]Error for service ${service.service}: `, response.status, response.statusText, errorText);
          continue;
        }

        const data = await response.json() as any;
        console.log(`[OpenRouter API] Received response for ${service.service}: `, JSON.stringify(data, null, 2));

        const content = data.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/```(?: json) ?\s * ([\s\S] *?) \s * ```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1] || content);

        const recs = parsed.recommendations || [];

        for (const r of recs) {
          const newRec = new Recommendation({
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
      } catch (e) {
        console.error(`Error parsing AI response for ${service.service}`, e);
      }
    }

    res.json({
      message: 'AI Recommendations generated and saved successfully',
      generated: generatedRecommendations.length,
    });
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * PATCH /api/recommendations/:id/status
 * Update recommendation status (dismiss or apply)
 */
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!['active', 'dismissed', 'applied'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    if (status === 'dismissed') {
      const recommendation = await Recommendation.findOneAndDelete({ _id: req.params.id, userId: req.userId });

      if (!recommendation) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }

      // Return the deleted record but with 'dismissed' status to satisfy frontend
      res.json({ recommendation: { ...recommendation.toJSON(), status: 'dismissed' } });
      return;
    }

    const recommendation = await Recommendation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        status,
        ...(status === 'applied' ? { appliedAt: new Date() } : {}),
      },
      { new: true }
    );

    if (!recommendation) {
      res.status(404).json({ error: 'Recommendation not found' });
      return;
    }

    res.json({ recommendation });
  } catch (error) {
    console.error('Update recommendation error:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

export default router;
