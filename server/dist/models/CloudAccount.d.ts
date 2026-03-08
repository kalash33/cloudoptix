import { Item } from 'dynamoose/dist/Item';
export type CloudProvider = 'aws' | 'gcp' | 'azure';
export type AccountStatus = 'pending' | 'connected' | 'error' | 'syncing';
export interface ICloudAccount extends Item {
    id: string;
    userId: string;
    provider: CloudProvider;
    name: string;
    accountId: string;
    encryptedCredentials?: string;
    authType: 'keys' | 'role';
    roleArn?: string;
    externalId?: string;
    status: AccountStatus;
    lastSyncAt?: Date;
    lastSyncError?: string;
    metadata?: {
        region?: string;
        bigQueryDataset?: string;
        tenantId?: string;
        curBucketName?: string;
        curReportPath?: string;
        curRegion?: string;
        isMock?: boolean;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const CloudAccountModel: import("dynamoose/dist/General").ModelType<ICloudAccount>;
export default CloudAccountModel;
//# sourceMappingURL=CloudAccount.d.ts.map