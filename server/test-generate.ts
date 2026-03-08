import dotenv from 'dotenv';
import connectDB from './src/config/database';
import User from './src/models/User';
import * as Recs from './src/routes/recommendations';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

dotenv.config();
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

async function run() {
  await connectDB();
  const users = await User.scan().exec();
  const user = users.find(u => u.email === 'test@example.com') || users[0];
  
  const costData = await Recs.gatherServiceCostData(user.id);
  const service = costData.services[0];
  
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
}`;

  console.log("Sending prompt via Bedrock...");
  const command = new InvokeModelCommand({
      modelId: 'openai.gpt-oss-120b-1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
      }),
  });
  
  try {
      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log("Bedrock Raw Response:", JSON.stringify(responseBody, null, 2));
      
      const content = responseBody.choices?.[0]?.message?.content || responseBody.content?.[0]?.text || '{}';
      console.log("Content Extract:", content);
      
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const parsed = JSON.parse(jsonMatch[1] || content);
      console.log("Parsed JSON:", parsed);
      
  } catch(e) {
      console.error("Error:", e);
  }
  process.exit(0);
}
run();
