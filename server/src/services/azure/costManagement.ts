import { CostManagementClient } from '@azure/arm-costmanagement';
import { ClientSecretCredential } from '@azure/identity';
import { decryptCredentials } from '../../config/encryption';

interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

interface AzureCostData {
  date: string;
  service: string;
  cost: number;
  currency: string;
  resourceGroup?: string;
}

/**
 * Creates an Azure Cost Management client with the provided encrypted credentials
 */
export function createCostManagementClient(encryptedCredentials: string): {
  client: CostManagementClient;
  subscriptionId: string;
} {
  const credentials = decryptCredentials(encryptedCredentials) as AzureCredentials;

  const credential = new ClientSecretCredential(
    credentials.tenantId,
    credentials.clientId,
    credentials.clientSecret
  );

  const client = new CostManagementClient(credential);

  return {
    client,
    subscriptionId: credentials.subscriptionId,
  };
}

/**
 * Get cost data using Azure Cost Management Query API
 */
export async function getCostData(
  encryptedCredentials: string,
  startDate: string,
  endDate: string
): Promise<AzureCostData[]> {
  const { client, subscriptionId } = createCostManagementClient(encryptedCredentials);

  const scope = `/subscriptions/${subscriptionId}`;

  try {
    const result = await client.query.usage(scope, {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: new Date(startDate),
        to: new Date(endDate),
      },
      dataset: {
        granularity: 'Daily',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
        grouping: [
          {
            type: 'Dimension',
            name: 'ServiceName',
          },
        ],
      },
    });

    const costData: AzureCostData[] = [];

    if (result.rows) {
      for (const row of result.rows) {
        // Row format: [cost, serviceName, date, currency]
        costData.push({
          cost: parseFloat(row[0] as string),
          service: row[1] as string,
          date: formatAzureDate(row[2] as number),
          currency: (row[3] as string) || 'USD',
        });
      }
    }

    return costData;
  } catch (error) {
    console.error('Azure Cost Management error:', error);
    throw error;
  }
}

/**
 * Get daily cost totals
 */
export async function getDailyCosts(
  encryptedCredentials: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; cost: number; currency: string }[]> {
  const { client, subscriptionId } = createCostManagementClient(encryptedCredentials);

  const scope = `/subscriptions/${subscriptionId}`;

  try {
    const result = await client.query.usage(scope, {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: new Date(startDate),
        to: new Date(endDate),
      },
      dataset: {
        granularity: 'Daily',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
      },
    });

    const dailyCosts: { date: string; cost: number; currency: string }[] = [];

    if (result.rows) {
      for (const row of result.rows) {
        dailyCosts.push({
          cost: parseFloat(row[0] as string),
          date: formatAzureDate(row[1] as number),
          currency: (row[2] as string) || 'USD',
        });
      }
    }

    return dailyCosts;
  } catch (error) {
    console.error('Azure daily costs error:', error);
    throw error;
  }
}

/**
 * Format Azure date (YYYYMMDD number to YYYY-MM-DD string)
 */
function formatAzureDate(dateNum: number): string {
  const dateStr = dateNum.toString();
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * Test Azure credentials by making a simple API call
 */
export async function testConnection(encryptedCredentials: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { client, subscriptionId } = createCostManagementClient(encryptedCredentials);

    const scope = `/subscriptions/${subscriptionId}`;

    // Simple query to test connection - get yesterday's cost
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await client.query.usage(scope, {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: yesterday,
        to: today,
      },
      dataset: {
        granularity: 'None',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
      },
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to Azure',
    };
  }
}
