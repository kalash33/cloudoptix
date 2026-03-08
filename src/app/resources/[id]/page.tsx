"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Server,
    Cpu,
    HardDrive,
    DollarSign,
    Loader2,
    CheckCircle,
    Pause,
    AlertCircle,
    Lightbulb
} from "lucide-react";
import { clsx } from "clsx";
import { recommendationsApi } from "@/lib/api";
import { getProviderName, getProviderColor, formatCurrency } from "@/lib/mockData";
import { CostCard } from "@/components/CostCard";

export default function ResourceDetailPage() {
    const params = useParams();
    const id = decodeURIComponent(params.id as string);

    const [loading, setLoading] = useState(true);
    const [resource, setResource] = useState<any>(null);

    useEffect(() => {
        const fetchResource = async () => {
            try {
                const resResult = await recommendationsApi.getResources();
                if (resResult.data?.resources) {
                    const found = resResult.data.resources.find((r: any) => r.id === id);
                    setResource(found);
                }
            } catch (error) {
                console.error("Error fetching resource:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResource();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
                    <p className="text-[var(--foreground-muted)]">Loading resource details...</p>
                </div>
            </div>
        );
    }

    if (!resource) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Server className="w-12 h-12 text-[var(--foreground-muted)] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Resource Not Found</h2>
                    <p className="text-[var(--foreground-muted)] mb-6">We couldn't find the resource you're looking for.</p>
                    <Link href="/resources" className="btn btn-primary">Back to Resources</Link>
                </div>
            </div>
        );
    }

    const provider = resource.provider as "aws" | "gcp" | "azure";

    // Progress ring for utilization
    const UtilizationRing = ({ percent, color, icon: Icon, label }: { percent: number; color: string; icon: any; label: string }) => {
        const size = 120;
        const strokeWidth = 12;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke="var(--background-tertiary)" strokeWidth={strokeWidth}
                        />
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke={color} strokeWidth={strokeWidth}
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            strokeLinecap="round" className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Icon className="w-6 h-6 mb-1 text-[var(--foreground-muted)]" />
                        <span className="text-xl font-bold">{Math.round(percent)}%</span>
                    </div>
                </div>
                <span className="mt-4 text-sm font-medium text-[var(--foreground-muted)]">{label}</span>
            </div>
        );
    };

    const getUtilizationColor = (value: number) => {
        if (value < 20) return "var(--danger)";
        if (value < 50) return "var(--warning)";
        return "var(--success)";
    };

    return (
        <div className="min-h-screen animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <Link href="/resources" className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-4">
                    <ArrowLeft size={16} />
                    Back to Resources
                </Link>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${getProviderColor(provider)}20, ${getProviderColor(provider)}40)` }}>
                        <Server className="w-6 h-6" style={{ color: getProviderColor(provider) }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{resource.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={clsx("badge", provider === "aws" && "cloud-aws", provider === "gcp" && "cloud-gcp", provider === "azure" && "cloud-azure")}>
                                {getProviderName(provider)}
                            </span>
                            <span className="text-sm font-mono text-[var(--foreground-muted)] bg-[var(--surface)] px-2 py-0.5 rounded">
                                {resource.type}
                            </span>
                            <span className="text-sm text-[var(--foreground-muted)]">
                                · {resource.region}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid-dashboard mb-8">
                <CostCard
                    title="Monthly Cost"
                    value={formatCurrency(resource.cost)}
                    subtitle="estimated"
                    icon={<DollarSign className="w-5 h-5 text-[var(--primary)]" />}
                />
                <CostCard
                    title="Status"
                    value={resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
                    subtitle="current state"
                    icon={resource.status === 'running' ? <CheckCircle className="w-5 h-5 text-[var(--success)]" /> : resource.status === 'stopped' ? <Pause className="w-5 h-5 text-[var(--foreground-muted)]" /> : <AlertCircle className="w-5 h-5 text-[var(--warning)]" />}
                />
            </div>

            {/* Utilization Rings Section */}
            <div className="glass-card p-8 mb-8">
                <h3 className="text-lg font-semibold mb-8">Resource Utilization</h3>
                <div className="flex flex-wrap items-center justify-center gap-16 md:gap-32">
                    <UtilizationRing
                        percent={resource.cpuUtilization}
                        color={getUtilizationColor(resource.cpuUtilization)}
                        icon={Cpu}
                        label="Average CPU"
                    />
                    <UtilizationRing
                        percent={resource.memoryUtilization}
                        color={getUtilizationColor(resource.memoryUtilization)}
                        icon={HardDrive}
                        label="Average Memory"
                    />
                </div>
            </div>

            {/* AI Recommendation Context */}
            {resource.recommendation && (
                <div className="bg-[var(--warning-subtle)] border border-[var(--warning)]/20 rounded-xl p-6 mb-8 flex items-start gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <div className="p-3 bg-[var(--warning)]/20 rounded-lg shrink-0 mt-1">
                        <Lightbulb className="w-6 h-6 text-[var(--warning)]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--warning)] mb-2">AI Optimization Insight</h3>
                        <p className="text-[var(--foreground-secondary)] leading-relaxed">
                            {resource.recommendation}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
