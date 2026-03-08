import { Item } from 'dynamoose/dist/Item';
export interface ICostData extends Item {
    id: string;
    accountId: string;
    provider: 'aws' | 'gcp' | 'azure';
    date: Date;
    service: string;
    cost: number;
    currency: string;
    usageType?: string;
    region?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const CostDataModel: import("dynamoose/dist/General").ModelType<ICostData>;
export default CostDataModel;
//# sourceMappingURL=CostData.d.ts.map