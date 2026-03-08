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
const curService = __importStar(require("../services/aws/curService"));
const gcpBigQuery = __importStar(require("../services/gcp/bigquery"));
const azureCostManagement = __importStar(require("../services/azure/costManagement"));
const generateMockData_1 = require("../utils/generateMockData");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.auth);
/**
 * GET /api/costs/summary
 * Get cost summary across all connected accounts
 * Uses CUR (FREE) for AWS instead of Cost Explorer API
 */
router.get('/summary', async (req, res) => {
    try {
        const { startDate: queryStart, endDate: queryEnd } = req.query;
        const accountsRaw = await CloudAccount_1.default.query('userId').eq(req.userId).exec();
        const accounts = accountsRaw.filter(a => a.status === 'connected');
        if (accounts.length === 0) {
            res.json({
                totalMonthly: 0,
                previousMonthly: 0,
                providers: [],
                message: 'No connected accounts',
            });
            return;
        }
        // Calculate date ranges using UTC to avoid timezone issues
        const today = new Date();
        // Format date as YYYY-MM-DD in UTC
        const formatDate = (d) => {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        let start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        let end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        if (queryStart && queryEnd) {
            start = new Date(String(queryStart));
            end = new Date(String(queryEnd));
        }
        const currentMonthStart = formatDate(start);
        const currentEnd = formatDate(end);
        // Calculate previous period of exact same length
        const timeDiffMs = end.getTime() - start.getTime();
        // Previous period end is 1 day before current start
        const lastMonthEndObj = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const lastMonthStartObj = new Date(lastMonthEndObj.getTime() - timeDiffMs);
        const lastMonthStart = formatDate(lastMonthStartObj);
        const lastMonthEnd = formatDate(lastMonthEndObj);
        const providerCosts = [];
        for (const account of accounts) {
            try {
                let currentCost = 0;
                let lastMonthCost = 0;
                if (account.metadata?.isMock) {
                    const currentData = (0, generateMockData_1.getMockDataFromJSON)(account.provider, currentMonthStart, currentEnd);
                    const lastData = (0, generateMockData_1.getMockDataFromJSON)(account.provider, lastMonthStart, lastMonthEnd);
                    currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
                    lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
                }
                else {
                    switch (account.provider) {
                        case 'aws': {
                            const currentData = await curService.getCURCostData(account, currentMonthStart, currentEnd);
                            const lastData = await curService.getCURCostData(account, lastMonthStart, lastMonthEnd);
                            currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
                            lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
                            break;
                        }
                        case 'gcp': {
                            const currentData = await gcpBigQuery.getDailyCosts(account.encryptedCredentials, currentMonthStart, currentEnd);
                            const lastData = await gcpBigQuery.getDailyCosts(account.encryptedCredentials, lastMonthStart, lastMonthEnd);
                            currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
                            lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
                            break;
                        }
                        case 'azure': {
                            const currentData = await azureCostManagement.getDailyCosts(account.encryptedCredentials, currentMonthStart, currentEnd);
                            const lastData = await azureCostManagement.getDailyCosts(account.encryptedCredentials, lastMonthStart, lastMonthEnd);
                            currentCost = currentData.reduce((sum, d) => sum + d.cost, 0);
                            lastMonthCost = lastData.reduce((sum, d) => sum + d.cost, 0);
                            break;
                        }
                    }
                }
                providerCosts.push({
                    provider: account.provider,
                    name: account.name,
                    currentMonth: currentCost,
                    lastMonth: lastMonthCost,
                });
                // Update last sync time
                account.lastSyncAt = new Date();
                await account.save();
            }
            catch (error) {
                console.error(`Error fetching costs for ${account.name}:`, error);
            }
        }
        const totalCurrentMonth = providerCosts.reduce((sum, p) => sum + p.currentMonth, 0);
        const totalLastMonth = providerCosts.reduce((sum, p) => sum + p.lastMonth, 0);
        res.json({
            totalMonthly: totalCurrentMonth,
            previousMonthly: totalLastMonth,
            trend: totalLastMonth > 0
                ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100
                : 0,
            providers: providerCosts,
        });
    }
    catch (error) {
        console.error('Cost summary error:', error);
        res.status(500).json({ error: 'Failed to fetch cost summary' });
    }
});
/**
 * GET /api/costs/daily
 * Get daily cost data for the last 30 days
 * Uses CUR (FREE) for AWS instead of Cost Explorer API
 */
router.get('/daily', async (req, res) => {
    try {
        const { startDate: queryStart, endDate: queryEnd } = req.query;
        const accountsRaw = await CloudAccount_1.default.query('userId').eq(req.userId).exec();
        const accounts = accountsRaw.filter(a => a.status === 'connected');
        if (accounts.length === 0) {
            res.json({ data: [], message: 'No connected accounts' });
            return;
        }
        const today = new Date();
        const thirtyDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 30));
        const formatDate = (d) => {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const startDate = queryStart ? String(queryStart) : formatDate(thirtyDaysAgo);
        const endDate = queryEnd ? String(queryEnd) : formatDate(today);
        console.log('[DEBUG costs/daily] Full incoming URL:', req.originalUrl);
        console.log('[DEBUG costs/daily] Query Dates:', { queryStart, queryEnd });
        console.log('[DEBUG costs/daily] Computed Bounds:', { startDate, endDate });
        // Aggregate data by date and provider
        const dailyData = {};
        for (const account of accounts) {
            try {
                let costs = [];
                if (account.metadata?.isMock) {
                    const mockData = (0, generateMockData_1.getMockDataFromJSON)(account.provider, startDate, endDate);
                    const costsByDate = {};
                    for (const item of mockData) {
                        if (!costsByDate[item.date])
                            costsByDate[item.date] = 0;
                        costsByDate[item.date] += item.cost;
                    }
                    costs = Object.entries(costsByDate).map(([date, cost]) => ({ date, cost }));
                }
                else {
                    switch (account.provider) {
                        case 'aws': {
                            const curData = await curService.getCURCostData(account, startDate, endDate);
                            const costsByDate = {};
                            for (const item of curData) {
                                if (!costsByDate[item.date])
                                    costsByDate[item.date] = 0;
                                costsByDate[item.date] += item.cost;
                            }
                            costs = Object.entries(costsByDate).map(([date, cost]) => ({ date, cost }));
                            break;
                        }
                        case 'gcp': {
                            costs = await gcpBigQuery.getDailyCosts(account.encryptedCredentials, startDate, endDate);
                            break;
                        }
                        case 'azure': {
                            costs = await azureCostManagement.getDailyCosts(account.encryptedCredentials, startDate, endDate);
                            break;
                        }
                    }
                }
                for (const cost of costs) {
                    if (!dailyData[cost.date]) {
                        dailyData[cost.date] = { aws: 0, gcp: 0, azure: 0, total: 0 };
                    }
                    dailyData[cost.date][account.provider] += cost.cost;
                    dailyData[cost.date].total += cost.cost;
                }
            }
            catch (error) {
                console.error(`Error fetching daily costs for ${account.name}:`, error);
            }
        }
        // Convert to array and sort by date
        const result = Object.entries(dailyData)
            .map(([date, costs]) => ({
            date,
            ...costs,
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
        res.json({ data: result });
    }
    catch (error) {
        console.error('Daily costs error:', error);
        res.status(500).json({ error: 'Failed to fetch daily costs' });
    }
});
/**
 * GET /api/costs/services
 * Get cost breakdown by service
 */
router.get('/services', async (req, res) => {
    try {
        const accountsRaw = await CloudAccount_1.default.query('userId').eq(req.userId).exec();
        const accounts = accountsRaw.filter(a => a.status === 'connected');
        if (accounts.length === 0) {
            res.json({ data: [], message: 'No connected accounts' });
            return;
        }
        // Current month - use UTC to avoid timezone issues
        const today = new Date();
        const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const formatDate = (d) => {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const startDate = formatDate(startOfMonth);
        const endDate = formatDate(today);
        const serviceData = [];
        for (const account of accounts) {
            try {
                if (account.metadata?.isMock) {
                    const mockData = (0, generateMockData_1.getMockDataFromJSON)(account.provider, startDate, endDate);
                    for (const item of mockData) {
                        serviceData.push({
                            service: `${item.service}${item.usageType ? ' - ' + item.usageType : ''}`,
                            provider: account.provider,
                            cost: item.cost,
                        });
                    }
                }
                else {
                    switch (account.provider) {
                        case 'aws': {
                            const curData = await curService.getCURCostData(account, startDate, endDate);
                            if (curData.length > 0) {
                                for (const item of curData) {
                                    serviceData.push({
                                        service: `${item.service} - ${item.usageType}`,
                                        provider: 'aws',
                                        cost: item.cost,
                                    });
                                }
                            }
                            break;
                        }
                        case 'gcp': {
                            const data = await gcpBigQuery.getCostData(account.encryptedCredentials, startDate, endDate);
                            for (const item of data) {
                                serviceData.push({ service: item.service, provider: 'gcp', cost: item.cost });
                            }
                            break;
                        }
                        case 'azure': {
                            const data = await azureCostManagement.getCostData(account.encryptedCredentials, startDate, endDate);
                            for (const item of data) {
                                serviceData.push({ service: item.service, provider: 'azure', cost: item.cost });
                            }
                            break;
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error fetching service costs for ${account.name}:`, error);
            }
        }
        // Calculate days elapsed and total days in month for projection
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const daysElapsed = today.getDate();
        // Helper to calculate projection
        const calculateProjection = (cost) => {
            if (daysElapsed === 0)
                return 0;
            return (cost / daysElapsed) * daysInMonth;
        };
        const aggregated = {};
        for (const item of serviceData) {
            const key = `${item.provider}:${item.service}`;
            if (!aggregated[key]) {
                aggregated[key] = { ...item, projectedCost: calculateProjection(item.cost) };
            }
            else {
                aggregated[key].cost += item.cost;
                aggregated[key].projectedCost = calculateProjection(aggregated[key].cost);
            }
        }
        const result = Object.values(aggregated).sort((a, b) => b.cost - a.cost);
        res.json({ data: result });
    }
    catch (error) {
        console.error('Service costs error:', error);
        res.status(500).json({ error: 'Failed to fetch service costs' });
    }
});
/**
 * GET /api/costs/services/:serviceName/daily
 * Get daily cost data for a specific service
 */
router.get('/services/:serviceName/daily', async (req, res) => {
    try {
        const serviceName = decodeURIComponent(String(req.params.serviceName));
        const { startDate: queryStart, endDate: queryEnd } = req.query;
        const accountsRaw = await CloudAccount_1.default.query('userId').eq(req.userId).exec();
        const accounts = accountsRaw.filter(a => a.status === 'connected');
        if (accounts.length === 0) {
            res.json({ data: [], message: 'No connected accounts' });
            return;
        }
        const today = new Date();
        const thirtyDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 30));
        const formatDate = (d) => {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const startDate = typeof queryStart === 'string' ? queryStart : (Array.isArray(queryStart) ? String(queryStart[0]) : formatDate(thirtyDaysAgo));
        const endDate = typeof queryEnd === 'string' ? queryEnd : (Array.isArray(queryEnd) ? String(queryEnd[0]) : formatDate(today));
        // Collect per-service daily costs
        const dailyData = {};
        for (const account of accounts) {
            try {
                let items = [];
                if (account.metadata?.isMock) {
                    items = (0, generateMockData_1.getMockDataFromJSON)(account.provider, startDate, endDate);
                }
                else {
                    switch (account.provider) {
                        case 'aws': {
                            items = await curService.getCURCostData(account, startDate, endDate);
                            break;
                        }
                        // GCP and Azure don't return per-service items from daily endpoint
                        // so we skip them here (their service breakdown comes from getCostData)
                    }
                }
                for (const item of items) {
                    // Match service name: either exact match on the service field, or
                    // the combined "service - usageType" string
                    const itemFullName = item.usageType ? `${item.service} - ${item.usageType}` : item.service;
                    if (itemFullName === serviceName || item.service === serviceName || serviceName.startsWith(item.service)) {
                        if (!dailyData[item.date])
                            dailyData[item.date] = 0;
                        dailyData[item.date] += item.cost;
                    }
                }
            }
            catch (error) {
                console.error(`Error fetching service daily costs for ${account.name}:`, error);
            }
        }
        const result = Object.entries(dailyData)
            .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
            .sort((a, b) => a.date.localeCompare(b.date));
        res.json({ data: result });
    }
    catch (error) {
        console.error('Service daily costs error:', error);
        res.status(500).json({ error: 'Failed to fetch service daily costs' });
    }
});
/**
 * GET /api/costs/services/:serviceName/utilization
 * Get utilization metrics for a service (mock data for now)
 */
router.get('/services/:serviceName/utilization', async (req, res) => {
    try {
        const serviceName = decodeURIComponent(String(req.params.serviceName));
        const svcLower = serviceName.toLowerCase();
        // Determine resource type from service name for realistic mock data
        const isCompute = svcLower.includes('compute') || svcLower.includes('ec2') || svcLower.includes('eks') || svcLower.includes('lambda') || svcLower.includes('vm');
        const isDatabase = svcLower.includes('rds') || svcLower.includes('database') || svcLower.includes('aurora') || svcLower.includes('dynamo') || svcLower.includes('sql');
        const isStorage = svcLower.includes('s3') || svcLower.includes('storage') || svcLower.includes('ebs') || svcLower.includes('blob');
        const isNetwork = svcLower.includes('cloudfront') || svcLower.includes('elb') || svcLower.includes('load balancer') || svcLower.includes('cdn') || svcLower.includes('nat');
        // Generate realistic utilization values based on service type
        // Use a simple seed from the service name for consistency
        const seed = serviceName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const pseudoRandom = (offset) => ((seed * 17 + offset * 31) % 100);
        let cpuAvg, cpuPeak, memAvg, memPeak;
        let networkIn, networkOut, diskReadIOPS, diskWriteIOPS;
        if (isCompute) {
            cpuAvg = 15 + (pseudoRandom(1) % 40); // 15-54% (often underutilized)
            cpuPeak = Math.min(cpuAvg + 20 + (pseudoRandom(2) % 25), 99);
            memAvg = 20 + (pseudoRandom(3) % 45);
            memPeak = Math.min(memAvg + 15 + (pseudoRandom(4) % 20), 99);
            networkIn = 5 + (pseudoRandom(5) % 50); // GB
            networkOut = 2 + (pseudoRandom(6) % 30);
            diskReadIOPS = 100 + (pseudoRandom(7) % 900);
            diskWriteIOPS = 50 + (pseudoRandom(8) % 500);
        }
        else if (isDatabase) {
            cpuAvg = 25 + (pseudoRandom(1) % 50);
            cpuPeak = Math.min(cpuAvg + 15 + (pseudoRandom(2) % 30), 99);
            memAvg = 40 + (pseudoRandom(3) % 40);
            memPeak = Math.min(memAvg + 10 + (pseudoRandom(4) % 20), 99);
            networkIn = 10 + (pseudoRandom(5) % 40);
            networkOut = 8 + (pseudoRandom(6) % 35);
            diskReadIOPS = 500 + (pseudoRandom(7) % 4500);
            diskWriteIOPS = 200 + (pseudoRandom(8) % 3000);
        }
        else if (isStorage) {
            cpuAvg = 5 + (pseudoRandom(1) % 15);
            cpuPeak = Math.min(cpuAvg + 10 + (pseudoRandom(2) % 15), 50);
            memAvg = 10 + (pseudoRandom(3) % 20);
            memPeak = Math.min(memAvg + 10 + (pseudoRandom(4) % 15), 45);
            networkIn = 20 + (pseudoRandom(5) % 80);
            networkOut = 15 + (pseudoRandom(6) % 60);
            diskReadIOPS = 1000 + (pseudoRandom(7) % 9000);
            diskWriteIOPS = 500 + (pseudoRandom(8) % 5000);
        }
        else if (isNetwork) {
            cpuAvg = 10 + (pseudoRandom(1) % 30);
            cpuPeak = Math.min(cpuAvg + 20 + (pseudoRandom(2) % 30), 85);
            memAvg = 15 + (pseudoRandom(3) % 25);
            memPeak = Math.min(memAvg + 10 + (pseudoRandom(4) % 20), 60);
            networkIn = 50 + (pseudoRandom(5) % 200);
            networkOut = 40 + (pseudoRandom(6) % 180);
            diskReadIOPS = 50 + (pseudoRandom(7) % 200);
            diskWriteIOPS = 20 + (pseudoRandom(8) % 100);
        }
        else {
            cpuAvg = 20 + (pseudoRandom(1) % 35);
            cpuPeak = Math.min(cpuAvg + 15 + (pseudoRandom(2) % 25), 90);
            memAvg = 25 + (pseudoRandom(3) % 35);
            memPeak = Math.min(memAvg + 10 + (pseudoRandom(4) % 20), 85);
            networkIn = 8 + (pseudoRandom(5) % 40);
            networkOut = 5 + (pseudoRandom(6) % 30);
            diskReadIOPS = 200 + (pseudoRandom(7) % 2000);
            diskWriteIOPS = 100 + (pseudoRandom(8) % 1000);
        }
        // Parse date range from query params (default: 30 days)
        const startDateParam = req.query.startDate;
        const endDateParam = req.query.endDate;
        const endDate = endDateParam ? new Date(endDateParam) : new Date();
        const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000);
        const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        // Generate daily utilization trend for the requested range
        const dailyTrend = [];
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            // Add some daily variance
            const dayVariance = (pseudoRandom(i * 7) % 20) - 10;
            const weekendFactor = (d.getDay() === 0 || d.getDay() === 6) ? 0.7 : 1.0;
            dailyTrend.push({
                date: dateStr,
                cpu: Math.max(5, Math.min(99, Math.round((cpuAvg + dayVariance) * weekendFactor))),
                memory: Math.max(10, Math.min(99, Math.round((memAvg + dayVariance * 0.5) * weekendFactor))),
                network: Math.max(1, Math.round((networkIn + networkOut) * (0.8 + (pseudoRandom(i * 3) % 40) / 100) * weekendFactor)),
                diskIO: Math.max(10, Math.round((diskReadIOPS + diskWriteIOPS) * (0.8 + (pseudoRandom(i * 5) % 40) / 100) * weekendFactor)),
            });
        }
        res.json({
            serviceName,
            metrics: {
                cpu: { avg: cpuAvg, peak: cpuPeak, unit: '%' },
                memory: { avg: memAvg, peak: memPeak, unit: '%' },
                networkIn: { value: networkIn, unit: 'GB' },
                networkOut: { value: networkOut, unit: 'GB' },
                diskReadIOPS: { value: diskReadIOPS, unit: 'IOPS' },
                diskWriteIOPS: { value: diskWriteIOPS, unit: 'IOPS' },
            },
            dailyTrend,
        });
    }
    catch (error) {
        console.error('Service utilization error:', error);
        res.status(500).json({ error: 'Failed to fetch utilization metrics' });
    }
});
/**
 * GET /api/costs/forecast
 * Get cost forecast for the next 7 days
 * Uses simple projection based on CUR data (FREE) instead of Cost Explorer Forecast API
 */
router.get('/forecast', async (req, res) => {
    try {
        const accountsRaw = await CloudAccount_1.default.query('userId').eq(req.userId).exec();
        const accounts = accountsRaw.filter(a => a.status === 'connected');
        if (accounts.length === 0) {
            res.json({ forecast: [], message: 'No connected accounts' });
            return;
        }
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const formatDate = (d) => {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const startDate = formatDate(thirtyDaysAgo);
        const endDate = formatDate(today);
        let totalHistoricalCost = 0;
        let daysWithData = 0;
        // Calculate average daily cost from historical data
        for (const account of accounts) {
            try {
                if (account.metadata?.isMock) {
                    const mockData = (0, generateMockData_1.getMockDataFromJSON)(account.provider, startDate, endDate);
                    const costsByDate = {};
                    for (const item of mockData) {
                        if (!costsByDate[item.date])
                            costsByDate[item.date] = 0;
                        costsByDate[item.date] += item.cost;
                    }
                    totalHistoricalCost += Object.values(costsByDate).reduce((sum, cost) => sum + cost, 0);
                    daysWithData = Math.max(daysWithData, Object.keys(costsByDate).length);
                }
                else {
                    switch (account.provider) {
                        case 'aws': {
                            const curData = await curService.getCURCostData(account, startDate, endDate);
                            const costsByDate = {};
                            for (const item of curData) {
                                if (!costsByDate[item.date])
                                    costsByDate[item.date] = 0;
                                costsByDate[item.date] += item.cost;
                            }
                            totalHistoricalCost += Object.values(costsByDate).reduce((sum, cost) => sum + cost, 0);
                            daysWithData = Math.max(daysWithData, Object.keys(costsByDate).length);
                            break;
                        }
                        case 'gcp': {
                            const costs = await gcpBigQuery.getDailyCosts(account.encryptedCredentials, startDate, endDate);
                            totalHistoricalCost += costs.reduce((sum, d) => sum + d.cost, 0);
                            daysWithData = Math.max(daysWithData, costs.length);
                            break;
                        }
                        case 'azure': {
                            const costs = await azureCostManagement.getDailyCosts(account.encryptedCredentials, startDate, endDate);
                            totalHistoricalCost += costs.reduce((sum, d) => sum + d.cost, 0);
                            daysWithData = Math.max(daysWithData, costs.length);
                            break;
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error fetching forecast data for ${account.name}:`, error);
            }
        }
        // Calculate average daily cost
        const avgDailyCost = daysWithData > 0 ? totalHistoricalCost / daysWithData : 0;
        // Generate 7-day forecast
        const forecastByDay = [];
        for (let i = 1; i <= 7; i++) {
            const forecastDate = new Date(today);
            forecastDate.setDate(forecastDate.getDate() + i);
            forecastByDay.push({
                date: formatDate(forecastDate),
                cost: avgDailyCost,
            });
        }
        const totalForecast = avgDailyCost * 7;
        res.json({
            totalForecast,
            forecastByDay,
            method: 'simple_average',
            note: 'Forecast based on 30-day average (FREE alternative to Cost Explorer Forecast API)',
        });
    }
    catch (error) {
        console.error('Forecast error:', error);
        res.status(500).json({ error: 'Failed to fetch forecast' });
    }
});
exports.default = router;
//# sourceMappingURL=costs.js.map