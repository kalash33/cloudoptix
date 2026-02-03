import { Router, Response } from 'express';
import CloudAccount from '../models/CloudAccount';
import CostData from '../models/CostData';
import { auth, AuthRequest } from '../middleware/auth';
import * as awsCostExplorer from '../services/aws/costExplorer';
import * as gcpBigQuery from '../services/gcp/bigquery';
import * as azureCostManagement from '../services/azure/costManagement';

const router = Router();

// All routes require authentication
router.use(auth);

/**
 * GET /api/costs/summary
 * Get cost summary across all connected accounts
 */
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await CloudAccount.find({
      userId: req.userId,
      status: 'connected',
    });

    if (accounts.length === 0) {
      res.json({
        totalMonthly: 0,
        previousMonthly: 0,
        providers: [],
        message: 'No connected accounts',
      });
      return;
    }

    // Calculate date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const currentMonthStart = startOfMonth.toISOString().split('T')[0];
    const currentEnd = today.toISOString().split('T')[0];
    const lastMonthStart = startOfLastMonth.toISOString().split('T')[0];
    const lastMonthEnd = endOfLastMonth.toISOString().split('T')[0];

    const providerCosts: {
      provider: string;
      name: string;
      currentMonth: number;
      lastMonth: number;
    }[] = [];

    for (const account of accounts) {
      try {
        let currentCost = 0;
        let lastMonthCost = 0;

        switch (account.provider) {
          case 'aws': {
            const client = awsCostExplorer.createCostExplorerClient(
              account.encryptedCredentials
            );
            const currentData = await awsCostExplorer.getCostAndUsage(
              client,
              currentMonthStart,
              currentEnd,
              'MONTHLY'
            );
            const lastData = await awsCostExplorer.getCostAndUsage(
              client,
              lastMonthStart,
              lastMonthEnd,
              'MONTHLY'
            );
            currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
            lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
            break;
          }
          case 'gcp': {
            const currentData = await gcpBigQuery.getDailyCosts(
              account.encryptedCredentials,
              currentMonthStart,
              currentEnd
            );
            const lastData = await gcpBigQuery.getDailyCosts(
              account.encryptedCredentials,
              lastMonthStart,
              lastMonthEnd
            );
            currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
            lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
            break;
          }
          case 'azure': {
            const currentData = await azureCostManagement.getDailyCosts(
              account.encryptedCredentials,
              currentMonthStart,
              currentEnd
            );
            const lastData = await azureCostManagement.getDailyCosts(
              account.encryptedCredentials,
              lastMonthStart,
              lastMonthEnd
            );
            currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
            lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
            break;
          }
        }

        providerCosts.push({
          provider: account.provider,
          name: account.name,
          currentMonth: currentCost,
          lastMonth: lastMonthCost,
        });

        // Update last sync time
        account.lastSyncAt = new Date();
        await account.save();
      } catch (error) {
        console.error(`Error fetching costs for ${account.name}:`, error);
      }
    }

    const totalCurrentMonth = providerCosts.reduce(
      (sum, p) => sum + p.currentMonth,
      0
    );
    const totalLastMonth = providerCosts.reduce(
      (sum, p) => sum + p.lastMonth,
      0
    );

    res.json({
      totalMonthly: totalCurrentMonth,
      previousMonthly: totalLastMonth,
      trend: totalLastMonth > 0
        ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100
        : 0,
      providers: providerCosts,
    });
  } catch (error) {
    console.error('Cost summary error:', error);
    res.status(500).json({ error: 'Failed to fetch cost summary' });
  }
});

/**
 * GET /api/costs/daily
 * Get daily cost data for the last 30 days
 */
