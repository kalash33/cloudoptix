"use strict";
/**
 * AWS Cost Explorer Service - DISABLED
 *
 * Cost Explorer API has been disabled to prevent charges ($0.01/request).
 * This file returns stub data. Real cost data will come from CUR (S3).
 *
 * Migration Status: Pending CUR setup
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCostExplorerClient = createCostExplorerClient;
exports.getCostAndUsage = getCostAndUsage;
exports.getCostForecast = getCostForecast;
exports.getReservationUtilization = getReservationUtilization;
exports.getSavingsPlansUtilization = getSavingsPlansUtilization;
exports.testConnection = testConnection;
const client_cost_explorer_1 = require("@aws-sdk/client-cost-explorer");
const client_sts_1 = require("@aws-sdk/client-sts");
const encryption_1 = require("../../config/encryption");
// Flag to enable/disable Cost Explorer API calls
// Set to false to prevent charges
const COST_EXPLORER_ENABLED = false;
/**
 * Creates an AWS Cost Explorer client.
 * NOTE: Client creation is free, only API calls cost money.
 */
async function createCostExplorerClient(account) {
    const region = account.metadata?.region || 'us-east-1';
    if (account.authType === 'role' && account.roleArn) {
        const sts = new client_sts_1.STSClient({ region });
        const command = new client_sts_1.AssumeRoleCommand({
            RoleArn: account.roleArn,
            RoleSessionName: 'FinOpsSpendySession',
            ExternalId: account.externalId,
        });
        const response = await sts.send(command);
        if (!response.Credentials) {
            throw new Error('Failed to assume role: No credentials returned');
        }
        return new client_cost_explorer_1.CostExplorerClient({
            region,
            credentials: {
                accessKeyId: response.Credentials.AccessKeyId,
                secretAccessKey: response.Credentials.SecretAccessKey,
                sessionToken: response.Credentials.SessionToken,
            },
        });
    }
    else if (account.encryptedCredentials) {
        const credentials = (0, encryption_1.decryptCredentials)(account.encryptedCredentials);
        return new client_cost_explorer_1.CostExplorerClient({
            region: credentials.region || region,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
        });
    }
    throw new Error('Invalid authentication configuration for AWS account');
}
/**
 * Get cost and usage data - DISABLED
 * Returns empty data to prevent Cost Explorer API charges.
 * Real data will come from CUR (S3) once configured.
 */
async function getCostAndUsage(client, startDate, endDate, granularity = 'DAILY', groupBy = [{ Type: 'DIMENSION', Key: 'SERVICE' }]) {
    if (!COST_EXPLORER_ENABLED) {
        console.log('[CostExplorer] API disabled - returning empty data. Enable CUR for real data.');
        return [];
    }
    // Original implementation (disabled)
    return [];
}
/**
 * Get cost forecast - DISABLED
 */
async function getCostForecast(client, startDate, endDate) {
    if (!COST_EXPLORER_ENABLED) {
        console.log('[CostExplorer] Forecast API disabled.');
        return { totalForecast: 0, forecastByDay: [] };
    }
    return { totalForecast: 0, forecastByDay: [] };
}
/**
 * Get Reserved Instance utilization - DISABLED
 */
async function getReservationUtilization(client, startDate, endDate) {
    if (!COST_EXPLORER_ENABLED) {
        return { utilizationPercentage: 0, totalAmortizedFee: 0, unusedCommitment: 0 };
    }
    return { utilizationPercentage: 0, totalAmortizedFee: 0, unusedCommitment: 0 };
}
/**
 * Get Savings Plans utilization - DISABLED
 */
async function getSavingsPlansUtilization(client, startDate, endDate) {
    if (!COST_EXPLORER_ENABLED) {
        return { utilizationPercentage: 0, totalCommitment: 0, usedCommitment: 0 };
    }
    return { utilizationPercentage: 0, totalCommitment: 0, usedCommitment: 0 };
}
/**
 * Test AWS credentials - Uses STS instead of Cost Explorer (FREE)
 */
async function testConnection(encryptedCredentials) {
    try {
        const credentials = (0, encryption_1.decryptCredentials)(encryptedCredentials);
        // Use STS GetCallerIdentity instead of Cost Explorer (FREE)
        const sts = new client_sts_1.STSClient({
            region: credentials.region || 'us-east-1',
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
        });
        const { GetCallerIdentityCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-sts')));
        await sts.send(new GetCallerIdentityCommand({}));
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to connect to AWS',
        };
    }
}
//# sourceMappingURL=costExplorer.js.map