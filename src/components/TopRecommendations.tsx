"use client";

import { ArrowRight, Zap, Clock, Shield } from "lucide-react";
import { clsx } from "clsx";
import { getProviderName, formatCurrency } from "@/lib/mockData";
import Link from "next/link";

interface Recommendation {
  id: string;
  type: "rightsizing" | "service-switch" | "commitment" | "unused" | "migration";
  title: string;
  description: string;
  provider: "aws" | "gcp" | "azure";
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercent: number;
  effort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  category: string;
}

interface TopRecommendationsProps {
  recommendations: Recommendation[];
  limit?: number;
}

export function TopRecommendations({
  recommendations,
  limit = 4,
}: TopRecommendationsProps) {
  const topRecs = recommendations
    .sort((a, b) => b.savings - a.savings)
    .slice(0, limit);

  const totalSavings = topRecs.reduce((sum, r) => sum + r.savings, 0);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--success-subtle)]">
            <Zap className="w-5 h-5 text-[var(--success)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Top Recommendations</h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              Save {formatCurrency(totalSavings)}/mo with these actions
            </p>
          </div>
        </div>
        <Link href="/recommendations" className="btn btn-ghost text-sm">
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {topRecs.map((rec) => (
          <RecommendationRow key={rec.id} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}

function RecommendationRow({ recommendation }: { recommendation: Recommendation }) {
  const typeColors = {
    rightsizing: "bg-[var(--info-subtle)] text-[var(--info)]",
    "service-switch": "bg-[var(--primary-subtle)] text-[var(--primary)]",
    commitment: "bg-[var(--warning-subtle)] text-[var(--warning)]",
    unused: "bg-[var(--danger-subtle)] text-[var(--danger)]",
    migration: "bg-[var(--chart-4)]/15 text-[var(--chart-4)]",
  };

  const effortIcons = {
    low: { icon: Zap, label: "Quick Win", color: "text-[var(--success)]" },
    medium: { icon: Clock, label: "Moderate", color: "text-[var(--warning)]" },
    high: { icon: Shield, label: "Complex", color: "text-[var(--danger)]" },
  };

  const effort = effortIcons[recommendation.effort];
  const EffortIcon = effort.icon;

  return (
    <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 transition-all cursor-pointer group">
      <div className="flex items-start gap-4">
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

          <h4 className="font-medium text-sm mb-1 group-hover:text-[var(--primary)] transition-colors">
            {recommendation.title}
          </h4>

          <p className="text-xs text-[var(--foreground-muted)] line-clamp-1">
            {recommendation.description}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-[var(--success)]">
            {formatCurrency(recommendation.savings)}
            <span className="text-sm font-normal">/mo</span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <EffortIcon className={clsx("w-3 h-3", effort.color)} />
            <span className={clsx("text-xs", effort.color)}>{effort.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
