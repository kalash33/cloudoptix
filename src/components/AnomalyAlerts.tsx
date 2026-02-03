"use client";

import { AlertTriangle, TrendingUp, Clock, X, Check } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow, parseISO } from "date-fns";
import { getProviderName } from "@/lib/mockData";

interface Anomaly {
  id: string;
  type: "spike" | "gradual" | "unusual";
  service: string;
  provider: "aws" | "gcp" | "azure";
  amount: number;
  percentIncrease: number;
  detectedAt: string;
  status: "active" | "resolved" | "acknowledged";
}

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
}

export function AnomalyAlerts({ anomalies }: AnomalyAlertsProps) {
  const activeAnomalies = anomalies.filter((a) => a.status !== "resolved");

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--warning-subtle)]">
            <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Cost Anomalies</h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              {activeAnomalies.length} active alert{activeAnomalies.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button className="btn btn-ghost text-sm">View All</button>
      </div>

      <div className="space-y-3">
        {activeAnomalies.length === 0 ? (
          <div className="py-8 text-center">
            <Check className="w-12 h-12 mx-auto text-[var(--success)] mb-3" />
            <p className="text-[var(--foreground-secondary)]">
              No active anomalies detected
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">
              Your cloud spending is within normal patterns
            </p>
          </div>
        ) : (
          activeAnomalies.map((anomaly) => (
            <AnomalyCard key={anomaly.id} anomaly={anomaly} />
          ))
        )}
      </div>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const typeConfig = {
    spike: {
      icon: TrendingUp,
      label: "Sudden Spike",
      color: "text-[var(--danger)]",
      bg: "bg-[var(--danger-subtle)]",
    },
    gradual: {
      icon: TrendingUp,
      label: "Gradual Increase",
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-subtle)]",
    },
    unusual: {
      icon: AlertTriangle,
      label: "Unusual Pattern",
      color: "text-[var(--info)]",
      bg: "bg-[var(--info-subtle)]",
    },
  };

  const config = typeConfig[anomaly.type];
  const Icon = config.icon;

  const statusConfig = {
    active: { label: "Active", color: "badge-danger" },
    acknowledged: { label: "Acknowledged", color: "badge-warning" },
    resolved: { label: "Resolved", color: "badge-success" },
  };

  return (
    <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--foreground-muted)]/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className={clsx("p-2 rounded-lg", config.bg)}>
          <Icon className={clsx("w-4 h-4", config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx("badge", statusConfig[anomaly.status].color)}>
              {statusConfig[anomaly.status].label}
            </span>
            <span className="text-xs text-[var(--foreground-muted)]">
              {getProviderName(anomaly.provider)}
            </span>
          </div>
          
          <h4 className="font-medium text-sm mb-1">{anomaly.service}</h4>
          
          <div className="flex items-center gap-4 text-sm">
            <span className={clsx("font-semibold", config.color)}>
              +${anomaly.amount.toFixed(2)}
            </span>
            <span className="text-[var(--foreground-muted)]">
              ({anomaly.percentIncrease}% increase)
            </span>
          </div>
          
          <div className="flex items-center gap-1 mt-2 text-xs text-[var(--foreground-muted)]">
            <Clock className="w-3 h-3" />
            <span>
              Detected {formatDistanceToNow(parseISO(anomaly.detectedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
            <Check className="w-4 h-4 text-[var(--foreground-muted)]" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
            <X className="w-4 h-4 text-[var(--foreground-muted)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
