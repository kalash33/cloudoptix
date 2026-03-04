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
import { Cpu, MemoryStick, Wifi, HardDrive } from "lucide-react";

interface UtilizationMetricsProps {
    metrics: {
        cpu: { avg: number; peak: number; unit: string };
        memory: { avg: number; peak: number; unit: string };
        networkIn: { value: number; unit: string };
        networkOut: { value: number; unit: string };
        diskReadIOPS: { value: number; unit: string };
        diskWriteIOPS: { value: number; unit: string };
    };
    dailyTrend: Array<{
        date: string;
        cpu: number;
        memory: number;
        network: number;
        diskIO: number;
    }>;
}

function getStatusColor(value: number): string {
    if (value < 30) return "var(--success)";
    if (value < 60) return "var(--warning)";
    return "var(--danger)";
}

function getStatusLabel(value: number): string {
    if (value < 30) return "Underutilized";
    if (value < 60) return "Moderate";
    return "High";
}

// Circular gauge component
function CircularGauge({
    value,
    label,
    sublabel,
    icon,
    size = 100,
}: {
    value: number;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    size?: number;
}) {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value, 100);
    const offset = circumference - (progress / 100) * circumference;
    const color = getStatusColor(value);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background circle */}
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="var(--background-tertiary)"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color }}>{value}%</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-xs text-[var(--foreground-muted)]">{sublabel}</span>
            <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                    backgroundColor: `${color}20`,
                    color,
                }}
            >
                {getStatusLabel(value)}
            </span>
        </div>
    );
}

export const UtilizationMetrics = memo(function UtilizationMetrics({
    metrics,
    dailyTrend,
}: UtilizationMetricsProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Gauges */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-6">Resource Utilization</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
                    <CircularGauge
                        value={metrics.cpu.avg}
                        label="CPU"
                        sublabel={`Peak: ${metrics.cpu.peak}%`}
                        icon={<Cpu className="w-4 h-4 text-[var(--foreground-muted)]" />}
                    />
                    <CircularGauge
                        value={metrics.memory.avg}
                        label="Memory"
                        sublabel={`Peak: ${metrics.memory.peak}%`}
                        icon={<MemoryStick className="w-4 h-4 text-[var(--foreground-muted)]" />}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-[100px] h-[100px] rounded-full border-[8px] border-[var(--background-tertiary)] flex items-center justify-center relative">
                            <div className="text-center">
                                <div className="text-lg font-bold text-[var(--info)]">
                                    {metrics.networkIn.value + metrics.networkOut.value}
                                </div>
                                <div className="text-[10px] text-[var(--foreground-muted)]">GB</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Wifi className="w-4 h-4 text-[var(--foreground-muted)]" />
                            <span className="text-sm font-medium">Network</span>
                        </div>
                        <span className="text-xs text-[var(--foreground-muted)]">
                            ↓{metrics.networkIn.value} / ↑{metrics.networkOut.value} GB
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-[100px] h-[100px] rounded-full border-[8px] border-[var(--background-tertiary)] flex items-center justify-center relative">
                            <div className="text-center">
                                <div className="text-lg font-bold text-[var(--primary)]">
                                    {((metrics.diskReadIOPS.value + metrics.diskWriteIOPS.value) / 1000).toFixed(1)}K
                                </div>
                                <div className="text-[10px] text-[var(--foreground-muted)]">IOPS</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <HardDrive className="w-4 h-4 text-[var(--foreground-muted)]" />
                            <span className="text-sm font-medium">Disk I/O</span>
                        </div>
                        <span className="text-xs text-[var(--foreground-muted)]">
                            R: {metrics.diskReadIOPS.value.toLocaleString()} / W: {metrics.diskWriteIOPS.value.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Utilization Trends — 4 individual charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([
                    { key: "cpu", label: "CPU Utilization", color: "#3b82f6", unit: "%", icon: <Cpu className="w-4 h-4" style={{ color: "#3b82f6" }} /> },
                    { key: "memory", label: "Memory Utilization", color: "#10b981", unit: "%", icon: <MemoryStick className="w-4 h-4" style={{ color: "#10b981" }} /> },
                    { key: "network", label: "Network I/O", color: "#f59e0b", unit: " GB", icon: <Wifi className="w-4 h-4" style={{ color: "#f59e0b" }} /> },
                    { key: "diskIO", label: "Disk I/O", color: "#a855f7", unit: " IOPS", icon: <HardDrive className="w-4 h-4" style={{ color: "#a855f7" }} /> },
                ] as const).map((metric) => (
                    <div key={metric.key} className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-1">
                            {metric.icon}
                            <h4 className="text-sm font-semibold">{metric.label}</h4>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] mb-3">Utilization trend</p>
                        <div className="h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={metric.color} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
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
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tickFormatter={(value) =>
                                            metric.unit === "%" ? `${value}%` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`
                                        }
                                        stroke="var(--foreground-muted)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        width={40}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length && typeof label === "string") {
                                                return (
                                                    <div className="bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-2 shadow-lg">
                                                        <p className="text-xs font-medium mb-1">
                                                            {format(parseISO(label), "MMM d, yyyy")}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }} />
                                                            <span className="font-semibold">
                                                                {payload[0].value?.toLocaleString()}{metric.unit}
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
                                        dataKey={metric.key}
                                        stroke={metric.color}
                                        fill={`url(#grad-${metric.key})`}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
