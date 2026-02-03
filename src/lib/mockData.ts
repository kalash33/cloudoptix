// Mock data for CloudOptix dashboard
// In production, this would come from real cloud provider APIs

export interface CloudCost {
  provider: 'aws' | 'gcp' | 'azure';
  service: string;
  cost: number;
  previousCost: number;
  trend: number;
  instances?: number;
}

export interface DailyCost {
  date: string;
  aws: number;
  gcp: number;
  azure: number;
  total: number;
  forecast?: number;
}

export interface Recommendation {
  id: string;
  type: 'rightsizing' | 'service-switch' | 'commitment' | 'unused' | 'migration';
  title: string;
  description: string;
  provider: 'aws' | 'gcp' | 'azure';
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercent: number;
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  resource: string;
  category: string;
  actionable: boolean;
}

export interface Anomaly {
  id: string;
  type: 'spike' | 'gradual' | 'unusual';
  service: string;
  provider: 'aws' | 'gcp' | 'azure';
  amount: number;
  percentIncrease: number;
  detectedAt: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

export interface ResourceUsage {
  id: string;
  name: string;
  type: string;
  provider: 'aws' | 'gcp' | 'azure';
  region: string;
  cpuUtilization: number;
  memoryUtilization: number;
  cost: number;
  status: 'running' | 'stopped' | 'idle';
  recommendation?: string;
}

// Summary metrics
export const costSummary = {
  totalMonthly: 10240,
  previousMonthly: 11890,
  dailyAverage: 341,
  projectedMonthly: 9800,
  totalSavingsIdentified: 4280,
  savingsPercent: 42,
  resourcesAnalyzed: 156,
  recommendationsCount: 23,
};

// Cost by provider
export const providerCosts: CloudCost[] = [
  {
    provider: 'aws',
    service: 'Amazon Web Services',
    cost: 6240,
    previousCost: 7120,
    trend: -12.4,
    instances: 45,
  },
  {
    provider: 'gcp',
    service: 'Google Cloud Platform',
    cost: 2890,
    previousCost: 3100,
    trend: -6.8,
    instances: 28,
  },
  {
    provider: 'azure',
    service: 'Microsoft Azure',
    cost: 1110,
    previousCost: 1670,
    trend: -33.5,
    instances: 12,
  },
];

// Top cost drivers
export const topCostDrivers = [
  { service: 'EC2 Instances', provider: 'aws' as const, cost: 3420, percent: 33.4 },
  { service: 'RDS Databases', provider: 'aws' as const, cost: 1560, percent: 15.2 },
  { service: 'Compute Engine', provider: 'gcp' as const, cost: 1240, percent: 12.1 },
  { service: 'Cloud Storage', provider: 'gcp' as const, cost: 890, percent: 8.7 },
  { service: 'S3 Storage', provider: 'aws' as const, cost: 720, percent: 7.0 },
  { service: 'Virtual Machines', provider: 'azure' as const, cost: 680, percent: 6.6 },
  { service: 'Lambda Functions', provider: 'aws' as const, cost: 540, percent: 5.3 },
  { service: 'BigQuery', provider: 'gcp' as const, cost: 420, percent: 4.1 },
];

// Daily cost trend (last 30 days)
export const dailyCostTrend: DailyCost[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  
  const baseAws = 200 + Math.random() * 50;
  const baseGcp = 90 + Math.random() * 30;
  const baseAzure = 35 + Math.random() * 15;
  
  // Add some variation and trends
  const dayVariation = Math.sin(i / 7 * Math.PI) * 20;
  const trend = -i * 0.5; // Slight downward trend (optimization effect)
  
  const aws = Math.max(0, baseAws + dayVariation + trend);
  const gcp = Math.max(0, baseGcp + dayVariation * 0.5 + trend * 0.4);
  const azure = Math.max(0, baseAzure + dayVariation * 0.3 + trend * 0.2);
  
  return {
    date: date.toISOString().split('T')[0],
    aws: Math.round(aws),
    gcp: Math.round(gcp),
    azure: Math.round(azure),
    total: Math.round(aws + gcp + azure),
  };
});

// Add forecast for next 7 days
export const forecastData: DailyCost[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i + 1);
  
  const lastDay = dailyCostTrend[dailyCostTrend.length - 1];
  const decay = 0.98 ** i;
  
  return {
    date: date.toISOString().split('T')[0],
    aws: Math.round(lastDay.aws * decay),
    gcp: Math.round(lastDay.gcp * decay),
    azure: Math.round(lastDay.azure * decay),
    total: Math.round(lastDay.total * decay),
    forecast: Math.round(lastDay.total * decay),
  };
});

