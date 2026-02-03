"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

interface CostCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  sparklineData?: number[];
}

export function CostCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  variant = "default",
  sparklineData,
}: CostCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return "";
    // For costs, down is good (green), up is bad (red)
    if (trend < 0) return "text-[var(--success)]";
    if (trend > 0) return "text-[var(--danger)]";
    return "text-[var(--foreground-muted)]";
  };

  const variantStyles = {
    default: "border-[var(--glass-border)]",
    success: "border-[var(--success)]/30 bg-[var(--success-subtle)]",
    warning: "border-[var(--warning)]/30 bg-[var(--warning-subtle)]",
    danger: "border-[var(--danger)]/30 bg-[var(--danger-subtle)]",
  };

  return (
    <div
      className={clsx(
        "glass-card p-6 animate-fade-in",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-[var(--foreground-muted)] mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-[var(--foreground)]">
              {value}
            </h3>
            {subtitle && (
              <span className="text-sm text-[var(--foreground-muted)]">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-[var(--primary-subtle)]">
            {icon}
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-12 mb-4">
          <Sparkline data={sparklineData} />
        </div>
      )}

      {/* Trend */}
      {trend !== undefined && (
        <div className={clsx("flex items-center gap-1.5 text-sm", getTrendColor())}>
          {getTrendIcon()}
          <span className="font-medium">
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
          {trendLabel && (
            <span className="text-[var(--foreground-muted)]">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Simple sparkline component using SVG
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="sparklineGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#sparklineGradient)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
