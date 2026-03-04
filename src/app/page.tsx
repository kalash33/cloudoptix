"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { DollarSign, TrendingDown, Server, Lightbulb, Calendar, RefreshCw, Loader2, CloudOff, Plus, ChevronDown, CalendarDays, Check } from "lucide-react";
import { CostCard } from "@/components/CostCard";
import { CloudBreakdown } from "@/components/CloudBreakdown";
import { SpendTrend } from "@/components/SpendTrend";
import { AnomalyAlerts } from "@/components/AnomalyAlerts";
import { TopRecommendations } from "@/components/TopRecommendations";
import { ResourceExplorer } from "@/components/ResourceExplorer";
import { costsApi, recommendationsApi, accountsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Empty default values - no mock data
const emptyCostSummary = {
  totalMonthly: 0,
  previousMonthly: 0,
  dailyAverage: 0,
  projectedMonthly: 0,
  totalSavingsIdentified: 0,
  savingsPercent: 0,
  resourcesAnalyzed: 0,
  recommendationsCount: 0,
};

const emptyDailyCostTrend: Array<{ date: string; aws: number; gcp: number; azure: number; total: number }> = [];

interface CostSummary {
  totalMonthly: number;
  previousMonthly: number;
  trend: number;
  providers: Array<{ provider: string; name: string; currentMonth: number; lastMonth: number }>;
}

interface DailyCost {
  date: string;
  aws: number;
  gcp: number;
  azure: number;
  total: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [hasRealData, setHasRealData] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Raw unfiltered data from API
  const [rawProviders, setRawProviders] = useState<Array<{ provider: string; name: string; currentMonth: number; lastMonth: number }>>([]);
  const [rawDailyData, setRawDailyData] = useState(emptyDailyCostTrend);
  const [rawRecommendations, setRawRecommendations] = useState<Array<any>>([]);
  const [rawServices, setRawServices] = useState<Array<{ service: string; provider: string; cost: number }>>([]);
  const [rawAnomalies, setRawAnomalies] = useState<Array<any>>([]);
  const [rawGeneratedResources, setRawGeneratedResources] = useState<Array<any>>([]);

  // Date filter state
  type DateRangeOption = 'today' | 'thisWeek' | 'thisMonth' | '30days' | '90days' | '6months' | '1year' | 'custom';
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeOption>('30days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  // Close account dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch real data from API
  const fetchData = async () => {
    setSyncing(true);

    try {
      // Calculate start and end dates based on filter
      const end = new Date();
      let start = new Date();

      switch (dateRangeFilter) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case 'thisWeek':
          start.setDate(end.getDate() - end.getDay()); // Start of current week (Sunday)
          break;
        case 'thisMonth':
          start.setDate(1); // Start of current month
          break;
        case '30days':
          start.setDate(end.getDate() - 30);
          break;
        case '90days':
          start.setDate(end.getDate() - 90);
          break;
        case '6months':
          start.setMonth(end.getMonth() - 6);
          break;
        case '1year':
          start.setFullYear(end.getFullYear() - 1);
          break;
        case 'custom':
          if (customDateRange.start && customDateRange.end) {
            start.setTime(new Date(customDateRange.start).getTime());
            end.setTime(new Date(customDateRange.end).getTime());
          }
          break;
      }

      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const startDateStr = formatDate(start);
      const endDateStr = formatDate(end);
      // First check if user has any connected accounts
      const accountsResult = await accountsApi.getAll();
      const accounts = accountsResult.data?.accounts || [];
      const accountsExist = accounts.length > 0;
      setHasAccounts(accountsExist);

      if (accountsExist && connectedAccounts.length === 0) {
        const accs = accounts.map((a: any) => ({ id: a.id, name: a.name, provider: a.provider }));
        setConnectedAccounts(accs);
        setSelectedAccountIds(accs.map((a: any) => a.id));
      }

      if (!accountsExist) {
        // No accounts connected - show empty state
        setLoading(false);
        setSyncing(false);
        return;
      }

      // Fetch cost summary using date params
      const summaryResult = await costsApi.getSummary(startDateStr, endDateStr);
      if (summaryResult.data && summaryResult.data.providers?.length > 0) {
        setHasRealData(true);
        setRawProviders(summaryResult.data.providers);
      }

      // Fetch daily costs
      const dailyResult = await costsApi.getDaily(startDateStr, endDateStr);
      if (dailyResult.data?.data && dailyResult.data.data.length > 0) {
        setRawDailyData(dailyResult.data.data);
      }

      // Fetch recommendations, anomalies, and resources
      const [recsResult, anomaliesResult, resourcesResult] = await Promise.all([
        recommendationsApi.getAll(),
        recommendationsApi.getAnomalies(),
        recommendationsApi.getResources()
      ]);

      if (recsResult.data?.recommendations && recsResult.data.recommendations.length > 0) {
        setRawRecommendations(recsResult.data.recommendations);
      }
      if (anomaliesResult.data?.anomalies) {
        setRawAnomalies(anomaliesResult.data.anomalies);
      }
      if (resourcesResult.data?.resources) {
        setRawGeneratedResources(resourcesResult.data.resources);
      }

      // Fetch services
      const servicesResult = await costsApi.getServices();
      if (servicesResult.data?.data) {
        setRawServices(servicesResult.data.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (dateRangeFilter === 'custom' && (!customDateRange.start || !customDateRange.end)) return;
    fetchData();
  }, [dateRangeFilter, customDateRange.start, customDateRange.end]);

  // ---- Client-side filtering by selected accounts ----
  const selectedProviders = useMemo(() => {
    const providers = new Set(
      connectedAccounts
        .filter(a => selectedAccountIds.includes(a.id))
        .map(a => a.provider)
    );
    // If none or all selected, show all providers
    return providers.size > 0 && providers.size < connectedAccounts.length
      ? providers
      : null; // null = no filtering
  }, [connectedAccounts, selectedAccountIds]);

  const formatCost = (val: number) => Math.round(val * 100) / 100;

  const costSummary = useMemo(() => {
    const filtered = selectedProviders
      ? rawProviders.filter(p => selectedProviders.has(p.provider))
      : rawProviders;
    const totalCurrent = filtered.reduce((sum, p) => sum + p.currentMonth, 0);
    const totalPrevious = filtered.reduce((sum, p) => sum + p.lastMonth, 0);
    const recs = selectedProviders
      ? rawRecommendations.filter(r => selectedProviders.has(r.provider))
      : rawRecommendations;
    const svcs = selectedProviders
      ? rawServices.filter(s => selectedProviders.has(s.provider))
      : rawServices;

    const totalSavingsIdentified = Math.round(recs.reduce((sum: number, r: any) => sum + (r.savings || 0), 0));

    return {
      totalMonthly: formatCost(totalCurrent),
      previousMonthly: formatCost(totalPrevious),
      dailyAverage: formatCost(totalCurrent / 30),
      projectedMonthly: formatCost(totalCurrent * 0.95),
      totalSavingsIdentified,
      savingsPercent: totalCurrent > 0 ? (totalSavingsIdentified / totalCurrent) * 100 : 0,
      resourcesAnalyzed: svcs.length,
      recommendationsCount: recs.length,
    };
  }, [rawProviders, rawRecommendations, selectedProviders, rawServices]);

  const providerCosts = useMemo(() => {
    const filtered = selectedProviders
      ? rawProviders.filter(p => selectedProviders.has(p.provider))
      : rawProviders;
    return filtered.map(p => ({
      provider: p.provider as 'aws' | 'gcp' | 'azure',
      service: p.name,
      cost: formatCost(p.currentMonth),
      previousCost: formatCost(p.lastMonth),
      trend: p.lastMonth > 0 ? ((p.currentMonth - p.lastMonth) / p.lastMonth) * 100 : 0,
      instances: Math.max(1, Math.round(p.currentMonth / 50)),
    }));
  }, [rawProviders, selectedProviders]);

  const dailyCostTrend = useMemo(() => {
    if (!selectedProviders) return rawDailyData;
    return rawDailyData.map(d => ({
      date: d.date,
      aws: selectedProviders.has('aws') ? d.aws : 0,
      gcp: selectedProviders.has('gcp') ? d.gcp : 0,
      azure: selectedProviders.has('azure') ? d.azure : 0,
      total: (selectedProviders.has('aws') ? d.aws : 0)
        + (selectedProviders.has('gcp') ? d.gcp : 0)
        + (selectedProviders.has('azure') ? d.azure : 0),
    }));
  }, [rawDailyData, selectedProviders]);

  const recommendations = useMemo(() => {
    const filtered = selectedProviders
      ? rawRecommendations.filter(r => selectedProviders.has(r.provider))
      : rawRecommendations;
    return filtered.map((r: any) => ({
      id: r.id, type: r.type, title: r.title, description: r.description,
      provider: r.provider, currentCost: r.currentCost, projectedCost: r.projectedCost,
      savings: r.savings, savingsPercent: r.savingsPercent, effort: r.effort, risk: r.risk,
      resource: r.title, category: r.type, actionable: true,
    }));
  }, [rawRecommendations, selectedProviders]);

  const topServices = useMemo(() => {
    const filtered = selectedProviders
      ? rawServices.filter(s => selectedProviders.has(s.provider))
      : rawServices;
    const total = filtered.reduce((sum, s) => sum + s.cost, 0);
    return filtered.map(s => ({
      service: s.service, provider: s.provider, cost: s.cost,
      percent: total > 0 ? (s.cost / total) * 100 : 0,
    }));
  }, [rawServices, selectedProviders]);

  // Generate sparkline data from daily costs
  const sparklineData = dailyCostTrend.slice(-14).map((d) => d.total);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Get dynamic textual interpretation of the selected date interval
  const getFilterLabel = () => {
    switch (dateRangeFilter) {
      case 'today': return 'today';
      case 'thisWeek': return 'this week';
      case 'thisMonth': return 'this month';
      case '30days': return 'the last 30 days';
      case '90days': return 'the last 90 days';
      case '6months': return 'the last 6 months';
      case '1year': return 'the last year';
      case 'custom': return customDateRange.start && customDateRange.end ? `${customDateRange.start} to ${customDateRange.end}` : 'your custom range';
      default: return 'the selected period';
    }
  };

  const userName = user?.name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading your cloud data...</p>
        </div>
      </div>
    );
  }

  // Empty state logic moved to render body

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, <span className="gradient-text">{userName}</span>
          </h1>
          <p className="text-[var(--foreground-muted)]">
            Here&apos;s your cloud cost overview for {getFilterLabel()}
            {!hasRealData && (
              <span className="ml-2 text-xs bg-[var(--warning)]/20 text-[var(--warning)] px-2 py-1 rounded-full">
                Demo Data
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Account filter dropdown (multi-select) */}
          {connectedAccounts.length > 1 && (
            <div className="relative" ref={accountDropdownRef}>
              <button
                onClick={() => setIsAccountDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-md hover:border-[var(--accent)] transition-colors text-sm"
              >
                <Server className="w-4 h-4 text-[var(--foreground-muted)]" />
                <span>
                  {selectedAccountIds.length === connectedAccounts.length
                    ? 'All Accounts'
                    : selectedAccountIds.length === 0
                      ? 'Select Accounts'
                      : `${selectedAccountIds.length} Account${selectedAccountIds.length > 1 ? 's' : ''}`}
                </span>
                <ChevronDown className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAccountDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-[220px] bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg shadow-xl z-50 py-1 animate-fade-in">
                  <button
                    onClick={() => setSelectedAccountIds(connectedAccounts.map(a => a.id))}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedAccountIds.length === connectedAccounts.length
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'border-[var(--glass-border)]'
                      }`}>
                      {selectedAccountIds.length === connectedAccounts.length && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-medium">All Accounts</span>
                  </button>
                  <div className="h-px bg-[var(--glass-border)] mx-2 my-1" />
                  {connectedAccounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccountIds(prev => {
                          if (prev.includes(acc.id)) {
                            const next = prev.filter(id => id !== acc.id);
                            return next.length > 0 ? next : prev; // prevent deselecting all
                          }
                          return [...prev, acc.id];
                        });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedAccountIds.includes(acc.id)
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'border-[var(--glass-border)]'
                        }`}>
                        {selectedAccountIds.includes(acc.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{acc.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {dateRangeFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5">
              <CalendarDays className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent border-none text-sm focus:outline-none text-[var(--foreground)] w-[130px] [color-scheme:dark]"
              />
              <span className="text-[var(--foreground-muted)] text-sm">→</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent border-none text-sm focus:outline-none text-[var(--foreground)] w-[130px] [color-scheme:dark]"
              />
            </div>
          )}
          <div className="relative flex items-center bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-md overflow-hidden hover:border-[var(--accent)] transition-colors">
            <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as DateRangeOption)}>
              <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--foreground-muted)]" />
                  <SelectValue placeholder="Select a date" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => fetchData()}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? "Syncing..." : "Sync Data"}
          </button>
        </div>
      </div>

      {!hasAccounts ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center mx-auto mb-6">
              <CloudOff className="w-10 h-10 text-[var(--foreground-muted)]" />
            </div>
            <h1 className="text-2xl font-bold mb-3">
              Welcome, <span className="gradient-text">{userName}</span>!
            </h1>
            <p className="text-[var(--foreground-muted)] mb-6">
              Connect your first cloud account to start analyzing your costs and get AI-powered optimization recommendations.
            </p>
            <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Connect Cloud Account
            </Link>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--primary)]">AWS</div>
                <div className="text-xs text-[var(--foreground-muted)]">Supported</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--info)]">GCP</div>
                <div className="text-xs text-[var(--foreground-muted)]">Supported</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--warning)]">Azure</div>
                <div className="text-xs text-[var(--foreground-muted)]">Supported</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid-dashboard mb-8">
            <CostCard
              title="Total Spend"
              value={`$${costSummary.totalMonthly.toLocaleString()}`}
              trend={
                ((costSummary.totalMonthly - costSummary.previousMonthly) /
                  costSummary.previousMonthly) *
                100
              }
              trendLabel="vs previous period"
              icon={<DollarSign className="w-5 h-5 text-[var(--primary)]" />}
              sparklineData={sparklineData}
            />
            <CostCard
              title="Potential Savings"
              value={`$${costSummary.totalSavingsIdentified.toLocaleString()}`}
              subtitle="/month"
              icon={<TrendingDown className="w-5 h-5 text-[var(--success)]" />}
              variant="success"
            />
            <CostCard
              title="Resources Analyzed"
              value={costSummary.resourcesAnalyzed.toString()}
              subtitle="instances"
              icon={<Server className="w-5 h-5 text-[var(--info)]" />}
            />
            <CostCard
              title="Active Recommendations"
              value={costSummary.recommendationsCount.toString()}
              subtitle="actions"
              icon={<Lightbulb className="w-5 h-5 text-[var(--warning)]" />}
            />
          </div>

          {/* Charts Section */}
          <div className="charts-grid mb-8">
            <SpendTrend
              data={dailyCostTrend}
              forecastData={[]}
              budgetLimit={costSummary.totalMonthly > 0 ? costSummary.totalMonthly * 1.1 : 400}
            />
            <CloudBreakdown
              data={providerCosts.map((p) => ({
                provider: p.provider,
                cost: p.cost,
              }))}
            />
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TopRecommendations recommendations={recommendations} limit={4} />
            <AnomalyAlerts anomalies={rawAnomalies} />
          </div>

          {/* Resource Explorer */}
          <ResourceExplorer
            services={topServices.map(s => ({
              service: s.service,
              provider: s.provider,
              cost: s.cost,
              percent: s.percent
            }))}
            recommendations={recommendations}
            resources={rawGeneratedResources}
          />
        </>
      )}
    </div>
  );
}

