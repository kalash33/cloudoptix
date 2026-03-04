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

import { S3Client, ListObjectsV2Command, GetObjectCommand, _Object } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { ICloudAccount } from '../../models/CloudAccount';
import { decryptCredentials } from '../../config/encryption';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

interface CURCostItem {
  service: string;
  usageType: string;
  cost: number;
  usageQuantity: number;
  date: string;
  provider: string;
}

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/**
 * Creates an S3 client for reading CUR data
 */
async function createS3Client(account: ICloudAccount): Promise<S3Client> {
  const region = account.metadata?.curRegion || account.metadata?.region || 'us-east-1';

  if (account.authType === 'role' && account.roleArn) {
    const sts = new STSClient({ region });

    const command = new AssumeRoleCommand({
      RoleArn: account.roleArn,
      RoleSessionName: 'FinOpsSpendyCURSession',
      ExternalId: account.externalId,
    });

    const response = await sts.send(command);

    if (!response.Credentials) {
      throw new Error('Failed to assume role for S3 access');
    }

    return new S3Client({
      region,
      credentials: {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken,
      },
    });

  } else if (account.encryptedCredentials) {
    const credentials = decryptCredentials(account.encryptedCredentials) as unknown as AWSCredentials;
    return new S3Client({
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
export async function listCURManifests(
  account: ICloudAccount
): Promise<string[]> {
  const s3 = await createS3Client(account);
  const bucketName = account.metadata?.curBucketName;
  const reportPath = account.metadata?.curReportPath || 'cur-reports/finops-spendy-cur/';

  if (!bucketName) {
    console.log('[CUR] No S3 bucket configured. Please deploy aws-cur-setup.yaml');
    return [];
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: reportPath,
      MaxKeys: 100,
    });

    const response = await s3.send(command);

    // Filter for manifest files
    const manifests = (response.Contents || [])
      .filter((obj) => obj.Key?.endsWith('-Manifest.json'))
      .map((obj) => obj.Key!)
      .sort()
      .reverse(); // Latest first

    return manifests;
  } catch (error) {
    console.error('[CUR] Error listing manifests:', error);
    return [];
  }
}

/**
 * Parse CSV content from CUR file
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
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
export async function getCURCostData(
  account: ICloudAccount,
  startDate: string,
  endDate: string
): Promise<CURCostItem[]> {
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
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: reportPath,
      MaxKeys: 50,
    });

    const listResponse = await s3.send(command);

    // Find the most recent CSV file
    const csvFiles = (listResponse.Contents || [])
      .filter((obj: _Object) => obj.Key?.endsWith('.csv') || obj.Key?.endsWith('.csv.gz'))
      .sort((a: _Object, b: _Object) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

    if (csvFiles.length === 0) {
      console.log('[CUR] No CSV files found. CUR may not be configured or data not yet available.');
      return [];
    }

    // Read the most recent file
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: csvFiles[0].Key,
    });

    const getResponse = await s3.send(getCommand);

    // Stream to string
    const stream = getResponse.Body as Readable;
    const chunks: Buffer[] = [];

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
    const serviceIdx = headers.findIndex(h =>
      h.includes('product/ProductName') || h.includes('lineItem/ProductCode')
    );
    const costIdx = headers.findIndex(h =>
      h.includes('lineItem/UnblendedCost') || h.includes('lineItem/BlendedCost')
    );
    const usageTypeIdx = headers.findIndex(h =>
      h.includes('lineItem/UsageType')
    );
    const dateIdx = headers.findIndex(h =>
      h.includes('lineItem/UsageStartDate') || h.includes('identity/TimeInterval')
    );

    if (serviceIdx === -1 || costIdx === -1) {
      console.log('[CUR] Could not find required columns in CUR file');
      return [];
    }

    // Parse data rows
    const costItems: CURCostItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length <= Math.max(serviceIdx, costIdx)) continue;

      const cost = parseFloat(values[costIdx]) || 0;
      if (cost <= 0) continue;

      const date = dateIdx !== -1 ? values[dateIdx].split('T')[0] : new Date().toISOString().split('T')[0];

      // Filter by date range
      if (date < startDate || date > endDate) continue;

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
    const aggregated: { [key: string]: CURCostItem } = {};

    for (const item of costItems) {
      const key = `${item.service}|${item.usageType}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...item };
      } else {
        aggregated[key].cost += item.cost;
      }
    }

    return Object.values(aggregated).sort((a, b) => b.cost - a.cost);

  } catch (error) {
    console.error('[CUR] Error reading CUR data:', error);
    return [];
  }
}

/**
 * Check if CUR is configured and data is available
 */
export async function checkCURStatus(
  account: ICloudAccount
): Promise<{
  configured: boolean;
  hasData: boolean;
  message: string;
}> {
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
  } catch (error) {
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
function getMockCURDataFromJSON(startDate: string, endDate: string): CURCostItem[] {
  const dataPath = path.join(process.cwd(), 'data', 'mockCURData.json');
  if (!fs.existsSync(dataPath)) {
    console.warn(`Mock JSON data not found at ${dataPath}. Returning empty array.`);
    return [];
  }

  try {
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const allData: CURCostItem[] = JSON.parse(fileContent);

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
  } catch (error) {
    console.error('Error reading mock data JSON:', error);
    return [];
  }
}