router.get('/daily', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await CloudAccount.find({
      userId: req.userId,
      status: 'connected',
    });

    if (accounts.length === 0) {
      res.json({ data: [], message: 'No connected accounts' });
      return;
    }

    // Last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Aggregate data by date and provider
    const dailyData: {
      [date: string]: { aws: number; gcp: number; azure: number; total: number };
    } = {};

    for (const account of accounts) {
      try {
        let costs: { date: string; cost: number }[] = [];

        switch (account.provider) {
          case 'aws': {
            const client = awsCostExplorer.createCostExplorerClient(
              account.encryptedCredentials
            );
            const data = await awsCostExplorer.getCostAndUsage(
              client,
              startDate,
              endDate,
              'DAILY'
            );
            costs = data.map((d) => ({ date: d.date, cost: d.cost }));
            break;
          }
          case 'gcp': {
            costs = await gcpBigQuery.getDailyCosts(
              account.encryptedCredentials,
              startDate,
              endDate
            );
            break;
          }
          case 'azure': {
            costs = await azureCostManagement.getDailyCosts(
              account.encryptedCredentials,
              startDate,
              endDate
            );
            break;
          }
        }

        for (const cost of costs) {
          if (!dailyData[cost.date]) {
            dailyData[cost.date] = { aws: 0, gcp: 0, azure: 0, total: 0 };
          }
          dailyData[cost.date][account.provider] += cost.cost;
          dailyData[cost.date].total += cost.cost;
        }
      } catch (error) {
        console.error(`Error fetching daily costs for ${account.name}:`, error);
      }
    }

    // Convert to array and sort by date
    const result = Object.entries(dailyData)
      .map(([date, costs]) => ({
        date,
        ...costs,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ data: result });
  } catch (error) {
    console.error('Daily costs error:', error);
    res.status(500).json({ error: 'Failed to fetch daily costs' });
  }
});

/**
 * GET /api/costs/services
 * Get cost breakdown by service
 */
router.get('/services', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await CloudAccount.find({
      userId: req.userId,
      status: 'connected',
    });

    if (accounts.length === 0) {
      res.json({ data: [], message: 'No connected accounts' });
      return;
    }

    // Current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const serviceData: {
      service: string;
      provider: string;
      cost: number;
    }[] = [];

    for (const account of accounts) {
      try {
        switch (account.provider) {
          case 'aws': {
            const client = awsCostExplorer.createCostExplorerClient(
              account.encryptedCredentials
            );
            const data = await awsCostExplorer.getCostAndUsage(
              client,
              startDate,
              endDate,
              'MONTHLY'
            );
            for (const day of data) {
              for (const service of day.services) {
                serviceData.push({
                  service: service.service,
                  provider: 'aws',
                  cost: service.cost,
                });
              }
            }
            break;
          }
          case 'gcp': {
            const data = await gcpBigQuery.getCostData(
              account.encryptedCredentials,
              startDate,
              endDate
            );
            for (const item of data) {
              serviceData.push({
                service: item.service,
                provider: 'gcp',
                cost: item.cost,
              });
            }
            break;
          }
          case 'azure': {
            const data = await azureCostManagement.getCostData(
              account.encryptedCredentials,
              startDate,
              endDate
            );
            for (const item of data) {
              serviceData.push({
                service: item.service,
                provider: 'azure',
                cost: item.cost,
              });
            }
            break;
          }
        }
      } catch (error) {
        console.error(`Error fetching service costs for ${account.name}:`, error);
      }
    }

    // Aggregate by service and provider
    const aggregated: { [key: string]: { service: string; provider: string; cost: number } } = {};

    for (const item of serviceData) {
      const key = `${item.provider}:${item.service}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...item };
      } else {
        aggregated[key].cost += item.cost;
      }
    }

    const result = Object.values(aggregated).sort((a, b) => b.cost - a.cost);

    res.json({ data: result });
  } catch (error) {
    console.error('Service costs error:', error);
    res.status(500).json({ error: 'Failed to fetch service costs' });
  }
});

/**
 * GET /api/costs/forecast
 * Get cost forecast for the next 7 days
 */
router.get('/forecast', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await CloudAccount.find({
      userId: req.userId,
      status: 'connected',
      provider: 'aws', // Only AWS has native forecast API
    });

    if (accounts.length === 0) {
      res.json({ forecast: [], message: 'No AWS accounts for forecast' });
      return;
    }

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    let totalForecast = 0;
    const forecastByDay: { date: string; cost: number }[] = [];

    for (const account of accounts) {
      try {
        const client = awsCostExplorer.createCostExplorerClient(
          account.encryptedCredentials
        );
        const forecast = await awsCostExplorer.getCostForecast(
          client,
          startDate,
          endDate
        );

        totalForecast += forecast.totalForecast;

        for (const day of forecast.forecastByDay) {
          const existing = forecastByDay.find((d) => d.date === day.date);
          if (existing) {
            existing.cost += day.cost;
          } else {
            forecastByDay.push({ ...day });
          }
        }
      } catch (error) {
        console.error(`Error fetching forecast for ${account.name}:`, error);
      }
    }

    res.json({
      totalForecast,
      forecastByDay: forecastByDay.sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

export default router;
