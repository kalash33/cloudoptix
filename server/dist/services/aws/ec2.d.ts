import { EC2Client } from '@aws-sdk/client-ec2';
export interface EC2Instance {
    instanceId: string;
    instanceType: string;
    state: string;
    launchTime?: Date;
    availabilityZone?: string;
    tags: {
        [key: string]: string;
    };
    cpuOptions?: {
        coreCount?: number;
        threadsPerCore?: number;
    };
}
/**
 * Creates an EC2 client with the provided encrypted credentials
 */
export declare function createEC2Client(encryptedCredentials: string, region?: string): EC2Client;
/**
 * Get all EC2 instances
 */
export declare function describeInstances(encryptedCredentials: string, regions?: string[]): Promise<EC2Instance[]>;
/**
 * Get EC2 pricing information (approximate)
 * Note: For accurate pricing, use AWS Price List API
 */
export declare function getApproximatePrice(instanceType: string): number;
//# sourceMappingURL=ec2.d.ts.map