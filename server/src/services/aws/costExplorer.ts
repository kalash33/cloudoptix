import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  GetReservationUtilizationCommand,
  GetSavingsPlansUtilizationCommand,
  Granularity,
  Metric,
} from '@aws-sdk/client-cost-explorer';
import { decryptCredentials } from '../../config/encryption';

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface CostByService {
  service: string;
  cost: number;
  currency: string;
}

interface DailyCost {
  date: string;
  cost: number;
  services: CostByService[];
}

/**
 * Creates an AWS Cost Explorer client with the provided encrypted credentials
 */
export function createCostExplorerClient(
  encryptedCredentials: string
): CostExplorerClient {
  const credentials = decryptCredentials(encryptedCredentials) as AWSCredentials;

  return new CostExplorerClient({
    region: credentials.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

/**
 * Get cost and usage data for a date range
 */
export async function getCostAndUsage(
  client: CostExplorerClient,
  startDate: string,
  endDate: string,
  granularity: Granularity = 'DAILY'
): Promise<DailyCost[]> {
  const command = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Granularity: granularity,
    Metrics: ['UnblendedCost', 'UsageQuantity'],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
    ],
  });

  const response = await client.send(command);

  const result: DailyCost[] = [];

  if (response.ResultsByTime) {
    for (const period of response.ResultsByTime) {
      const date = period.TimePeriod?.Start || '';
      const services: CostByService[] = [];
      let totalCost = 0;

      if (period.Groups) {
        for (const group of period.Groups) {
          const service = group.Keys?.[0] || 'Unknown';
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
          const currency = group.Metrics?.UnblendedCost?.Unit || 'USD';

          if (cost > 0) {
            services.push({ service, cost, currency });
            totalCost += cost;
          }
        }
      }

      result.push({
        date,
        cost: totalCost,
        services: services.sort((a, b) => b.cost - a.cost),
      });
    }
  }

  return result;
}

/**
 * Get cost forecast for upcoming period
 */
export async function getCostForecast(
  client: CostExplorerClient,
  startDate: string,
  endDate: string
): Promise<{ totalForecast: number; forecastByDay: { date: string; cost: number }[] }> {
  const command = new GetCostForecastCommand({
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Metric: 'UNBLENDED_COST',
    Granularity: 'DAILY',
  });

  try {
    const response = await client.send(command);

    const forecastByDay: { date: string; cost: number }[] = [];

    if (response.ForecastResultsByTime) {
      for (const period of response.ForecastResultsByTime) {
        forecastByDay.push({
          date: period.TimePeriod?.Start || '',
          cost: parseFloat(period.MeanValue || '0'),
        });
      }
    }

    return {
      totalForecast: parseFloat(response.Total?.Amount || '0'),
      forecastByDay,
    };
  } catch (error) {
    // Forecast may fail if not enough historical data
    console.error('Cost forecast error:', error);
    return { totalForecast: 0, forecastByDay: [] };
  }
}

/**
 * Get Reserved Instance utilization
 */
export async function getReservationUtilization(
  client: CostExplorerClient,
  startDate: string,
  endDate: string
): Promise<{
  utilizationPercentage: number;
  totalAmortizedFee: number;
  unusedCommitment: number;
}> {
  const command = new GetReservationUtilizationCommand({
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
  });

  try {
    const response = await client.send(command);

    return {
      utilizationPercentage: parseFloat(
        response.Total?.UtilizationPercentage || '0'
      ),
      totalAmortizedFee: parseFloat(
        response.Total?.TotalAmortizedFee || '0'
      ),
      unusedCommitment: parseFloat(
        response.Total?.UnusedHours || '0'
      ),
    };
  } catch (error) {
    console.error('Reservation utilization error:', error);
    return { utilizationPercentage: 0, totalAmortizedFee: 0, unusedCommitment: 0 };
  }
}

/**
 * Get Savings Plans utilization
 */
export async function getSavingsPlansUtilization(
  client: CostExplorerClient,
  startDate: string,
  endDate: string
): Promise<{
  utilizationPercentage: number;
  totalCommitment: number;
  usedCommitment: number;
}> {
  const command = new GetSavingsPlansUtilizationCommand({
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
  });

  try {
    const response = await client.send(command);

    return {
      utilizationPercentage: parseFloat(
        response.Total?.Utilization?.UtilizationPercentage || '0'
      ),
      totalCommitment: parseFloat(
        response.Total?.Utilization?.TotalCommitment || '0'
      ),
      usedCommitment: parseFloat(
        response.Total?.Utilization?.UsedCommitment || '0'
      ),
    };
  } catch (error) {
    console.error('Savings Plans utilization error:', error);
    return { utilizationPercentage: 0, totalCommitment: 0, usedCommitment: 0 };
  }
}

/**
 * Test AWS credentials by making a simple API call
 */
export async function testConnection(encryptedCredentials: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = createCostExplorerClient(encryptedCredentials);

    // Get yesterday's date for a minimal test query
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    await getCostAndUsage(client, startDate, endDate, 'DAILY');

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to AWS',
    };
  }
}
