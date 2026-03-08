"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBigQueryClient = createBigQueryClient;
exports.getCostData = getCostData;
exports.getDailyCosts = getDailyCosts;
exports.testConnection = testConnection;
const bigquery_1 = require("@google-cloud/bigquery");
const encryption_1 = require("../../config/encryption");
/**
 * Creates a BigQuery client with the provided encrypted credentials
 */
function createBigQueryClient(encryptedCredentials) {
    const credentials = (0, encryption_1.decryptCredentials)(encryptedCredentials);
    // Parse the service account key JSON
    const serviceAccountKey = JSON.parse(credentials.serviceAccountKey);
    const client = new bigquery_1.BigQuery({
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
async function getCostData(encryptedCredentials, startDate, endDate) {
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
        return rows.map((row) => ({
            date: row.usage_date.value,
            service: row.service_name,
            cost: parseFloat(row.total_cost),
            currency: row.currency,
            projectId,
        }));
    }
    catch (error) {
        console.error('GCP BigQuery error:', error);
        throw error;
    }
}
/**
 * Get daily cost totals
 */
async function getDailyCosts(encryptedCredentials, startDate, endDate) {
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
        return rows.map((row) => ({
            date: row.usage_date.value,
            cost: parseFloat(row.total_cost),
            currency: row.currency,
        }));
    }
    catch (error) {
        console.error('GCP daily costs error:', error);
        throw error;
    }
}
/**
 * Test GCP credentials by running a simple query
 */
async function testConnection(encryptedCredentials) {
    try {
        const { client, projectId, datasetId } = createBigQueryClient(encryptedCredentials);
        // Simple query to test connection
        const query = `SELECT 1 as test`;
        await client.query({ query });
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to connect to GCP BigQuery',
        };
    }
}
//# sourceMappingURL=bigquery.js.map