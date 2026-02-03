"use client";

import { memo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getProviderColor, getProviderName } from "@/lib/mockData";

interface CloudBreakdownProps {
  data: {
    provider: "aws" | "gcp" | "azure";
    cost: number;
  }[];
}

export const CloudBreakdown = memo(function CloudBreakdown({ data }: CloudBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.cost, 0);

  const chartData = data.map((item) => ({
    name: getProviderName(item.provider),
    value: item.cost,
    color: getProviderColor(item.provider),
    provider: item.provider,
    percent: ((item.cost / total) * 100).toFixed(1),
  }));

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-6">Cloud Spend Distribution</h3>
      
      <div className="flex items-center gap-8">
        {/* Chart */}
        <div className="w-48 h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium">{data.name}</p>
                        <p className="text-sm text-[var(--foreground-muted)]">
                          ${data.value.toLocaleString()} ({data.percent}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-[var(--foreground-muted)]">Total</span>
            <span className="text-xl font-bold">
              ${(total / 1000).toFixed(1)}k
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-4">
          {chartData.map((item) => (
            <div key={item.provider} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm font-semibold">
                    ${item.value.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-[var(--foreground-muted)] w-12 text-right">
                    {item.percent}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
