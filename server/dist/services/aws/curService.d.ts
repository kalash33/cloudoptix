/**
 * AWS Cost and Usage Reports (CUR) Service
 *
 * Reads cost data from S3-stored CUR files (CSV).
 * This is FREE - no API charges like Cost Explorer.
 *
 * Prerequisites:
 * 1. User must deploy aws-cur-setup.yaml CloudFormation stack
 * 2. Wait 24h for first CUR data to appear
 * 3. Configure S3 bucket name in account metadata
 */
import { ICloudAccount } from '../../models/CloudAccount';
interface CURCostItem {
    service: string;
    usageType: string;
    cost: number;
    usageQuantity: number;
    date: string;
    provider: string;
}
/**
 * List available CUR manifest files in S3
 */
export declare function listCURManifests(account: ICloudAccount): Promise<string[]>;
/**
 * Get cost data from CUR files
 * Returns aggregated cost by service
 */
export declare function getCURCostData(account: ICloudAccount, startDate: string, endDate: string): Promise<CURCostItem[]>;
/**
 * Check if CUR is configured and data is available
 */
export declare function checkCURStatus(account: ICloudAccount): Promise<{
    configured: boolean;
    hasData: boolean;
    message: string;
}>;
export {};
//# sourceMappingURL=curService.d.ts.map