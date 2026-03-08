"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCostManagementClient = createCostManagementClient;
exports.getCostData = getCostData;
exports.getDailyCosts = getDailyCosts;
exports.testConnection = testConnection;
const arm_costmanagement_1 = require("@azure/arm-costmanagement");
const identity_1 = require("@azure/identity");
const encryption_1 = require("../../config/encryption");
/**
 * Creates an Azure Cost Management client with the provided encrypted credentials
 */
function createCostManagementClient(encryptedCredentials) {
    const credentials = (0, encryption_1.decryptCredentials)(encryptedCredentials);
    const credential = new identity_1.ClientSecretCredential(credentials.tenantId, credentials.clientId, credentials.clientSecret);
    const client = new arm_costmanagement_1.CostManagementClient(credential);
    return {
        client,
        subscriptionId: credentials.subscriptionId,
    };
}
/**
 * Get cost data using Azure Cost Management Query API
 */
async function getCostData(encryptedCredentials, startDate, endDate) {
    const { client, subscriptionId } = createCostManagementClient(encryptedCredentials);
    const scope = `/subscriptions/${subscriptionId}`;
    try {
        const result = await client.query.usage(scope, {
            type: 'ActualCost',
            timeframe: 'Custom',
            timePeriod: {
                from: new Date(startDate),
                to: new Date(endDate),
            },
            dataset: {
                granularity: 'Daily',
                aggregation: {
                    totalCost: {
                        name: 'Cost',
                        function: 'Sum',
                    },
                },
                grouping: [
                    {
                        type: 'Dimension',
                        name: 'ServiceName',
                    },
                ],
            },
        });
        const costData = [];
        if (result.rows) {
            for (const row of result.rows) {
                // Row format: [cost, serviceName, date, currency]
                costData.push({
                    cost: parseFloat(row[0]),
                    service: row[1],
                    date: formatAzureDate(row[2]),
                    currency: row[3] || 'USD',
                });
            }
        }
        return costData;
    }
    catch (error) {
        console.error('Azure Cost Management error:', error);
        throw error;
    }
}
/**
 * Get daily cost totals
 */
async function getDailyCosts(encryptedCredentials, startDate, endDate) {
    const { client, subscriptionId } = createCostManagementClient(encryptedCredentials);
    const scope = `/subscriptions/${subscriptionId}`;
    try {
        const result = await client.query.usage(scope, {
            type: 'ActualCost',
            timeframe: 'Custom',
            timePeriod: {
                from: new Date(startDate),
                to: new Date(endDate),
            },
            dataset: {
                granularity: 'Daily',
                aggregation: {
                    totalCost: {
                        name: 'Cost',
                        function: 'Sum',
                    },
                },
            },
        });
        const dailyCosts = [];
        if (result.rows) {
            for (const row of result.rows) {
                dailyCosts.push({
                    cost: parseFloat(row[0]),
                    date: formatAzureDate(row[1]),
                    currency: row[2] || 'USD',
                });
            }
        }
        return dailyCosts;
    }
    catch (error) {
        console.error('Azure daily costs error:', error);
        throw error;
    }
}
/**
 * Format Azure date (YYYYMMDD number to YYYY-MM-DD string)
 */
function formatAzureDate(dateNum) {
    const dateStr = dateNum.toString();
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
/**
 * Test Azure credentials by making a simple API call
 */
async function testConnection(encryptedCredentials) {
    try {
        const { client, subscriptionId } = createCostManagementClient(encryptedCredentials);
        const scope = `/subscriptions/${subscriptionId}`;
        // Simple query to test connection - get yesterday's cost
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        await client.query.usage(scope, {
            type: 'ActualCost',
            timeframe: 'Custom',
            timePeriod: {
                from: yesterday,
                to: today,
            },
            dataset: {
                granularity: 'None',
                aggregation: {
                    totalCost: {
                        name: 'Cost',
                        function: 'Sum',
                    },
                },
            },
        });
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to connect to Azure',
        };
    }
}
//# sourceMappingURL=costManagement.js.map