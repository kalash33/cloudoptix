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
export const topCostDrivers: any[] = [];

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

export const recommendations: Recommendation[] = [];

// Active anomalies
export const anomalies: Anomaly[] = [];

// Resource inventory
export const resources: ResourceUsage[] = [];

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