// Recommendations
export const recommendations: Recommendation[] = [
  {
    id: '1',
    type: 'rightsizing',
    title: 'Downsize EC2 instance i-0abc123',
    description: 'This t3.xlarge instance averages 12% CPU and 18% memory utilization. Consider switching to t3.medium.',
    provider: 'aws',
    currentCost: 121.47,
    projectedCost: 30.37,
    savings: 91.10,
    savingsPercent: 75,
    effort: 'low',
    risk: 'low',
    resource: 'i-0abc123def456',
    category: 'Compute',
    actionable: true,
  },
  {
    id: '2',
    type: 'service-switch',
    title: 'Migrate API to AWS Lambda',
    description: 'Your API workload pattern (sporadic, event-driven) is better suited for serverless. Switch from EC2 to Lambda.',
    provider: 'aws',
    currentCost: 340.00,
    projectedCost: 85.00,
    savings: 255.00,
    savingsPercent: 75,
    effort: 'medium',
    risk: 'low',
    resource: 'api-gateway-service',
    category: 'Architecture',
    actionable: true,
  },
  {
    id: '3',
    type: 'unused',
    title: 'Delete unattached EBS volume vol-xyz789',
    description: 'This 500GB gp3 volume has been unattached for 45 days. Consider snapshotting and deleting.',
    provider: 'aws',
    currentCost: 45.00,
    projectedCost: 0,
    savings: 45.00,
    savingsPercent: 100,
    effort: 'low',
    risk: 'low',
    resource: 'vol-xyz789',
    category: 'Storage',
    actionable: true,
  },
  {
    id: '4',
    type: 'commitment',
    title: 'Purchase 1-year Savings Plan',
    description: 'Based on your consistent EC2 usage, a 1-year Compute Savings Plan would reduce costs significantly.',
    provider: 'aws',
    currentCost: 2400.00,
    projectedCost: 1560.00,
    savings: 840.00,
    savingsPercent: 35,
    effort: 'low',
    risk: 'medium',
    resource: 'ec2-compute-fleet',
    category: 'Commitment',
    actionable: true,
  },
  {
    id: '5',
    type: 'rightsizing',
    title: 'Rightsize GCE instance web-server-3',
    description: 'n2-standard-8 instance running at 8% CPU. Consider n2-standard-2 for this workload.',
    provider: 'gcp',
    currentCost: 194.18,
    projectedCost: 48.55,
    savings: 145.63,
    savingsPercent: 75,
    effort: 'low',
    risk: 'low',
    resource: 'web-server-3',
    category: 'Compute',
    actionable: true,
  },
  {
    id: '6',
    type: 'migration',
    title: 'Migrate Elastic Beanstalk to Render',
    description: 'Your Node.js app on Elastic Beanstalk can be migrated to Render for 50% cost savings with better DX.',
    provider: 'aws',
    currentCost: 280.00,
    projectedCost: 140.00,
    savings: 140.00,
    savingsPercent: 50,
    effort: 'medium',
    risk: 'low',
    resource: 'beanstalk-nodejs-app',
    category: 'Platform',
    actionable: true,
  },
  {
    id: '7',
    type: 'unused',
    title: 'Remove idle Azure VM dev-test-vm',
    description: 'This VM has been stopped for 30 days but is still incurring storage costs. Delete or deallocate completely.',
    provider: 'azure',
    currentCost: 156.00,
    projectedCost: 0,
    savings: 156.00,
    savingsPercent: 100,
    effort: 'low',
    risk: 'low',
    resource: 'dev-test-vm',
    category: 'Compute',
    actionable: true,
  },
  {
    id: '8',
    type: 'service-switch',
    title: 'Move batch jobs to Spot Instances',
    description: 'Your nightly batch processing can tolerate interruptions. Use EC2 Spot for up to 90% savings.',
    provider: 'aws',
    currentCost: 450.00,
    projectedCost: 67.50,
    savings: 382.50,
    savingsPercent: 85,
    effort: 'medium',
    risk: 'medium',
    resource: 'batch-processing-fleet',
    category: 'Compute',
    actionable: true,
  },
];

