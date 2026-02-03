import { Router, Response } from 'express';
import Recommendation from '../models/Recommendation';
import CloudAccount from '../models/CloudAccount';
import { auth, AuthRequest } from '../middleware/auth';
import * as awsEc2 from '../services/aws/ec2';

const router = Router();

// All routes require authentication
router.use(auth);

/**
 * GET /api/recommendations
 * Get all recommendations for the current user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, status } = req.query;

    const query: any = { userId: req.userId };

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    } else {
      query.status = 'active'; // Default to active recommendations
    }

    const recommendations = await Recommendation.find(query)
      .sort({ savings: -1 })
      .limit(100);

    // Calculate summary
    const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);
    const byType = recommendations.reduce(
      (acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      recommendations,
      summary: {
        totalCount: recommendations.length,
        totalSavings,
        byType,
      },
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * POST /api/recommendations/generate
 * Generate new recommendations based on current cloud data
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await CloudAccount.find({
      userId: req.userId,
      status: 'connected',
    });

    if (accounts.length === 0) {
      res.json({
        message: 'No connected accounts',
        generated: 0,
      });
      return;
    }

    const newRecommendations: any[] = [];

    for (const account of accounts) {
      if (account.provider === 'aws') {
        try {
          // Get EC2 instances
          const instances = await awsEc2.describeInstances(
            account.encryptedCredentials
          );

          // Analyze instances for rightsizing opportunities
          for (const instance of instances) {
            // Check for stopped instances
            if (instance.state === 'stopped') {
              const monthlyCost = awsEc2.getApproximatePrice(instance.instanceType);

              newRecommendations.push({
                accountId: account._id,
                userId: req.userId,
                type: 'unused',
                title: `Terminate stopped EC2 instance ${instance.instanceId}`,
                description: `This ${instance.instanceType} instance has been stopped. Consider terminating it to stop incurring storage costs, or start using it.`,
                resourceId: instance.instanceId,
                resourceName: instance.tags.Name || instance.instanceId,
                service: 'EC2',
                provider: 'aws',
                currentCost: monthlyCost * 0.1, // Stopped instances still have EBS costs
                projectedCost: 0,
                savings: monthlyCost * 0.1,
                savingsPercent: 100,
                effort: 'low',
                risk: 'low',
                implementationSteps: [
                  'Verify the instance is no longer needed',
                  'Create an AMI backup if needed',
                  'Terminate the instance from AWS Console or CLI',
                  'Delete associated EBS volumes if not needed',
                ],
              });
            }

            // Check for potentially oversized instances
            // Note: In production, we'd check CloudWatch metrics for actual utilization
            const largeTypes = ['xlarge', '2xlarge', '4xlarge', '8xlarge'];
            if (largeTypes.some((t) => instance.instanceType.includes(t))) {
              const currentCost = awsEc2.getApproximatePrice(instance.instanceType);
              const smallerType = instance.instanceType.replace(
                /(\d)?xlarge/,
                'large'
              );
              const projectedCost = awsEc2.getApproximatePrice(smallerType);
              const savings = currentCost - projectedCost;

              if (savings > 0) {
                newRecommendations.push({
                  accountId: account._id,
                  userId: req.userId,
                  type: 'rightsizing',
                  title: `Rightsize EC2 instance ${instance.instanceId}`,
                  description: `Consider downsizing from ${instance.instanceType} to ${smallerType}. Review CloudWatch metrics to verify low utilization.`,
                  resourceId: instance.instanceId,
                  resourceName: instance.tags.Name || instance.instanceId,
                  service: 'EC2',
                  provider: 'aws',
                  currentCost,
                  projectedCost,
                  savings,
                  savingsPercent: (savings / currentCost) * 100,
                  effort: 'medium',
                  risk: 'medium',
                  implementationSteps: [
                    'Review CloudWatch CPU and memory metrics',
                    'Schedule a maintenance window',
                    'Stop the instance',
                    `Change instance type to ${smallerType}`,
                    'Start the instance and verify functionality',
                  ],
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error analyzing AWS account ${account.name}:`, error);
        }
      }
    }

    // Save recommendations (upsert based on resourceId to avoid duplicates)
    let savedCount = 0;
    for (const rec of newRecommendations) {
      try {
        await Recommendation.findOneAndUpdate(
          {
            userId: req.userId,
            resourceId: rec.resourceId,
            type: rec.type,
          },
          { ...rec, detectedAt: new Date() },
          { upsert: true, new: true }
        );
        savedCount++;
      } catch (error) {
        console.error('Error saving recommendation:', error);
      }
    }

    res.json({
      message: 'Recommendations generated',
      generated: savedCount,
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
