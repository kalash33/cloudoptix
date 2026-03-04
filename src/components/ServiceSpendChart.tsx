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
} from "recharts";
import { format, parseISO } from "date-fns";
import { getProviderColor } from "@/lib/mockData";

interface ServiceSpendChartProps {
    data: { date: string; cost: number }[];
    provider: "aws" | "gcp" | "azure";
    serviceName: string;
}

export const ServiceSpendChart = memo(function ServiceSpendChart({
    data,
    provider,
    serviceName,
}: ServiceSpendChartProps) {
    const color = getProviderColor(provider);

    // Calculate stats
    const totalCost = data.reduce((sum, d) => sum + d.cost, 0);
    const avgCost = data.length > 0 ? totalCost / data.length : 0;
    const maxCost = data.length > 0 ? Math.max(...data.map((d) => d.cost)) : 0;
    const minCost = data.length > 0 ? Math.min(...data.map((d) => d.cost)) : 0;

    return (
        <div className="glass-card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold">Service Spending Trend</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">
                        Daily cost for this service
                    </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                        <div className="text-[var(--foreground-muted)] text-xs">Avg/day</div>
                        <div className="font-semibold">${avgCost.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[var(--foreground-muted)] text-xs">Peak</div>
                        <div className="font-semibold">${maxCost.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[var(--foreground-muted)] text-xs">Low</div>
                        <div className="font-semibold">${minCost.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-[var(--foreground-muted)]">
                            {provider.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-[300px]">
                {data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[var(--foreground-muted)]">
                        No cost data available for this period
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="serviceGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
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
                                        return (
                                            <div className="bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 shadow-lg">
                                                <p className="text-sm font-medium mb-1">
                                                    {format(parseISO(label), "MMM d, yyyy")}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    <span className="text-[var(--foreground-muted)]">Cost</span>
                                                    <span className="font-semibold ml-auto">
                                                        ${(payload[0].value as number).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="cost"
                                stroke={color}
                                fill="url(#serviceGradient)"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 2, fill: "var(--background)" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
});
