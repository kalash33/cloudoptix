"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndSaveMockData = generateAndSaveMockData;
exports.getMockDataFromJSON = getMockDataFromJSON;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function generateData(provider) {
    const items = [];
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 180); // 6 months of data
    let services = [];
    if (provider === 'aws') {
        services = [
            { name: 'Amazon Elastic Compute Cloud', types: ['BoxUsage:t3.medium', 'BoxUsage:c5.large', 'BoxUsage:m5.xlarge', 'EBS:VolumeUsage.gp3'] },
            { name: 'Amazon Relational Database Service', types: ['InstanceUsage:db.r5.large', 'InstanceUsage:db.t3.medium', 'StorageUtility:Aurora'] },
            { name: 'Amazon Simple Storage Service', types: ['TimedStorage-ByteHrs', 'PutObject', 'GetObject'] },
            { name: 'AWS Lambda', types: ['Request', 'Compute-GB-s'] },
            { name: 'Amazon CloudFront', types: ['DataTransfer-Out-Bytes'] },
            { name: 'Amazon DynamoDB', types: ['ReadCapacityUnit-Hrs', 'WriteCapacityUnit-Hrs'] },
            { name: 'Amazon Elastic Kubernetes Service', types: ['AmazonEKS-Hours'] }
        ];
    }
    else if (provider === 'gcp') {
        services = [
            { name: 'Compute Engine', types: ['N2 Standard Core running in Americas', 'N2 Standard Ram running in Americas', 'SSD backed PD Capacity'] },
            { name: 'Cloud SQL', types: ['Cloud SQL for PostgreSQL: Zonal RAM in Americas', 'Cloud SQL for PostgreSQL: Zonal CPU in Americas'] },
            { name: 'Cloud Storage', types: ['Standard Storage US Regional', 'Nearline Storage US Regional'] },
            { name: 'Google Kubernetes Engine', types: ['GKE Cluster Management Fee'] },
            { name: 'Cloud Functions', types: ['Cloud Functions Invocations', 'Cloud Functions Compute Time'] },
            { name: 'BigQuery', types: ['Analysis Data size', 'Active Logical Storage'] }
        ];
    }
    else if (provider === 'azure') {
        services = [
            { name: 'Virtual Machines', types: ['D2s v3 Compute Hours', 'E4s v3 Compute Hours', 'Premium SSD Managed Disks'] },
            { name: 'Azure SQL Database', types: ['General Purpose Compute', 'General Purpose Storage'] },
            { name: 'Storage Accounts', types: ['Blob Storage Standard LRS', 'File Storage Transaction'] },
            { name: 'Azure Functions', types: ['Execution Time', 'Total Executions'] },
            { name: 'Azure Kubernetes Service', types: ['Standard Uptime SLA'] },
            { name: 'App Service', types: ['Premium V3 App Service Plan'] },
            { name: 'Cosmos DB', types: ['100 RU/s/hour'] }
        ];
    }
    // Apply baseline and growth curves to simulate 6 months of usage
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const daySeed = d.getDate();
        const monthGrowthMultiplier = 1 + ((d.getMonth() + d.getFullYear() * 12) - (start.getMonth() + start.getFullYear() * 12)) * 0.05; // 5% growth per month
        services.forEach(svc => {
            svc.types.forEach((type, index) => {
                let baseCost = 0;
                // Variadic cost generation based on service type and seed
                if (svc.name.includes('Compute') || svc.name.includes('Virtual Machines')) {
                    baseCost = 15 + (daySeed % 7) + (index * 5);
                }
                else if (svc.name.includes('Database') || svc.name.includes('SQL') || svc.name.includes('Cosmos')) {
                    baseCost = 25 + (daySeed % 3) + (index * 8);
                }
                else if (svc.name.includes('Storage')) {
                    baseCost = 5 + (daySeed % 5) + (index * 2);
                }
                else if (svc.name.includes('Kubernetes')) {
                    baseCost = 30 + (daySeed % 2);
                }
                else {
                    baseCost = 3 + (daySeed % 4);
                }
                // Add weekend dip logic (reduce usage by 30% on weekends)
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const weekendMultiplier = isWeekend ? 0.7 : 1.0;
                const finalCost = baseCost * monthGrowthMultiplier * weekendMultiplier;
                items.push({
                    service: svc.name,
                    usageType: type,
                    cost: Math.round(finalCost * 100) / 100, // format to 2 decimals
                    usageQuantity: Math.round(finalCost * 10),
                    date: dateStr,
                    provider: provider,
                });
            });
        });
    }
    return items;
}
function generateAndSaveMockData(provider = 'aws') {
    const dataDir = path_1.default.join(process.cwd(), 'data');
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    // Different filenames for different providers? Or append to mockCURData?
    // Azure and GCP don't use curService, but tests show they all read standard format if mocked. Let's keep one JSON file per provider.
    const filename = provider === 'aws' ? 'mockCURData.json' : `mock${provider.toUpperCase()}Data.json`;
    const outputPath = path_1.default.join(dataDir, filename);
    // If file exists, maybe we merge? Or overwrite? Let's append to existing or create new.
    let existingData = [];
    if (fs_1.default.existsSync(outputPath)) {
        existingData = JSON.parse(fs_1.default.readFileSync(outputPath, 'utf-8'));
    }
    const mockData = generateData(provider);
    // In memory databases are fun, but let's just overwrite for now to guarantee clean 6 month rolling window
    fs_1.default.writeFileSync(outputPath, JSON.stringify(mockData, null, 2));
    console.log(`Successfully generated ${mockData.length} mock cost records for ${provider} at ${outputPath}`);
    return outputPath;
}
function getMockDataFromJSON(provider, startDate, endDate) {
    const filename = provider === 'aws' ? 'mockCURData.json' : `mock${provider.toUpperCase()}Data.json`;
    const dataPath = path_1.default.join(process.cwd(), 'data', filename);
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
            const itemDate = new Date(item.date);
            itemDate.setUTCHours(12, 0, 0, 0);
            return itemDate >= start && itemDate <= end;
        });
    }
    catch (error) {
        console.error(`Error reading mock data JSON for ${provider}:`, error);
        return [];
    }
}
// Allow running directly as a script
if (require.main === module) {
    const providerArg = process.argv[2] || 'aws';
    generateAndSaveMockData(providerArg);
}
//# sourceMappingURL=generateMockData.js.map