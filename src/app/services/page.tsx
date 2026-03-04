"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Server,
  Search,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Filter,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { accountsApi, costsApi } from "@/lib/api";
import { getProviderName, getProviderColor } from "@/lib/mockData";

// Donut chart component
const DonutChart = ({ data, size = 180 }: { data: { name: string; value: number; color: string }[]; size?: number }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--background-tertiary)"
          strokeWidth={strokeWidth}
        />
        {data.map((segment, i) => {
          const percentage = segment.value / total;
          const dashLength = circumference * percentage;
          const offset = currentOffset;
          currentOffset += dashLength;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              className="transition-all duration-700 ease-out"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">${total.toFixed(0)}</span>
        <span className="text-xs text-[var(--foreground-muted)]">This Month</span>
      </div>
    </div>
  );
};

// Animated counter component
const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 2 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>;
};

// Progress ring for individual items
const MiniProgress = ({ percent, color }: { percent: number; color: string }) => {
  const size = 32;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--background-tertiary)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
};

export default function ServicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<Array<{ service: string; provider: string; cost: number; projectedCost?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"cost" | "name" | "percent">("cost");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const accountsResult = await accountsApi.getAll();
      const accountsExist = !!(accountsResult.data?.accounts && accountsResult.data.accounts.length > 0);
      setHasAccounts(accountsExist);

      if (accountsExist) {
        const result = await costsApi.getServices();
        if (result.data) {
          setServices(result.data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate services by name (excluding usage type for donut chart)
  const aggregatedByService = useMemo(() => {
    const agg: { [key: string]: { name: string; value: number; color: string } } = {};
    services.forEach(item => {
      const serviceName = item.service.split(' - ')[0];
      if (!agg[serviceName]) {
        agg[serviceName] = {
          name: serviceName,
          value: 0,
          color: getProviderColor(item.provider as any)
        };
      }
      agg[serviceName].value += item.cost;
    });
    return Object.values(agg).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [services]);

  // Chart colors
  const chartColors = ['#0d9488', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
  const chartData = aggregatedByService.map((item, i) => ({
    ...item,
    color: chartColors[i % chartColors.length]
  }));

  const filteredServices = useMemo(() => {
    return services
      .map(item => {
        const [serviceName, ...usageTypeParts] = item.service.split(' - ');
        const usageType = usageTypeParts.join(' - ') || 'General';
        return { ...item, serviceName, usageType };
      })
      .filter((item) => {
        if (selectedProvider !== "all" && item.provider !== selectedProvider) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.serviceName.toLowerCase().includes(query) ||
          item.usageType.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === "cost") return b.cost - a.cost;
        if (sortBy === "name") return a.serviceName.localeCompare(b.serviceName);
        return b.cost - a.cost;
      });
  }, [services, searchQuery, selectedProvider, sortBy]);

  const totalCost = services.reduce((sum, item) => sum + item.cost, 0);
  const projectedTotal = services.reduce((sum, item) => sum + (item.projectedCost || item.cost), 0);
  const topService = services.length > 0 ? services.reduce((a, b) => a.cost > b.cost ? a : b) : null;

  // Calculate day of month for projection accuracy
  const today = new Date();
  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectionAccuracy = Math.round((daysElapsed / daysInMonth) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-[var(--primary)] mx-auto mb-4" />
            <div className="absolute inset-0 blur-xl bg-[var(--primary)] opacity-20 rounded-full" />
          </div>
          <p className="text-[var(--foreground-muted)] mt-4">Loading your cost data...</p>
        </div>
      </div>
    );
  }

  if (!hasAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md glass-card p-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--chart-2)] flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-3">No Services Yet</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account to unlock detailed cost analytics and projections.
          </p>
          <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Connect Cloud Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--chart-2)]">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Cost Analytics</h1>
          </div>
          <p className="text-[var(--foreground-muted)]">
            Real-time insights into your cloud spending
          </p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary group">
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Current Spend Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--primary)] to-transparent opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:opacity-20 transition-opacity" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--foreground-muted)]">Current Spend</span>
            <div className="p-2 rounded-lg bg-[var(--primary-subtle)]">
              <DollarSign className="w-4 h-4 text-[var(--primary)]" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            <AnimatedNumber value={totalCost} prefix="$" />
          </p>
          <p className="text-xs text-[var(--foreground-muted)] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {daysElapsed} of {daysInMonth} days elapsed
          </p>
        </div>

        {/* Projected Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--warning)] to-transparent opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:opacity-20 transition-opacity" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--foreground-muted)]">Month-End Projection</span>
            <div className="p-2 rounded-lg bg-[var(--warning-subtle)]">
              <TrendingUp className="w-4 h-4 text-[var(--warning)]" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            <AnimatedNumber value={projectedTotal} prefix="$" />
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--warning)] transition-all duration-1000"
                style={{ width: `${projectionAccuracy}%` }}
              />
            </div>
            <span className="text-xs text-[var(--foreground-muted)]">{projectionAccuracy}% confident</span>
          </div>
        </div>

        {/* Top Service Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--info)] to-transparent opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:opacity-20 transition-opacity" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--foreground-muted)]">Top Service</span>
            <div className="p-2 rounded-lg bg-[var(--info-subtle)]">
              <Sparkles className="w-4 h-4 text-[var(--info)]" />
            </div>
          </div>
          <p className="text-xl font-bold mb-1 truncate">
            {topService ? topService.service.split(' - ')[0] : 'N/A'}
          </p>
          <p className="text-sm text-[var(--foreground-secondary)]">
            ${topService?.cost.toFixed(2) || '0.00'}
            <span className="text-[var(--foreground-muted)]"> ({totalCost > 0 ? ((topService?.cost || 0) / totalCost * 100).toFixed(0) : 0}% of total)</span>
          </p>
        </div>

        {/* Line Items Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--success)] to-transparent opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:opacity-20 transition-opacity" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--foreground-muted)]">Total Line Items</span>
            <div className="p-2 rounded-lg bg-[var(--success-subtle)]">
              <Server className="w-4 h-4 text-[var(--success)]" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">{services.length}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Unique usage types tracked
          </p>
        </div>
      </div>

      {/* Charts and Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Donut Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-[var(--foreground-muted)] mb-6">Cost Distribution</h3>
          <div className="flex items-center justify-center">
            <DonutChart data={chartData} />
          </div>
          <div className="mt-6 space-y-2">
            {chartData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-medium">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Movers */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-[var(--foreground-muted)]">Top Cost Drivers</h3>
            <span className="text-xs text-[var(--foreground-muted)]">By total spend</span>
          </div>
          <div className="space-y-4">
            {aggregatedByService.slice(0, 5).map((item, i) => {
              const percent = totalCost > 0 ? (item.value / totalCost) * 100 : 0;
              return (
                <div key={i} className="relative group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-subtle)] to-transparent flex items-center justify-center">
                        <span className="text-xs font-bold text-[var(--primary)]">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{percent.toFixed(1)}% of total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${item.value.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${percent}%`,
                        background: `linear-gradient(90deg, ${chartColors[i]} 0%, ${chartColors[(i + 1) % chartColors.length]} 100%)`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder="Search services or usage types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="select min-w-[140px]"
            >
              <option value="all">All Providers</option>
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
              <option value="azure">Azure</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="select min-w-[120px]"
            >
              <option value="cost">Sort by Cost</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Service</th>
                <th>Usage Type</th>
                <th>Provider</th>
                <th className="text-right">Current</th>
                <th className="text-right">Projected</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((item, idx) => {
                const percent = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
                return (
                  <tr key={idx} className="group hover:bg-[var(--surface)] transition-colors">
                    <td>
                      <MiniProgress percent={percent} color={getProviderColor(item.provider as any)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getProviderColor(item.provider as any) }}
                        />
                        <span className="font-medium">{item.serviceName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-[var(--foreground-muted)] bg-[var(--background-tertiary)] px-2 py-1 rounded">
                        {item.usageType}
                      </span>
                    </td>
                    <td>
                      <span className={clsx("badge", `cloud-${item.provider}`)}>
                        {getProviderName(item.provider as any)}
                      </span>
                    </td>
                    <td className="text-right font-bold font-mono">
                      ${item.cost.toFixed(4)}
                    </td>
                    <td className="text-right font-medium text-[var(--foreground-secondary)] font-mono">
                      ${(item.projectedCost || 0).toFixed(2)}
                    </td>
                    <td className="text-right">
                      <span className={clsx(
                        "text-sm font-medium",
                        percent > 20 ? "text-[var(--danger)]" :
                          percent > 10 ? "text-[var(--warning)]" :
                            "text-[var(--foreground-muted)]"
                      )}>
                        {percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-[var(--foreground-muted)] mx-auto mb-4" />
            <p className="text-[var(--foreground-muted)]">No services match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
