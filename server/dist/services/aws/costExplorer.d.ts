/**
 * AWS Cost Explorer Service - DISABLED
 *
 * Cost Explorer API has been disabled to prevent charges ($0.01/request).
 * This file returns stub data. Real cost data will come from CUR (S3).
 *
 * Migration Status: Pending CUR setup
 */
import { CostExplorerClient, Granularity } from '@aws-sdk/client-cost-explorer';
import { ICloudAccount } from '../../models/CloudAccount';
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
 * Creates an AWS Cost Explorer client.
 * NOTE: Client creation is free, only API calls cost money.
 */
export declare function createCostExplorerClient(account: ICloudAccount): Promise<CostExplorerClient>;
/**
 * Get cost and usage data - DISABLED
 * Returns empty data to prevent Cost Explorer API charges.
 * Real data will come from CUR (S3) once configured.
 */
export declare function getCostAndUsage(client: CostExplorerClient, startDate: string, endDate: string, granularity?: Granularity, groupBy?: {
    Type: 'DIMENSION' | 'TAG';
    Key: string;
}[]): Promise<DailyCost[]>;
/**
 * Get cost forecast - DISABLED
 */
export declare function getCostForecast(client: CostExplorerClient, startDate: string, endDate: string): Promise<{
    totalForecast: number;
    forecastByDay: {
        date: string;
        cost: number;
    }[];
}>;
/**
 * Get Reserved Instance utilization - DISABLED
 */
export declare function getReservationUtilization(client: CostExplorerClient, startDate: string, endDate: string): Promise<{
    utilizationPercentage: number;
    totalAmortizedFee: number;
    unusedCommitment: number;
}>;
/**
 * Get Savings Plans utilization - DISABLED
 */
export declare function getSavingsPlansUtilization(client: CostExplorerClient, startDate: string, endDate: string): Promise<{
    utilizationPercentage: number;
    totalCommitment: number;
    usedCommitment: number;
}>;
/**
 * Test AWS credentials - Uses STS instead of Cost Explorer (FREE)
 */
export declare function testConnection(encryptedCredentials: string): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=costExplorer.d.ts.map