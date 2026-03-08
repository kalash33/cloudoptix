import { BigQuery } from '@google-cloud/bigquery';
interface GCPCostData {
    date: string;
    service: string;
    cost: number;
    currency: string;
    projectId: string;
}
/**
 * Creates a BigQuery client with the provided encrypted credentials
 */
export declare function createBigQueryClient(encryptedCredentials: string): {
    client: BigQuery;
    projectId: string;
    datasetId: string;
};
/**
 * Get cost data from BigQuery billing export
 */
export declare function getCostData(encryptedCredentials: string, startDate: string, endDate: string): Promise<GCPCostData[]>;
/**
 * Get daily cost totals
 */
export declare function getDailyCosts(encryptedCredentials: string, startDate: string, endDate: string): Promise<{
    date: string;
    cost: number;
    currency: string;
}[]>;
/**
 * Test GCP credentials by running a simple query
 */
export declare function testConnection(encryptedCredentials: string): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=bigquery.d.ts.map