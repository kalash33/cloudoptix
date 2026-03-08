"use strict";
/**
 * AWS Cost and Usage Reports (CUR) Service
 *
 * Reads cost data from S3-stored CUR files (CSV).
 * This is FREE - no API charges like Cost Explorer.
 *
 * Prerequisites:
 * 1. User must deploy aws-cur-setup.yaml CloudFormation stack
 * 2. Wait 24h for first CUR data to appear
 * 3. Configure S3 bucket name in account metadata
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCURManifests = listCURManifests;
exports.getCURCostData = getCURCostData;
exports.checkCURStatus = checkCURStatus;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_sts_1 = require("@aws-sdk/client-sts");
const encryption_1 = require("../../config/encryption");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Creates an S3 client for reading CUR data
 */
async function createS3Client(account) {
    const region = account.metadata?.curRegion || account.metadata?.region || 'us-east-1';
    if (account.authType === 'role' && account.roleArn) {
        const sts = new client_sts_1.STSClient({ region });
        const command = new client_sts_1.AssumeRoleCommand({
            RoleArn: account.roleArn,
            RoleSessionName: 'FinOpsSpendyCURSession',
            ExternalId: account.externalId,
        });
        const response = await sts.send(command);
        if (!response.Credentials) {
            throw new Error('Failed to assume role for S3 access');
        }
        return new client_s3_1.S3Client({
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
        return new client_s3_1.S3Client({
            region: credentials.region || region,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
        });
    }
    throw new Error('Invalid authentication for S3 access');
}
/**
 * List available CUR manifest files in S3
 */
async function listCURManifests(account) {
    const s3 = await createS3Client(account);
    const bucketName = account.metadata?.curBucketName;
    const reportPath = account.metadata?.curReportPath || 'cur-reports/finops-spendy-cur/';
    if (!bucketName) {
        console.log('[CUR] No S3 bucket configured. Please deploy aws-cur-setup.yaml');
        return [];
    }
    try {
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: reportPath,
            MaxKeys: 100,
        });
        const response = await s3.send(command);
        // Filter for manifest files
        const manifests = (response.Contents || [])
            .filter((obj) => obj.Key?.endsWith('-Manifest.json'))
            .map((obj) => obj.Key)
            .sort()
            .reverse(); // Latest first
        return manifests;
    }
    catch (error) {
        console.error('[CUR] Error listing manifests:', error);
        return [];
    }
}
/**
 * Parse CSV content from CUR file
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
/**
 * Get cost data from CUR files
 * Returns aggregated cost by service
 */
