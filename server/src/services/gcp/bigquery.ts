import { BigQuery } from '@google-cloud/bigquery';
import { decryptCredentials } from '../../config/encryption';

interface GCPCredentials {
  serviceAccountKey: string; // JSON string of service account key
  projectId: string;
  datasetId: string;
}

interface GCPCostData {
  date: string;
  service: string;
  cost: number;
  currency: string;
  projectId: string;
}

/**
 * Creates a BigQuery client with the provided encrypted credentials
 */
export function createBigQueryClient(encryptedCredentials: string): {
  client: BigQuery;
  projectId: string;
  datasetId: string;
} {
  const credentials = decryptCredentials(encryptedCredentials) as unknown as GCPCredentials;

  // Parse the service account key JSON
  const serviceAccountKey = JSON.parse(credentials.serviceAccountKey);

  const client = new BigQuery({
    projectId: credentials.projectId,
    credentials: serviceAccountKey,
  });

  return {
    client,
    projectId: credentials.projectId,
    datasetId: credentials.datasetId,
  };
}

/**
 * Get cost data from BigQuery billing export
 */
export async function getCostData(
  encryptedCredentials: string,
  startDate: string,
  endDate: string
): Promise<GCPCostData[]> {
  const { client, projectId, datasetId } = createBigQueryClient(encryptedCredentials);

  // Query the billing export table
  // Note: Table name format is usually `gcp_billing_export_v1_BILLING_ACCOUNT_ID`
  const query = `
    SELECT
      DATE(usage_start_time) as usage_date,
      service.description as service_name,
      SUM(cost) as total_cost,
      currency
    FROM
      \`${projectId}.${datasetId}.gcp_billing_export_*\`
    WHERE
      DATE(usage_start_time) >= @startDate
      AND DATE(usage_start_time) < @endDate
    GROUP BY
      usage_date, service_name, currency
    ORDER BY
      usage_date DESC, total_cost DESC
  `;

  const options = {
    query,
    params: {
      startDate,
      endDate,
    },
  };

  try {
    const [rows] = await client.query(options);

    return rows.map((row: any) => ({
      date: row.usage_date.value,
      service: row.service_name,
      cost: parseFloat(row.total_cost),
      currency: row.currency,
      projectId,
    }));
  } catch (error) {
    console.error('GCP BigQuery error:', error);
    throw error;
  }
}

/**
 * Get daily cost totals
 */
export async function getDailyCosts(
  encryptedCredentials: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; cost: number; currency: string }[]> {
  const { client, projectId, datasetId } = createBigQueryClient(encryptedCredentials);

  const query = `
    SELECT
      DATE(usage_start_time) as usage_date,
      SUM(cost) as total_cost,
      currency
    FROM
      \`${projectId}.${datasetId}.gcp_billing_export_*\`
    WHERE
      DATE(usage_start_time) >= @startDate
      AND DATE(usage_start_time) < @endDate
    GROUP BY
      usage_date, currency
    ORDER BY
      usage_date DESC
  `;

  const options = {
    query,
    params: {
      startDate,
      endDate,
    },
  };

  try {
    const [rows] = await client.query(options);

    return rows.map((row: any) => ({
      date: row.usage_date.value,
      cost: parseFloat(row.total_cost),
      currency: row.currency,
    }));
  } catch (error) {
    console.error('GCP daily costs error:', error);
    throw error;
  }
}

/**
 * Test GCP credentials by running a simple query
 */
export async function testConnection(encryptedCredentials: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { client, projectId, datasetId } = createBigQueryClient(encryptedCredentials);

    // Simple query to test connection
    const query = `SELECT 1 as test`;
    await client.query({ query });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to GCP BigQuery',
    };
  }
}
