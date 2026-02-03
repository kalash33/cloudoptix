import { Router, Response } from 'express';
import CloudAccount from '../models/CloudAccount';
import { auth, AuthRequest } from '../middleware/auth';
import { encryptCredentials } from '../config/encryption';
import * as awsCostExplorer from '../services/aws/costExplorer';
import * as gcpBigQuery from '../services/gcp/bigquery';
import * as azureCostManagement from '../services/azure/costManagement';

const router = Router();

// All routes require authentication
router.use(auth);

/**
 * GET /api/accounts
 * Get all cloud accounts for the current user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await CloudAccount.find({ userId: req.userId }).select(
      '-encryptedCredentials'
    );

    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * POST /api/accounts
 * Add a new cloud account
 */
router.post('/', async (req: AuthRequest, res: Response) => {
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
    const encryptedCredentials = encryptCredentials(credentials);

    // Test connection before saving
    let testResult: { success: boolean; error?: string };

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
    const account = new CloudAccount({
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
        id: account._id,
        provider: account.provider,
        name: account.name,
        accountId: account.accountId,
        status: account.status,
        lastSyncError: account.lastSyncError,
      },
      connectionTest: testResult,
    });
  } catch (error: any) {
    console.error('Add account error:', error);
    res.status(500).json({ error: error.message || 'Failed to add account' });
  }
});

/**
 * POST /api/accounts/:id/test
 * Test connection to a cloud account
 */
router.post('/:id/test', async (req: AuthRequest, res: Response) => {
  try {
    const account = await CloudAccount.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    let testResult: { success: boolean; error?: string };

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
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Connection test failed' });
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete a cloud account
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await CloudAccount.deleteOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * POST /api/accounts/:id/sync
 * Sync data from a cloud account
 */
router.post('/:id/sync', async (req: AuthRequest, res: Response) => {
  try {
    const account = await CloudAccount.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Get cost data for last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    let syncResult = { success: false, message: '', data: null as any };

    switch (account.provider) {
      case 'aws': {
        const client = awsCostExplorer.createCostExplorerClient(account.encryptedCredentials);
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
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync account data' 
    });
  }
});

export default router;