async function getCURCostData(account, startDate, endDate) {
    // TODO: FOR TESTING ONLY - REMOVE IN PROD
    if (account.metadata?.isMock) {
        return getMockCURDataFromJSON(startDate, endDate);
    }
    const bucketName = account.metadata?.curBucketName;
    const reportPath = account.metadata?.curReportPath || 'cur-reports/finops-spendy-cur/';
    if (!bucketName) {
        console.log('[CUR] No S3 bucket configured');
        return [];
    }
    try {
        const s3 = await createS3Client(account);
        // List CSV files
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: reportPath,
            MaxKeys: 50,
        });
        const listResponse = await s3.send(command);
        // Find the most recent CSV file
        const csvFiles = (listResponse.Contents || [])
            .filter((obj) => obj.Key?.endsWith('.csv') || obj.Key?.endsWith('.csv.gz'))
            .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
        if (csvFiles.length === 0) {
            console.log('[CUR] No CSV files found. CUR may not be configured or data not yet available.');
            return [];
        }
        // Read the most recent file
        const getCommand = new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: csvFiles[0].Key,
        });
        const getResponse = await s3.send(getCommand);
        // Stream to string
        const stream = getResponse.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const csvContent = Buffer.concat(chunks).toString('utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return [];
        }
        // Parse header
        const headers = parseCSVLine(lines[0]);
        const serviceIdx = headers.findIndex(h => h.includes('product/ProductName') || h.includes('lineItem/ProductCode'));
        const costIdx = headers.findIndex(h => h.includes('lineItem/UnblendedCost') || h.includes('lineItem/BlendedCost'));
        const usageTypeIdx = headers.findIndex(h => h.includes('lineItem/UsageType'));
        const dateIdx = headers.findIndex(h => h.includes('lineItem/UsageStartDate') || h.includes('identity/TimeInterval'));
        if (serviceIdx === -1 || costIdx === -1) {
            console.log('[CUR] Could not find required columns in CUR file');
            return [];
        }
        // Parse data rows
        const costItems = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length <= Math.max(serviceIdx, costIdx))
                continue;
            const cost = parseFloat(values[costIdx]) || 0;
            if (cost <= 0)
                continue;
            const date = dateIdx !== -1 ? values[dateIdx].split('T')[0] : new Date().toISOString().split('T')[0];
            // Filter by date range
            if (date < startDate || date > endDate)
                continue;
            costItems.push({
                service: values[serviceIdx] || 'Unknown',
                usageType: usageTypeIdx !== -1 ? values[usageTypeIdx] : 'General',
                cost,
                usageQuantity: 0,
                date,
                provider: 'aws',
            });
        }
        // Aggregate by service + usageType
        const aggregated = {};
        for (const item of costItems) {
            const key = `${item.service}|${item.usageType}`;
            if (!aggregated[key]) {
                aggregated[key] = { ...item };
            }
            else {
                aggregated[key].cost += item.cost;
            }
        }
        return Object.values(aggregated).sort((a, b) => b.cost - a.cost);
    }
    catch (error) {
        console.error('[CUR] Error reading CUR data:', error);
        return [];
    }
}
/**
 * Check if CUR is configured and data is available
 */
async function checkCURStatus(account) {
    // TODO: FOR TESTING ONLY - REMOVE IN PROD
    if (account.metadata?.isMock) {
        return {
            configured: true,
            hasData: true,
            message: 'Mock AWS account active.',
        };
    }
    const bucketName = account.metadata?.curBucketName;
    if (!bucketName) {
        return {
            configured: false,
            hasData: false,
            message: 'CUR not configured. Please deploy aws-cur-setup.yaml CloudFormation stack.',
        };
    }
    try {
        const manifests = await listCURManifests(account);
        if (manifests.length === 0) {
            return {
                configured: true,
                hasData: false,
                message: 'CUR configured but no data yet. First report appears within 24 hours.',
            };
        }
        return {
            configured: true,
            hasData: true,
            message: `CUR active. Found ${manifests.length} report(s).`,
        };
    }
    catch (error) {
        return {
            configured: true,
            hasData: false,
            message: 'Error accessing CUR bucket. Check IAM permissions.',
        };
    }
}
// TODO: FOR TESTING ONLY - REMOVE IN PROD
/**
 * Read mock CUR cost data from the generated JSON file for testing
 */
function getMockCURDataFromJSON(startDate, endDate) {
    const dataPath = path_1.default.join(process.cwd(), 'data', 'mockCURData.json');
    if (!fs_1.default.existsSync(dataPath)) {
        console.warn(`Mock JSON data not found at ${dataPath}. Returning empty array.`);
        return [];
    }
    try {
        const fileContent = fs_1.default.readFileSync(dataPath, 'utf-8');
        const allData = JSON.parse(fileContent);
        // Filter by the requested date range
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        return allData.filter(item => {
            // item.date is from JSON in YYYY-MM-DD format
            const itemDate = new Date(item.date);
            itemDate.setUTCHours(12, 0, 0, 0); // Put it safely in the middle of the day in UTC
            return itemDate >= start && itemDate <= end;
        });
    }
    catch (error) {
        console.error('Error reading mock data JSON:', error);
        return [];
    }
}
//# sourceMappingURL=curService.js.map