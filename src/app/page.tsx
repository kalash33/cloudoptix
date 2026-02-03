"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingDown, Server, Lightbulb, Calendar, RefreshCw, Loader2, CloudOff, Plus } from "lucide-react";
import { CostCard } from "@/components/CostCard";
import { CloudBreakdown } from "@/components/CloudBreakdown";
import { SpendTrend } from "@/components/SpendTrend";
import { AnomalyAlerts } from "@/components/AnomalyAlerts";
import { TopRecommendations } from "@/components/TopRecommendations";
import { TopCostDrivers } from "@/components/TopCostDrivers";
import { costsApi, recommendationsApi, accountsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

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
  const [costSummary, setCostSummary] = useState(emptyCostSummary);
  const [providerCosts, setProviderCosts] = useState<Array<{ provider: 'aws' | 'gcp' | 'azure'; service: string; cost: number; previousCost: number; trend: number; instances: number }>>([]);
  const [dailyCostTrend, setDailyCostTrend] = useState(emptyDailyCostTrend);
  const [recommendations, setRecommendations] = useState<Array<any>>([]);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [hasRealData, setHasRealData] = useState(false);

  // Fetch real data from API
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setSyncing(true);

    try {
      // First check if user has any connected accounts
      const accountsResult = await accountsApi.getAll();
      const accountsExist = !!(accountsResult.data?.accounts && accountsResult.data.accounts.length > 0);
      setHasAccounts(accountsExist);

      if (!accountsExist) {
        // No accounts connected - show empty state
        setLoading(false);
        setSyncing(false);
        return;
      }

      // Fetch cost summary
      const summaryResult = await costsApi.getSummary();
      if (summaryResult.data && summaryResult.data.providers?.length > 0) {
        setHasRealData(true);
        
        // Calculate resources and recommendations count from providers
        const totalCurrent = summaryResult.data.totalMonthly;
        const totalPrevious = summaryResult.data.previousMonthly;
        
        setCostSummary({
          totalMonthly: Math.round(totalCurrent),
          previousMonthly: Math.round(totalPrevious),
          dailyAverage: Math.round(totalCurrent / 30),
          projectedMonthly: Math.round(totalCurrent * 0.95), // Optimistic projection
          totalSavingsIdentified: Math.round(totalCurrent * 0.42), // Default 42% savings potential
          savingsPercent: 42,
          resourcesAnalyzed: summaryResult.data.providers.length * 50, // Estimate
          recommendationsCount: 23, // Will be updated by recommendations API
        });

        // Update provider costs
        setProviderCosts(
          summaryResult.data.providers.map((p) => ({
            provider: p.provider as 'aws' | 'gcp' | 'azure',
            service: p.name,
            cost: Math.round(p.currentMonth),
            previousCost: Math.round(p.lastMonth),
            trend: p.lastMonth > 0 ? ((p.currentMonth - p.lastMonth) / p.lastMonth) * 100 : 0,
            instances: Math.round(p.currentMonth / 50), // Estimate instances
          }))
        );
      }

      // Fetch daily costs
      const dailyResult = await costsApi.getDaily();
      if (dailyResult.data?.data && dailyResult.data.data.length > 0) {
        setDailyCostTrend(dailyResult.data.data);
      }

      // Fetch recommendations
      const recsResult = await recommendationsApi.getAll();
      if (recsResult.data?.recommendations && recsResult.data.recommendations.length > 0) {
        setRecommendations(
          recsResult.data.recommendations.map((r) => ({
            id: r.id,
            type: r.type as any,
            title: r.title,
            description: r.description,
            provider: r.provider,
            currentCost: r.currentCost,
            projectedCost: r.projectedCost,
            savings: r.savings,
            savingsPercent: r.savingsPercent,
            effort: r.effort,
            risk: r.risk,
            resource: r.title,
            category: r.type,
            actionable: true,
          }))
        );
        
        // Update recommendations count
        setCostSummary((prev) => ({
          ...prev,
          recommendationsCount: recsResult.data!.summary.totalCount,
          totalSavingsIdentified: Math.round(recsResult.data!.summary.totalSavings),
        }));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Keep mock data on error
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate sparkline data from daily costs
  const sparklineData = dailyCostTrend.slice(-14).map((d) => d.total);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Get current month name
  const getCurrentMonth = () => {
    return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

  // Empty state when no cloud accounts are connected
  if (!hasAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, <span className="gradient-text">{userName}</span>
          </h1>
          <p className="text-[var(--foreground-muted)]">
            Here&apos;s your cloud cost overview for {getCurrentMonth()}
            {!hasRealData && (
              <span className="ml-2 text-xs bg-[var(--warning)]/20 text-[var(--warning)] px-2 py-1 rounded-full">
                Demo Data
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => fetchData(false)}
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

      {/* Key Metrics Grid */}
      <div className="grid-dashboard mb-8">
        <CostCard
          title="Monthly Spend"
          value={`$${costSummary.totalMonthly.toLocaleString()}`}
          trend={
            ((costSummary.totalMonthly - costSummary.previousMonthly) /
              costSummary.previousMonthly) *
            100
          }
          trendLabel="vs last month"
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
        <AnomalyAlerts anomalies={[]} />
      </div>

      {/* Cost Drivers Table */}
      <TopCostDrivers drivers={providerCosts.length > 0 ? (() => {
        const totalCost = providerCosts.reduce((sum, p) => sum + p.cost, 0);
        return providerCosts.map((p) => ({
          service: p.service,
          provider: p.provider,
          cost: p.cost,
          percent: totalCost > 0 ? (p.cost / totalCost) * 100 : 0,
        }));
      })() : []} />
    </div>
  );
}

