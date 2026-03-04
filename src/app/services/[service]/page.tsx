"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    DollarSign,
    TrendingDown,
    Server,
    Lightbulb,
    Loader2,
    Calendar,
    BarChart3,
    CalendarDays,
    Zap,
    Clock,
    Shield,
    ChevronDown,
    Check,
    ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import { costsApi, recommendationsApi } from "@/lib/api";
import { getProviderName, getProviderColor, formatCurrency } from "@/lib/mockData";
import { ServiceSpendChart } from "@/components/ServiceSpendChart";
import { UtilizationMetrics } from "@/components/UtilizationMetrics";
import { CostCard } from "@/components/CostCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DateRangeOption = 'today' | 'thisWeek' | 'thisMonth' | '30days' | '90days' | '6months' | '1year' | 'custom';

export default function ServiceDetailPage() {
    const params = useParams();
    const serviceName = decodeURIComponent(params.service as string);

    const [loading, setLoading] = useState(true);
    const [serviceCost, setServiceCost] = useState(0);
    const [servicePercent, setServicePercent] = useState(0);
    const [serviceProvider, setServiceProvider] = useState<string>("aws");
    const [serviceDailyCosts, setServiceDailyCosts] = useState<Array<{ date: string; cost: number }>>([]);
    const [recommendations, setRecommendations] = useState<Array<any>>([]);
    const [expandedRecId, setExpandedRecId] = useState<string | null>(null);
    const [totalCost, setTotalCost] = useState(0);
    const [allServices, setAllServices] = useState<Array<{ service: string; provider: string; cost: number }>>([]);
    const [utilization, setUtilization] = useState<{
        metrics: any;
        dailyTrend: any[];
    } | null>(null);

    // Date filter state
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeOption>('30days');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

    const getDateRange = () => {
        const end = new Date();
        let start = new Date();

        switch (dateRangeFilter) {
            case 'today': break;
            case 'thisWeek': {
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                break;
            }
            case 'thisMonth': start.setDate(1); break;
            case '90days': start.setDate(start.getDate() - 90); break;
            case '6months': start.setMonth(start.getMonth() - 6); break;
            case '1year': start.setFullYear(start.getFullYear() - 1); break;
            case 'custom':
                if (customDateRange.start && customDateRange.end) {
                    start = new Date(customDateRange.start);
                    end.setTime(new Date(customDateRange.end).getTime());
                }
                break;
            default: start.setDate(start.getDate() - 30);
        }

        const fmt = (d: Date) => d.toISOString().split('T')[0];
        return { startDate: fmt(start), endDate: fmt(end) };
    };

    const getFilterLabel = () => {
        switch (dateRangeFilter) {
            case 'today': return 'today';
            case 'thisWeek': return 'this week';
            case 'thisMonth': return 'this month';
            case '30days': return 'last 30 days';
            case '90days': return 'last 90 days';
            case '6months': return 'last 6 months';
            case '1year': return 'last year';
            case 'custom': return customDateRange.start && customDateRange.end
                ? `${customDateRange.start} to ${customDateRange.end}` : 'custom range';
            default: return 'selected period';
        }
    };

    useEffect(() => {
        if (dateRangeFilter === 'custom' && (!customDateRange.start || !customDateRange.end)) return;
        fetchServiceData();
    }, [serviceName, dateRangeFilter, customDateRange.start, customDateRange.end]);

    const fetchServiceData = async () => {
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();

            // Fetch all services to find this one and get related services
            const servicesResult = await costsApi.getServices();
            if (servicesResult.data?.data) {
                const services = servicesResult.data.data;
                setAllServices(services);
                const total = services.reduce((sum, s) => sum + s.cost, 0);
                setTotalCost(total);

                const matched = services.find(
                    (s) => s.service === serviceName || s.service.startsWith(serviceName)
                );
                if (matched) {
                    setServiceCost(matched.cost);
                    setServiceProvider(matched.provider);
                    setServicePercent(total > 0 ? (matched.cost / total) * 100 : 0);
                }
            }

            // Fetch service-specific daily costs
            const dailyResult = await costsApi.getServiceDaily(serviceName, startDate, endDate);
            if (dailyResult.data?.data) {
                setServiceDailyCosts(dailyResult.data.data);
            }

            // Fetch utilization metrics
            const utilResult = await costsApi.getServiceUtilization(serviceName, startDate, endDate);
            if (utilResult.data) {
                setUtilization({
                    metrics: utilResult.data.metrics,
                    dailyTrend: utilResult.data.dailyTrend,
                });
            }

            // Fetch recommendations
            const recsResult = await recommendationsApi.getAll();
            if (recsResult.data?.recommendations) {
                const svcLower = serviceName.toLowerCase();
                const matchedRecs = recsResult.data.recommendations.filter((r: any) => {
                    const combined = `${r.title} ${r.description} ${r.type} ${r.service || ''}`.toLowerCase();
                    const recService = (r.service || '').toLowerCase();
                    return (
                        combined.includes(svcLower) ||
                        svcLower.includes(recService) ||
                        svcLower.includes(r.type?.toLowerCase() || "")
                    );
                });

                setRecommendations(
                    matchedRecs.map((r: any) => ({
                        id: r.id || r._id,
                        type: r.type,
                        title: r.title,
                        description: r.description,
                        provider: r.provider,
                        service: r.service,
                        currentCost: r.currentCost,
                        projectedCost: r.projectedCost,
                        savings: r.savings,
                        savingsPercent: r.savingsPercent,
                        effort: r.effort,
                        risk: r.risk,
                        category: r.type,
                        implementationSteps: r.implementationSteps || [],
                    }))
                );
            }
        } catch (error) {
            console.error("Error fetching service data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Compute savings for this service from recommendations
    const totalSavings = useMemo(
        () => recommendations.reduce((sum, r) => sum + (r.savings || 0), 0),
        [recommendations]
    );

    // Get related services (same provider)
    const relatedServices = useMemo(() => {
        return allServices
            .filter(
                (s) =>
                    s.provider === serviceProvider &&
                    s.service !== serviceName
            )
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);
    }, [allServices, serviceProvider, serviceName]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
                    <p className="text-[var(--foreground-muted)]">
                        Loading service details...
                    </p>
                </div>
            </div>
        );
    }

    const provider = serviceProvider as "aws" | "gcp" | "azure";

    return (
        <div className="min-h-screen animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </Link>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{
                                background: `linear-gradient(135deg, ${getProviderColor(provider)}20, ${getProviderColor(provider)}40)`,
                            }}
                        >
                            <BarChart3
                                className="w-6 h-6"
                                style={{ color: getProviderColor(provider) }}
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{serviceName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className={clsx(
                                        "badge",
                                        provider === "aws" && "cloud-aws",
                                        provider === "gcp" && "cloud-gcp",
                                        provider === "azure" && "cloud-azure"
                                    )}
                                >
                                    {getProviderName(provider)}
                                </span>
                                <span className="text-sm text-[var(--foreground-muted)]">
                                    · {servicePercent.toFixed(1)}% of total spend · {getFilterLabel()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Date Range Picker */}
                    <div className="flex items-center gap-3">
                        {dateRangeFilter === 'custom' && (
                            <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5">
                                <CalendarDays className="w-4 h-4 text-[var(--accent)] shrink-0" />
                                <input
                                    type="date"
                                    value={customDateRange.start}
                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="bg-transparent border-none text-sm focus:outline-none text-[var(--foreground)] w-[130px] [color-scheme:dark]"
                                />
                                <span className="text-[var(--foreground-muted)] text-sm">→</span>
                                <input
                                    type="date"
                                    value={customDateRange.end}
                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="bg-transparent border-none text-sm focus:outline-none text-[var(--foreground)] w-[130px] [color-scheme:dark]"
                                />
                            </div>
                        )}
                        <div className="relative flex items-center bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-md overflow-hidden hover:border-[var(--accent)] transition-colors">
                            <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as DateRangeOption)}>
                                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[var(--foreground-muted)]" />
                                        <SelectValue placeholder="Select a date" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="thisWeek">This Week</SelectItem>
                                    <SelectItem value="thisMonth">This Month</SelectItem>
                                    <SelectItem value="30days">Last 30 Days</SelectItem>
                                    <SelectItem value="90days">Last 90 Days</SelectItem>
                                    <SelectItem value="6months">Last 6 Months</SelectItem>
                                    <SelectItem value="1year">Last Year</SelectItem>
                                    <SelectItem value="custom">Custom Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid-dashboard mb-8">
                <CostCard
                    title="Service Cost"
                    value={`$${serviceCost.toLocaleString()}`}
                    subtitle="this period"
                    icon={<DollarSign className="w-5 h-5 text-[var(--primary)]" />}
                />
                <CostCard
                    title="Potential Savings"
                    value={`$${totalSavings.toLocaleString()}`}
                    subtitle="/month"
                    icon={<TrendingDown className="w-5 h-5 text-[var(--success)]" />}
                    variant="success"
                />
                <CostCard
                    title="Share of Total"
                    value={`${servicePercent.toFixed(1)}%`}
                    subtitle={`of $${totalCost.toLocaleString()}`}
                    icon={<Server className="w-5 h-5 text-[var(--info)]" />}
                />
                <CostCard
                    title="Recommendations"
                    value={recommendations.length.toString()}
                    subtitle="actions"
                    icon={<Lightbulb className="w-5 h-5 text-[var(--warning)]" />}
                />
            </div>

            {/* Service-Specific Spend Chart */}
            <div className="mb-8">
                <ServiceSpendChart
                    data={serviceDailyCosts}
                    provider={provider}
                    serviceName={serviceName}
                />
            </div>

            {/* Utilization Metrics */}
            {utilization && (
                <div className="mb-8">
                    <UtilizationMetrics
                        metrics={utilization.metrics}
                        dailyTrend={utilization.dailyTrend}
                    />
                </div>
            )}

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Service-Specific Recommendations */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-[var(--success-subtle)]">
                            <Lightbulb className="w-5 h-5 text-[var(--success)]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Recommendations</h3>
                            <p className="text-sm text-[var(--foreground-muted)]">
                                {recommendations.length > 0
                                    ? `${recommendations.length} optimization${recommendations.length > 1 ? 's' : ''} for this service`
                                    : 'No specific optimizations found'}
                            </p>
                        </div>
                    </div>

                    {recommendations.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full bg-[var(--success-subtle)] flex items-center justify-center mx-auto mb-3">
                                <Check className="w-6 h-6 text-[var(--success)]" />
                            </div>
                            <p className="text-sm text-[var(--foreground-muted)]">
                                This service looks well-optimized. No recommendations at this time.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recommendations.map((rec) => {
                                const isExpanded = expandedRecId === rec.id;
                                const typeColors: Record<string, string> = {
                                    rightsizing: 'bg-[var(--info-subtle)] text-[var(--info)]',
                                    'service-switch': 'bg-[var(--primary-subtle)] text-[var(--primary)]',
                                    commitment: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
                                    unused: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
                                    migration: 'bg-[var(--chart-4)]/15 text-[var(--chart-4)]',
                                };
                                const effortConfig: Record<string, { icon: any; label: string; color: string }> = {
                                    low: { icon: Zap, label: 'Quick Win', color: 'text-[var(--success)]' },
                                    medium: { icon: Clock, label: 'Moderate', color: 'text-[var(--warning)]' },
                                    high: { icon: Shield, label: 'Complex', color: 'text-[var(--danger)]' },
                                };
                                const effort = effortConfig[rec.effort] || effortConfig.medium;
                                const EffortIcon = effort.icon;

                                return (
                                    <div key={rec.id} className="rounded-xl border border-[var(--glass-border)] overflow-hidden">
                                        <div
                                            className="p-4 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
                                            onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', typeColors[rec.type])}>
                                                            {rec.type.replace('-', ' ')}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <EffortIcon className={clsx('w-3 h-3', effort.color)} />
                                                            <span className={clsx('text-xs', effort.color)}>{effort.label}</span>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-sm font-semibold mb-1">{rec.title}</h4>
                                                    <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">{rec.description}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-lg font-bold text-[var(--success)]">
                                                        {formatCurrency(rec.savings)}<span className="text-xs font-normal">/mo</span>
                                                    </div>
                                                    <div className="text-xs text-[var(--foreground-muted)]">
                                                        {formatCurrency(rec.currentCost)} <ArrowRight className="w-3 h-3 inline" /> {formatCurrency(rec.projectedCost)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 mt-2 text-xs text-[var(--primary)]">
                                                <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')} />
                                                {isExpanded ? 'Hide steps' : 'How to fix'}
                                            </div>
                                        </div>

                                        {isExpanded && rec.implementationSteps?.length > 0 && (
                                            <div className="px-4 pb-4 pt-0 border-t border-[var(--glass-border)]">
                                                <h5 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mt-3 mb-2">Implementation Steps</h5>
                                                <ol className="space-y-2">
                                                    {rec.implementationSteps.map((step: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <span className="w-5 h-5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center text-xs shrink-0 mt-0.5">
                                                                {i + 1}
                                                            </span>
                                                            <span>{step}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Related Services */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Related {getProviderName(provider)} Services
                    </h3>
                    {relatedServices.length > 0 ? (
                        <div className="space-y-3">
                            {relatedServices.map((svc, i) => {
                                const pct =
                                    totalCost > 0 ? (svc.cost / totalCost) * 100 : 0;
                                return (
                                    <Link
                                        key={i}
                                        href={`/services/${encodeURIComponent(svc.service)}`}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: getProviderColor(
                                                        svc.provider as "aws" | "gcp" | "azure"
                                                    ),
                                                }}
                                            />
                                            <span className="font-medium text-sm group-hover:text-[var(--primary)] transition-colors">
                                                {svc.service}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold text-sm">
                                                ${svc.cost.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-[var(--foreground-muted)] ml-2">
                                                {pct.toFixed(1)}%
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--foreground-muted)] italic">
                            No related services found.
                        </p>
                    )}
                </div>
            </div>

            {/* Cost Distribution Bar */}
            <div className="glass-card p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Spend Distribution</h3>
                <div className="relative">
                    <div className="w-full h-6 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.min(servicePercent, 100)}%`,
                                background: `linear-gradient(90deg, ${getProviderColor(provider)}80, ${getProviderColor(provider)})`,
                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-xs text-[var(--foreground-muted)]">
                            This service: ${serviceCost.toLocaleString()} (
                            {servicePercent.toFixed(1)}%)
                        </span>
                        <span className="text-xs text-[var(--foreground-muted)]">
                            Total: ${totalCost.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
