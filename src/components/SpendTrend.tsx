"use client";

import { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface SpendTrendProps {
  data: {
    date: string;
    aws: number;
    gcp: number;
    azure: number;
    total: number;
    forecast?: number;
  }[];
  forecastData?: {
    date: string;
    total: number;
    forecast?: number;
  }[];
  budgetLimit?: number;
}

export const SpendTrend = memo(function SpendTrend({ data, forecastData, budgetLimit }: SpendTrendProps) {
  // Combine historical and forecast data
  const combinedData = [
    ...data.map((d) => ({ ...d, isForecast: false })),
    ...(forecastData?.map((d) => ({
      ...d,
      aws: 0,
      gcp: 0,
      azure: 0,
      isForecast: true,
    })) || []),
  ];

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Spending Trend</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Daily cloud spend with 7-day forecast
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--aws)]" />
            <span className="text-xs text-[var(--foreground-muted)]">AWS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--gcp)]" />
            <span className="text-xs text-[var(--foreground-muted)]">GCP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--azure)]" />
            <span className="text-xs text-[var(--foreground-muted)]">Azure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[var(--foreground-muted)]" style={{ borderStyle: 'dashed' }} />
            <span className="text-xs text-[var(--foreground-muted)]">Forecast</span>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={combinedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="awsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--aws)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--aws)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gcpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--gcp)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--gcp)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="azureGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--azure)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--azure)" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--glass-border)"
              vertical={false}
            />
            
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(parseISO(value), "MMM d")}
              stroke="var(--foreground-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            
            <YAxis
              tickFormatter={(value) => `$${value}`}
              stroke="var(--foreground-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && typeof label === "string") {
                  const isForecast = payload[0]?.payload?.isForecast;
                  return (
                    <div className="bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">
                        {format(parseISO(label), "MMM d, yyyy")}
                        {isForecast && (
                          <span className="ml-2 text-xs text-[var(--foreground-muted)]">
                            (Forecast)
                          </span>
                        )}
                      </p>
                      <div className="space-y-1">
                        {payload.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-8 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-[var(--foreground-muted)]">
                                {entry.name === "forecast" ? "Total" : entry.name?.toString().toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">
                              ${(entry.value as number).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Budget reference line */}
            {budgetLimit && (
              <ReferenceLine
                y={budgetLimit}
                stroke="var(--danger)"
                strokeDasharray="5 5"
                label={{
                  value: `Budget: $${budgetLimit}`,
                  position: "insideTopRight",
                  fill: "var(--danger)",
                  fontSize: 12,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="azure"
              stackId="1"
              stroke="var(--azure)"
              fill="url(#azureGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="gcp"
              stackId="1"
              stroke="var(--gcp)"
              fill="url(#gcpGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="aws"
              stackId="1"
              stroke="var(--aws)"
              fill="url(#awsGradient)"
              strokeWidth={2}
            />
            
            {/* Forecast line */}
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="var(--foreground-muted)"
              strokeDasharray="5 5"
              fill="none"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
