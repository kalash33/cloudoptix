export interface ResourceData {
    provider: 'aws' | 'gcp' | 'azure';
    resourceType: string;
    resourceId: string;
    resourceName?: string;
    currentCost: number;
    utilizationMetrics?: {
        cpu?: number;
        memory?: number;
        network?: number;
        storage?: number;
    };
    metadata?: Record<string, any>;
}
export interface CostData {
    provider: 'aws' | 'gcp' | 'azure';
    dailyCosts: {
        date: string;
        cost: number;
    }[];
    serviceCosts: {
        service: string;
        cost: number;
    }[];
    totalMonthly: number;
}
export interface AIRecommendation {
    type: 'rightsizing' | 'unused' | 'commitment' | 'scheduling' | 'architecture';
    title: string;
    description: string;
    resourceId?: string;
    resourceName?: string;
    service: string;
    provider: 'aws' | 'gcp' | 'azure';
    currentCost: number;
    projectedCost: number;
    savings: number;
    savingsPercent: number;
    effort: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
    implementationSteps: string[];
    aiConfidence: number;
    reasoning: string;
}
/**
 * Generate AI-powered cost optimization recommendations using GPT-OSS 120B
 */
export declare function generateAIRecommendations(resources: ResourceData[], costData: CostData[]): Promise<AIRecommendation[]>;
/**
 * Combine static analysis with AI recommendations
 */
export declare function getEnhancedRecommendations(staticRecommendations: AIRecommendation[], resources: ResourceData[], costData: CostData[]): Promise<AIRecommendation[]>;
//# sourceMappingURL=recommendations.d.ts.map