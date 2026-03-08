declare const router: import("express-serve-static-core").Router;
/**
 * Gather service cost data from all connected accounts
 */
export declare function gatherServiceCostData(userId: string): Promise<{
    accounts: {
        name: string;
        provider: import("../models/CloudAccount").CloudProvider;
    }[];
    services: {
        cpuAvg: number;
        memAvg: number;
        resourceType: string;
        service: string;
        provider: string;
        cost: number;
        accountId: string;
    }[];
    totalCost: number;
}>;
export default router;
//# sourceMappingURL=recommendations.d.ts.map