import { Item } from 'dynamoose/dist/Item';
export type RecommendationType = 'rightsizing' | 'unused' | 'commitment' | 'service-switch' | 'migration';
export type EffortLevel = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RecommendationStatus = 'active' | 'dismissed' | 'applied';
export interface IRecommendation extends Item {
    id: string;
    accountId: string;
    userId: string;
    type: RecommendationType;
    title: string;
    description: string;
    resourceId: string;
    resourceName: string;
    service: string;
    provider: 'aws' | 'gcp' | 'azure';
    currentCost: number;
    projectedCost: number;
    savings: number;
    savingsPercent: number;
    effort: EffortLevel;
    risk: RiskLevel;
    status: RecommendationStatus;
    implementationSteps?: string[];
    detectedAt?: Date;
    appliedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const RecommendationModel: import("dynamoose/dist/General").ModelType<IRecommendation>;
export default RecommendationModel;
//# sourceMappingURL=Recommendation.d.ts.map