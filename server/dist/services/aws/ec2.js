"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEC2Client = createEC2Client;
exports.describeInstances = describeInstances;
exports.getApproximatePrice = getApproximatePrice;
const client_ec2_1 = require("@aws-sdk/client-ec2");
const encryption_1 = require("../../config/encryption");
/**
 * Creates an EC2 client with the provided encrypted credentials
 */
function createEC2Client(encryptedCredentials, region) {
    const credentials = (0, encryption_1.decryptCredentials)(encryptedCredentials);
    return new client_ec2_1.EC2Client({
        region: region || credentials.region || 'us-east-1',
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
        },
    });
}
/**
 * Get all EC2 instances
 */
async function describeInstances(encryptedCredentials, regions = ['us-east-1', 'us-west-2', 'eu-west-1']) {
    const allInstances = [];
    for (const region of regions) {
        try {
            const client = createEC2Client(encryptedCredentials, region);
            const command = new client_ec2_1.DescribeInstancesCommand({});
            const response = await client.send(command);
            if (response.Reservations) {
                for (const reservation of response.Reservations) {
                    if (reservation.Instances) {
                        for (const instance of reservation.Instances) {
                            const tags = {};
                            if (instance.Tags) {
                                for (const tag of instance.Tags) {
                                    if (tag.Key && tag.Value) {
                                        tags[tag.Key] = tag.Value;
                                    }
                                }
                            }
                            allInstances.push({
                                instanceId: instance.InstanceId || '',
                                instanceType: instance.InstanceType || '',
                                state: instance.State?.Name || 'unknown',
                                launchTime: instance.LaunchTime,
                                availabilityZone: instance.Placement?.AvailabilityZone,
                                tags,
                                cpuOptions: instance.CpuOptions
                                    ? {
                                        coreCount: instance.CpuOptions.CoreCount,
                                        threadsPerCore: instance.CpuOptions.ThreadsPerCore,
                                    }
                                    : undefined,
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error fetching EC2 instances for region ${region}:`, error);
        }
    }
    return allInstances;
}
/**
 * Get EC2 pricing information (approximate)
 * Note: For accurate pricing, use AWS Price List API
 */
function getApproximatePrice(instanceType) {
    // Approximate hourly prices for common instance types (us-east-1)
    const pricing = {
        't2.micro': 0.0116,
        't2.small': 0.023,
        't2.medium': 0.0464,
        't2.large': 0.0928,
        't3.micro': 0.0104,
        't3.small': 0.0208,
        't3.medium': 0.0416,
        't3.large': 0.0832,
        't3.xlarge': 0.1664,
        't3.2xlarge': 0.3328,
        'm5.large': 0.096,
        'm5.xlarge': 0.192,
        'm5.2xlarge': 0.384,
        'c5.large': 0.085,
        'c5.xlarge': 0.17,
        'c5.2xlarge': 0.34,
        'r5.large': 0.126,
        'r5.xlarge': 0.252,
        'r5.2xlarge': 0.504,
    };
    return (pricing[instanceType] || 0.1) * 730; // Monthly (730 hours)
}
//# sourceMappingURL=ec2.js.map