// Active anomalies
export const anomalies: Anomaly[] = [
  {
    id: '1',
    type: 'spike',
    service: 'EC2 Data Transfer',
    provider: 'aws',
    amount: 234.50,
    percentIncrease: 340,
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '2',
    type: 'gradual',
    service: 'S3 Requests',
    provider: 'aws',
    amount: 89.20,
    percentIncrease: 45,
    detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'acknowledged',
  },
  {
    id: '3',
    type: 'unusual',
    service: 'Cloud SQL',
    provider: 'gcp',
    amount: 156.00,
    percentIncrease: 120,
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
];

// Resource inventory
export const resources: ResourceUsage[] = [
  {
    id: '1',
    name: 'prod-api-server-1',
    type: 't3.xlarge',
    provider: 'aws',
    region: 'us-east-1',
    cpuUtilization: 12,
    memoryUtilization: 18,
    cost: 121.47,
    status: 'running',
    recommendation: 'Downsize to t3.medium',
  },
  {
    id: '2',
    name: 'prod-api-server-2',
    type: 't3.xlarge',
    provider: 'aws',
    region: 'us-east-1',
    cpuUtilization: 67,
    memoryUtilization: 72,
    cost: 121.47,
    status: 'running',
  },
  {
    id: '3',
    name: 'web-server-3',
    type: 'n2-standard-8',
    provider: 'gcp',
    region: 'us-central1',
    cpuUtilization: 8,
    memoryUtilization: 15,
    cost: 194.18,
    status: 'running',
    recommendation: 'Downsize to n2-standard-2',
  },
  {
    id: '4',
    name: 'database-primary',
    type: 'db.r5.large',
    provider: 'aws',
    region: 'us-east-1',
    cpuUtilization: 45,
    memoryUtilization: 62,
    cost: 175.20,
    status: 'running',
  },
  {
    id: '5',
    name: 'dev-test-vm',
    type: 'Standard_D4s_v3',
    provider: 'azure',
    region: 'eastus',
    cpuUtilization: 0,
    memoryUtilization: 0,
    cost: 156.00,
    status: 'stopped',
    recommendation: 'Delete or deallocate',
  },
  {
    id: '6',
    name: 'ml-training-gpu',
    type: 'p3.2xlarge',
    provider: 'aws',
    region: 'us-west-2',
    cpuUtilization: 3,
    memoryUtilization: 5,
    cost: 2203.20,
    status: 'idle',
    recommendation: 'Use Spot Instances',
  },
];

// Kubernetes cluster costs
export const kubernetesCosts = {
  totalCost: 3490,
  clusters: [
    {
      name: 'prod-eks-cluster',
      provider: 'aws' as const,
      cost: 1890,
      nodes: 8,
      pods: 156,
      namespaces: [
        { name: 'default', cost: 420, pods: 45 },
        { name: 'production', cost: 890, pods: 67 },
        { name: 'monitoring', cost: 340, pods: 28 },
        { name: 'staging', cost: 240, pods: 16 },
      ],
    },
    {
      name: 'dev-gke-cluster',
      provider: 'gcp' as const,
      cost: 950,
      nodes: 4,
      pods: 78,
      namespaces: [
        { name: 'development', cost: 520, pods: 45 },
        { name: 'testing', cost: 280, pods: 23 },
        { name: 'tools', cost: 150, pods: 10 },
      ],
    },
    {
      name: 'staging-aks-cluster',
      provider: 'azure' as const,
      cost: 650,
      nodes: 3,
      pods: 42,
      namespaces: [
        { name: 'staging', cost: 380, pods: 28 },
        { name: 'preview', cost: 270, pods: 14 },
      ],
    },
  ],
};

// Commitment coverage
export const commitments = {
  coverage: 45,
  unutilizedCommitments: 320,
  potentialSavings: 840,
  reservations: [
    {
      type: 'EC2 Reserved Instance',
      provider: 'aws' as const,
      commitment: 2400,
      utilized: 1920,
      utilizationPercent: 80,
      expiresIn: 180,
    },
    {
      type: 'Compute Savings Plan',
      provider: 'aws' as const,
      commitment: 1200,
      utilized: 1140,
      utilizationPercent: 95,
      expiresIn: 365,
    },
    {
      type: 'Committed Use Discount',
      provider: 'gcp' as const,
      commitment: 800,
      utilized: 720,
      utilizationPercent: 90,
      expiresIn: 240,
    },
    {
      type: 'Reserved VM Instance',
      provider: 'azure' as const,
      commitment: 600,
      utilized: 540,
      utilizationPercent: 90,
      expiresIn: 300,
    },
  ],
};

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format percentage
export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

// Helper function to get provider color
export function getProviderColor(provider: 'aws' | 'gcp' | 'azure'): string {
  const colors = {
    aws: '#ff9900',
    gcp: '#4285f4',
    azure: '#0078d4',
  };
  return colors[provider];
}

// Helper function to get provider name
export function getProviderName(provider: 'aws' | 'gcp' | 'azure'): string {
  const names = {
    aws: 'AWS',
    gcp: 'GCP',
    azure: 'Azure',
  };
  return names[provider];
}
