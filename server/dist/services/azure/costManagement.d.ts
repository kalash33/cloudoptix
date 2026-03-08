import { CostManagementClient } from '@azure/arm-costmanagement';
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
export declare function createCostManagementClient(encryptedCredentials: string): {
    client: CostManagementClient;
    subscriptionId: string;
};
/**
 * Get cost data using Azure Cost Management Query API
 */
export declare function getCostData(encryptedCredentials: string, startDate: string, endDate: string): Promise<AzureCostData[]>;
/**
 * Get daily cost totals
 */
export declare function getDailyCosts(encryptedCredentials: string, startDate: string, endDate: string): Promise<{
    date: string;
    cost: number;
    currency: string;
}[]>;
/**
 * Test Azure credentials by making a simple API call
 */
export declare function testConnection(encryptedCredentials: string): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=costManagement.d.ts.map