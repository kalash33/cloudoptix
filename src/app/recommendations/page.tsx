"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Zap,
  Clock,
  Shield,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  Check,
  X,
  ExternalLink,
  CloudOff,
  Plus,
  Loader2,
  Sparkles,
  Brain,
  ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { accountsApi, recommendationsApi, chatApi } from "@/lib/api";
import {
  formatCurrency,
  getProviderName,
  getProviderColor,
} from "@/lib/mockData";

type RecommendationType =
  | "all"
  | "rightsizing"
  | "service-switch"
  | "commitment"
  | "unused"
  | "migration";

type SortOption = "savings" | "effort" | "risk";

interface Recommendation {
  id: string;
  _id: string; // From MongoDB Backend
  type: string;
  title: string;
  description: string;
  provider: "aws" | "gcp" | "azure";
  category: string;
  service?: string;
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercent: number;
  effort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  actionable: boolean;
  implementationSteps?: string[];
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<RecommendationType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("savings");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentSpend, setCurrentSpend] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<Array<{
    title: string; description: string; category: string;
    impact: string; estimatedSavings: string; action: string;
  }>>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for connected accounts
        const accountsResult = await accountsApi.getAll();
        const accountsExist = !!(accountsResult.data?.accounts && accountsResult.data.accounts.length > 0);
        setHasAccounts(accountsExist);

        if (!accountsExist) {
          setLoading(false);
          return;
        }

        const result = await recommendationsApi.getAll();
        if (result.data?.recommendations) {
          setRecommendations(result.data.recommendations.map((r: any) => ({
            ...r,
            category: r.type,
            actionable: true,
          })));
          if (result.data.summary?.currentSpend) {
            setCurrentSpend(result.data.summary.currentSpend);
          }
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefresh = async () => {
    setGenerating(true);
    try {
      await recommendationsApi.generate();
      // Refetch recommendations after generation
      const result = await recommendationsApi.getAll();
      if (result.data?.recommendations) {
        setRecommendations(result.data.recommendations.map((r: any) => ({
          ...r,
          category: r.type,
          actionable: true,
        })));
        if (result.data.summary?.currentSpend) {
          setCurrentSpend(result.data.summary.currentSpend);
        }
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setGenerating(false);
    }
  };

  const typeFilters = [
    { id: "all", label: "All", count: recommendations.length },
    {
      id: "rightsizing",
      label: "Rightsizing",
      count: recommendations.filter((r) => r.type === "rightsizing").length,
    },
    {
      id: "service-switch",
      label: "Service Switch",
      count: recommendations.filter((r) => r.type === "service-switch").length,
    },
    {
      id: "unused",
      label: "Unused Resources",
      count: recommendations.filter((r) => r.type === "unused").length,
    },
    {
      id: "commitment",
      label: "Commitments",
      count: recommendations.filter((r) => r.type === "commitment").length,
    },
    {
      id: "migration",
      label: "Migration",
      count: recommendations.filter((r) => r.type === "migration").length,
    },
  ];

  const filteredRecs =
    selectedType === "all"
      ? recommendations
      : recommendations.filter((r) => r.type === selectedType);

  const sortedRecs = [...filteredRecs].sort((a, b) => {
    switch (sortBy) {
      case "savings":
        return b.savings - a.savings;
      case "effort":
        const effortOrder = { low: 0, medium: 1, high: 2 };
        return effortOrder[a.effort] - effortOrder[b.effort];
      case "risk":
        const riskOrder = { low: 0, medium: 1, high: 2 };
        return riskOrder[a.risk] - riskOrder[b.risk];
      default:
        return 0;
    }
  });

  const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);
  const filteredSavings = filteredRecs.reduce((sum, r) => sum + r.savings, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  // Empty state when no accounts connected
  if (!hasAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">No Recommendations Yet</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account to receive AI-powered cost optimization recommendations.
          </p>
          <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Cloud Account
          </Link>
        </div>
      </div>
    );
  }

  // Empty state when no recommendations exist
  if (recommendations.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Recommendations</h1>
            <p className="text-[var(--foreground-muted)]">
              Smart suggestions to optimize your cloud spend
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleRefresh} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Recommendations"}
          </button>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[var(--success-subtle)] border border-[var(--success)]/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[var(--success)]" />
            </div>
            <h2 className="text-xl font-bold mb-3">No Recommendations Found</h2>
            <p className="text-[var(--foreground-muted)]">
              Click "Generate Recommendations" to analyze your cloud usage and get AI-powered optimization suggestions.
            </p>
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
          <h1 className="text-3xl font-bold mb-2">AI Recommendations</h1>
          <p className="text-[var(--foreground-muted)]">
            Smart suggestions to optimize your cloud spend
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={handleRefresh}
            disabled={generating}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showAiPanel && (
        <div className="mb-8 glass-card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20">
                <Brain className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="font-semibold">AI Cost Analysis</h3>
                {aiScore !== null && (
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Optimization score: <span className={`font-bold ${aiScore >= 70 ? 'text-[var(--success)]' : aiScore >= 40 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>{aiScore}/100</span>
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
              <X className="w-4 h-4 text-[var(--foreground-muted)]" />
            </button>
          </div>
          <div className="px-4 pb-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                <span className="ml-3 text-[var(--foreground-muted)]">Running AI analysis on your cloud data...</span>
              </div>
            ) : (
              <>
                {aiSummary && (
                  <p className="text-sm text-[var(--foreground-muted)] mb-4 p-3 rounded-lg bg-[var(--surface)]">
                    {aiSummary}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiInsights.map((insight, i) => {
                    const impactColors: Record<string, string> = {
                      high: 'border-[var(--danger)]/30 bg-[var(--danger)]/5',
                      medium: 'border-[var(--warning)]/30 bg-[var(--warning)]/5',
                      low: 'border-[var(--success)]/30 bg-[var(--success)]/5',
                    };
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${impactColors[insight.impact] || 'border-[var(--glass-border)]'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--surface)] font-medium capitalize">
                            {insight.category}
                          </span>
                          <span className={`text-xs font-medium capitalize ${insight.impact === 'high' ? 'text-[var(--danger)]' :
                            insight.impact === 'medium' ? 'text-[var(--warning)]' : 'text-[var(--success)]'
                            }`}>
                            {insight.impact} impact
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold mb-1">{insight.title}</h4>
                        <p className="text-xs text-[var(--foreground-muted)] mb-2">{insight.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--success)] font-medium">{insight.estimatedSavings}</span>
                          <span className="text-xs text-[var(--primary)]">{insight.action}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[var(--success-subtle)]">
              <TrendingDown className="w-6 h-6 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Total Potential Savings
              </p>
              <p className="text-2xl font-bold text-[var(--success)]">
                {formatCurrency(totalSavings)}/mo
              </p>
            </div>
          </div>
          <div className="text-sm text-[var(--foreground-muted)]">
            {((totalSavings / (currentSpend || 1)) * 100).toFixed(0)}% of current monthly spend
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[var(--primary-subtle)]">
              <Lightbulb className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Active Recommendations
              </p>
              <p className="text-2xl font-bold">{recommendations.length}</p>
            </div>
          </div>
          <div className="text-sm text-[var(--foreground-muted)]">
            {recommendations.filter((r) => r.effort === "low").length} quick wins
            available
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[var(--warning-subtle)]">
              <Zap className="w-6 h-6 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-muted)]">
                One-Click Actions
              </p>
              <p className="text-2xl font-bold">
                {recommendations.filter((r) => r.actionable).length}
              </p>
            </div>
          </div>
          <div className="text-sm text-[var(--foreground-muted)]">
            Automatable optimizations ready
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--foreground-muted)]" />
          {typeFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedType(filter.id as RecommendationType)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                selectedType === filter.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {filter.label}
              <span className="ml-1.5 text-xs opacity-70">({filter.count})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[var(--foreground-muted)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="select w-40"
          >
            <option value="savings">Highest Savings</option>
            <option value="effort">Lowest Effort</option>
            <option value="risk">Lowest Risk</option>
          </select>
        </div>
      </div>

      {/* Filtered savings summary */}
      {selectedType !== "all" && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
          <p className="text-sm">
            <span className="text-[var(--foreground-muted)]">
              Showing {filteredRecs.length} recommendations with potential savings of{" "}
            </span>
            <span className="font-semibold text-[var(--success)]">
              {formatCurrency(filteredSavings)}/mo
            </span>
          </p>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-4">
        {sortedRecs.map((rec) => (
          <RecommendationCard
            key={rec._id}
            recommendation={rec}
            isExpanded={expandedId === rec._id}
            onToggle={() => setExpandedId(expandedId === rec._id ? null : rec._id)}
            onViewResource={() => {
              if (rec.service) {
                router.push(`/services/${encodeURIComponent(rec.service)}`);
              }
            }}
            onDismiss={async () => {
              try {
                await recommendationsApi.updateStatus(rec._id, 'dismissed');
                setRecommendations(prev => prev.filter(r => r._id !== rec._id));
              } catch (e) {
                console.error("Failed to dismiss", e);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  isExpanded: boolean;
  onToggle: () => void;
  onViewResource: () => void;
  onDismiss: () => void;
}

function RecommendationCard({
  recommendation,
  isExpanded,
  onToggle,
  onViewResource,
  onDismiss,
}: RecommendationCardProps) {
  const [showFixGuide, setShowFixGuide] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const typeColors: Record<string, string> = {
    rightsizing: "bg-[var(--info-subtle)] text-[var(--info)]",
    "service-switch": "bg-[var(--primary-subtle)] text-[var(--primary)]",
    commitment: "bg-[var(--warning-subtle)] text-[var(--warning)]",
    unused: "bg-[var(--danger-subtle)] text-[var(--danger)]",
    migration: "bg-[var(--chart-4)]/15 text-[var(--chart-4)]",
  };

  const effortConfig = {
    low: { icon: Zap, label: "Quick Win", color: "text-[var(--success)]" },
    medium: { icon: Clock, label: "Moderate", color: "text-[var(--warning)]" },
    high: { icon: Shield, label: "Complex", color: "text-[var(--danger)]" },
  };

  const riskConfig = {
    low: { label: "Low Risk", color: "text-[var(--success)]" },
    medium: { label: "Medium Risk", color: "text-[var(--warning)]" },
    high: { label: "High Risk", color: "text-[var(--danger)]" },
  };

  const effort = effortConfig[recommendation.effort];
  const risk = riskConfig[recommendation.risk];
  const EffortIcon = effort.icon;

  const steps = recommendation.implementationSteps && recommendation.implementationSteps.length > 0
    ? recommendation.implementationSteps
    : [
      'Review current resource configuration and usage patterns',
      'Schedule maintenance window for the change',
      'Apply the recommended configuration change',
      'Monitor performance for 24-48 hours',
    ];

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div
        className="p-6 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-1 h-16 rounded-full shrink-0"
            style={{ backgroundColor: getProviderColor(recommendation.provider) }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={clsx(
                  "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                  typeColors[recommendation.type]
                )}
              >
                {recommendation.type.replace("-", " ")}
              </span>
              <span className="text-xs text-[var(--foreground-muted)]">
                {getProviderName(recommendation.provider)} • {recommendation.category}
              </span>
            </div>

            <h3 className="text-lg font-semibold mb-2">{recommendation.title}</h3>

            <p className="text-sm text-[var(--foreground-muted)]">
              {recommendation.description}
            </p>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1">
                <EffortIcon className={clsx("w-4 h-4", effort.color)} />
                <span className={clsx("text-sm", effort.color)}>{effort.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className={clsx("w-4 h-4", risk.color)} />
                <span className={clsx("text-sm", risk.color)}>{risk.label}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-[var(--success)]">
              {formatCurrency(recommendation.savings)}
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">
              {recommendation.savingsPercent}% savings
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 text-xs text-[var(--foreground-muted)]">
              {formatCurrency(recommendation.currentCost)}
              <ArrowRight className="w-3 h-3" />
              {formatCurrency(recommendation.projectedCost)}
            </div>
          </div>

          <ChevronRight
            className={clsx(
              "w-5 h-5 text-[var(--foreground-muted)] transition-transform shrink-0",
              isExpanded && "rotate-90"
            )}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-0 border-t border-[var(--glass-border)]">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Implementation Steps</h4>
              <ol className="space-y-2 text-sm">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Cost Impact</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground-muted)]">Current Cost</span>
                  <span className="font-medium">{formatCurrency(recommendation.currentCost)}/mo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground-muted)]">Projected Cost</span>
                  <span className="font-medium text-[var(--success)]">{formatCurrency(recommendation.projectedCost)}/mo</span>
                </div>
                <div className="h-px bg-[var(--glass-border)]" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground-muted)]">Annual Savings</span>
                  <span className="font-bold text-[var(--success)]">{formatCurrency(recommendation.savings * 12)}/year</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--glass-border)]">
            <button className="btn btn-ghost" onClick={onDismiss}>
              <X className="w-4 h-4" />
              Dismiss
            </button>
            <button className="btn btn-secondary" onClick={onViewResource}>
              <ExternalLink className="w-4 h-4" />
              View Resource
            </button>
            <button
              className={clsx("btn", showFixGuide ? "btn-secondary" : "btn-primary")}
              onClick={() => setShowFixGuide(!showFixGuide)}
            >
              <Check className="w-4 h-4" />
              {showFixGuide ? "Hide Guide" : "Fix Now"}
            </button>
          </div>

          {showFixGuide && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-[var(--primary)]" />
                <h4 className="font-semibold">Implementation Guide</h4>
                <span className="text-xs text-[var(--foreground-muted)] ml-auto">
                  {completedSteps.size}/{steps.length} steps completed
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[var(--glass-border)] mb-4">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
                />
              </div>

              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className={clsx(
                      "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      completedSteps.has(i)
                        ? "bg-[var(--success-subtle)]"
                        : "hover:bg-[var(--surface-hover)]"
                    )}
                    onClick={() => toggleStep(i)}
                  >
                    <div className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors",
                      completedSteps.has(i)
                        ? "bg-[var(--success)] border-[var(--success)] text-white"
                        : "border-[var(--foreground-muted)]"
                    )}>
                      {completedSteps.has(i) && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={clsx(
                      "text-sm pt-0.5",
                      completedSteps.has(i) && "line-through text-[var(--foreground-muted)]"
                    )}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              {completedSteps.size === steps.length && (
                <div className="mt-4 p-3 rounded-lg bg-[var(--success-subtle)] border border-[var(--success)]/20 text-center">
                  <p className="text-sm font-medium text-[var(--success)]">
                    🎉 All steps completed! This optimization has been implemented.
                  </p>
                  <button className="btn btn-ghost text-xs mt-2" onClick={onDismiss}>
                    Mark as Applied & Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
