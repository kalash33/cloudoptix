export interface CURCostItem {
    service: string;
    usageType: string;
    cost: number;
    usageQuantity: number;
    date: string;
    provider: 'aws' | 'gcp' | 'azure';
}
export declare function generateAndSaveMockData(provider?: 'aws' | 'gcp' | 'azure'): string;
export declare function getMockDataFromJSON(provider: 'aws' | 'gcp' | 'azure', startDate: string, endDate: string): CURCostItem[];
//# sourceMappingURL=generateMockData.d.ts.map