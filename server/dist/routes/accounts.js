"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CloudAccount_1 = __importDefault(require("../models/CloudAccount"));
const auth_1 = require("../middleware/auth");
const encryption_1 = require("../config/encryption");
const awsCostExplorer = __importStar(require("../services/aws/costExplorer"));
const gcpBigQuery = __importStar(require("../services/gcp/bigquery"));
const azureCostManagement = __importStar(require("../services/azure/costManagement"));
// TODO: FOR TESTING ONLY - REMOVE IN PROD
const generateMockData_1 = require("../utils/generateMockData");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.auth);
/**
 * GET /api/accounts
 * Get all cloud accounts for the current user
 */
router.get('/', async (req, res) => {
    try {
        const accountsRaw = await CloudAccount_1.default.query('userId').eq(req.userId).exec();
        const accounts = accountsRaw.map(a => {
            const { encryptedCredentials, ...rest } = a;
            return rest;
        });
        res.json({ accounts });
    }
    catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});
/**
 * POST /api/accounts
 * Add a new cloud account
 */
router.post('/', async (req, res) => {
    try {
        const { provider, name, accountId, credentials, metadata } = req.body;
        if (!provider || !name || !credentials) {
            res.status(400).json({
                error: 'Provider, name, and credentials are required',
            });
            return;
        }
        // Validate provider
        if (!['aws', 'gcp', 'azure'].includes(provider)) {
            res.status(400).json({ error: 'Invalid provider' });
            return;
        }
        // Encrypt credentials
        const encryptedCredentials = (0, encryption_1.encryptCredentials)(credentials);
        // Test connection before saving
        let testResult;
        switch (provider) {
            case 'aws':
                testResult = await awsCostExplorer.testConnection(encryptedCredentials);
                break;
            case 'gcp':
                testResult = await gcpBigQuery.testConnection(encryptedCredentials);
                break;
            case 'azure':
                testResult = await azureCostManagement.testConnection(encryptedCredentials);
                break;
            default:
                testResult = { success: false, error: 'Invalid provider' };
        }
        // Create account
        const account = new CloudAccount_1.default({
            userId: req.userId,
            provider,
            name,
            accountId: accountId || credentials.accessKeyId || credentials.projectId || credentials.subscriptionId,
            encryptedCredentials,
            status: testResult.success ? 'connected' : 'error',
            lastSyncError: testResult.error,
            metadata,
        });
        await account.save();
        res.status(201).json({
            message: testResult.success
                ? 'Account connected successfully'
                : 'Account saved but connection failed',
            account: {
                id: account.id,
                provider: account.provider,
                name: account.name,
                accountId: account.accountId,
                status: account.status,
                lastSyncError: account.lastSyncError,
            },
            connectionTest: testResult,
        });
    }
    catch (error) {
        console.error('Add account error:', error);
        res.status(500).json({ error: error.message || 'Failed to add account' });
    }
});
// TODO: FOR TESTING ONLY - REMOVE IN PROD
/**
 * POST /api/accounts/mock
 * Add a mock AWS account for testing
 */
router.post('/mock', async (req, res) => {
    try {
        const provider = req.body.provider || 'aws';
        if (!['aws', 'gcp', 'azure'].includes(provider)) {
            res.status(400).json({ error: 'Invalid provider for mock account' });
            return;
        }
        const providerNames = {
            aws: 'Mock AWS Account',
            gcp: 'Mock GCP Account',
            azure: 'Mock Azure Account'
        };
        const account = new CloudAccount_1.default({
            userId: req.userId,
            provider: provider,
            name: providerNames[provider],
            accountId: `MOCK-${provider.toUpperCase()}-${Date.now()}`,
            encryptedCredentials: (0, encryption_1.encryptCredentials)({ accessKeyId: 'mock', secretAccessKey: 'mock', region: 'us-east-1' }),
            status: 'connected',
            metadata: {
                isMock: true,
            },
        });
        await account.save();
        // Directly generate and save the mock JSON file when this account is created
        (0, generateMockData_1.generateAndSaveMockData)(provider);
        res.status(201).json({
            message: 'Mock account connected successfully',
            account: {
                id: account.id,
                provider: account.provider,
                name: account.name,
                accountId: account.accountId,
                status: account.status,
            },
        });
    }
    catch (error) {
        console.error('Add mock account error:', error);
        res.status(500).json({ error: error.message || 'Failed to add mock account' });
    }
});
/**
 * POST /api/accounts/:id/test
 * Test connection to a cloud account
 */
