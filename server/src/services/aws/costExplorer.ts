/**
 * AWS Cost Explorer Service - DISABLED
 * 
 * Cost Explorer API has been disabled to prevent charges ($0.01/request).
 * This file returns stub data. Real cost data will come from CUR (S3).
 * 
 * Migration Status: Pending CUR setup
 */

import { CostExplorerClient, Granularity } from '@aws-sdk/client-cost-explorer';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { ICloudAccount } from '../../models/CloudAccount';
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

// Flag to enable/disable Cost Explorer API calls
// Set to false to prevent charges
const COST_EXPLORER_ENABLED = false;

/**
 * Creates an AWS Cost Explorer client.
 * NOTE: Client creation is free, only API calls cost money.
 */
export async function createCostExplorerClient(
  account: ICloudAccount
): Promise<CostExplorerClient> {
  const region = account.metadata?.region || 'us-east-1';

  if (account.authType === 'role' && account.roleArn) {
    const sts = new STSClient({ region });
    
    const command = new AssumeRoleCommand({
      RoleArn: account.roleArn,
      RoleSessionName: 'FinOpsSpendySession',
      ExternalId: account.externalId,
    });

    const response = await sts.send(command);

    if (!response.Credentials) {
      throw new Error('Failed to assume role: No credentials returned');
    }

    return new CostExplorerClient({
      region,
      credentials: {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken,
      },
    });

  } else if (account.encryptedCredentials) {
    const credentials = decryptCredentials(account.encryptedCredentials) as unknown as AWSCredentials;
    return new CostExplorerClient({
      region: credentials.region || region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
  }

  throw new Error('Invalid authentication configuration for AWS account');
}

/**
 * Get cost and usage data - DISABLED
 * Returns empty data to prevent Cost Explorer API charges.
 * Real data will come from CUR (S3) once configured.
 */
export async function getCostAndUsage(
  client: CostExplorerClient,
  startDate: string,
  endDate: string,
  granularity: Granularity = 'DAILY',
  groupBy: { Type: 'DIMENSION' | 'TAG'; Key: string }[] = [{ Type: 'DIMENSION', Key: 'SERVICE' }]
): Promise<DailyCost[]> {
  
  if (!COST_EXPLORER_ENABLED) {
    console.log('[CostExplorer] API disabled - returning empty data. Enable CUR for real data.');
    return [];
  }

  // Original implementation (disabled)
  return [];
}

/**
 * Get cost forecast - DISABLED
 */
export async function getCostForecast(
  client: CostExplorerClient,
  startDate: string,
  endDate: string
): Promise<{ totalForecast: number; forecastByDay: { date: string; cost: number }[] }> {
  
  if (!COST_EXPLORER_ENABLED) {
    console.log('[CostExplorer] Forecast API disabled.');
    return { totalForecast: 0, forecastByDay: [] };
  }

  return { totalForecast: 0, forecastByDay: [] };
}

/**
 * Get Reserved Instance utilization - DISABLED
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
  
  if (!COST_EXPLORER_ENABLED) {
    return { utilizationPercentage: 0, totalAmortizedFee: 0, unusedCommitment: 0 };
  }

  return { utilizationPercentage: 0, totalAmortizedFee: 0, unusedCommitment: 0 };
}

/**
 * Get Savings Plans utilization - DISABLED
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
  
  if (!COST_EXPLORER_ENABLED) {
    return { utilizationPercentage: 0, totalCommitment: 0, usedCommitment: 0 };
  }

  return { utilizationPercentage: 0, totalCommitment: 0, usedCommitment: 0 };
}

/**
 * Test AWS credentials - Uses STS instead of Cost Explorer (FREE)
 */
export async function testConnection(encryptedCredentials: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const credentials = decryptCredentials(encryptedCredentials) as unknown as AWSCredentials;
    
    // Use STS GetCallerIdentity instead of Cost Explorer (FREE)
    const sts = new STSClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const { GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    await sts.send(new GetCallerIdentityCommand({}));

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to AWS',
    };
  }
}