router.post('/:id/test', async (req, res) => {
    try {
        const account = await CloudAccount_1.default.get(req.params.id);
        if (!account || !req.userId || account.userId !== req.userId) {
            res.status(404).json({ error: 'Account not found' });
            return;
        }
        let testResult;
        switch (account.provider) {
            case 'aws':
                testResult = await awsCostExplorer.testConnection(account.encryptedCredentials);
                break;
            case 'gcp':
                testResult = await gcpBigQuery.testConnection(account.encryptedCredentials);
                break;
            case 'azure':
                testResult = await azureCostManagement.testConnection(account.encryptedCredentials);
                break;
            default:
                testResult = { success: false, error: 'Invalid provider' };
        }
        // Update account status
        account.status = testResult.success ? 'connected' : 'error';
        account.lastSyncError = testResult.error;
        await account.save();
        res.json({
            success: testResult.success,
            error: testResult.error,
        });
    }
    catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({ error: 'Connection test failed' });
    }
});
/**
 * DELETE /api/accounts/:id
 * Delete a cloud account
 */
router.delete('/:id', async (req, res) => {
    try {
        const account = await CloudAccount_1.default.get(req.params.id);
        if (!account || !req.userId || account.userId !== req.userId) {
            res.status(404).json({ error: 'Account not found' });
            return;
        }
        await account.delete();
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});
/**
 * POST /api/accounts/:id/sync
 * Sync data from a cloud account
 */
router.post('/:id/sync', async (req, res) => {
    try {
        const account = await CloudAccount_1.default.get(req.params.id);
        if (!account || !req.userId || account.userId !== req.userId) {
            res.status(404).json({ error: 'Account not found' });
            return;
        }
        // Get cost data for last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        let syncResult = { success: false, message: '', data: null };
        switch (account.provider) {
            case 'aws': {
                const client = await awsCostExplorer.createCostExplorerClient(account);
                const costData = await awsCostExplorer.getCostAndUsage(client, startDate, endDate, 'DAILY');
                const totalCost = costData.reduce((sum, d) => sum + d.cost, 0);
                syncResult = {
                    success: true,
                    message: `Synced ${costData.length} days of cost data`,
                    data: {
                        daysProcessed: costData.length,
                        totalCost: Math.round(totalCost * 100) / 100,
                        currency: 'USD'
                    }
                };
                break;
            }
            case 'gcp': {
                const costData = await gcpBigQuery.getDailyCosts(account.encryptedCredentials, startDate, endDate);
                const totalCost = costData.reduce((sum, d) => sum + d.cost, 0);
                syncResult = {
                    success: true,
                    message: `Synced ${costData.length} days of cost data`,
                    data: {
                        daysProcessed: costData.length,
                        totalCost: Math.round(totalCost * 100) / 100,
                        currency: 'USD'
                    }
                };
                break;
            }
            case 'azure': {
                const costData = await azureCostManagement.getDailyCosts(account.encryptedCredentials, startDate, endDate);
                const totalCost = costData.reduce((sum, d) => sum + d.cost, 0);
                syncResult = {
                    success: true,
                    message: `Synced ${costData.length} days of cost data`,
                    data: {
                        daysProcessed: costData.length,
                        totalCost: Math.round(totalCost * 100) / 100,
                        currency: 'USD'
                    }
                };
                break;
            }
            default:
                syncResult = { success: false, message: 'Unsupported provider', data: null };
        }
        // Update account sync time
        if (syncResult.success) {
            account.lastSyncAt = new Date();
            account.status = 'connected';
            account.lastSyncError = undefined;
            await account.save();
        }
        res.json(syncResult);
    }
    catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync account data'
        });
    }
});
exports.default = router;
//# sourceMappingURL=accounts.js.map