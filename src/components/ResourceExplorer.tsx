"use client";

import { memo, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, TrendingDown, ArrowUpDown, ExternalLink } from "lucide-react";
import { getProviderName, getProviderColor } from "@/lib/mockData";
import { clsx } from "clsx";

interface ServiceItem {
    service: string;
    provider: string;
    cost: number;
    percent: number;
}

interface RecommendationItem {
    id: string;
    title: string;
    description: string;
    provider: string;
    currentCost: number;
    projectedCost: number;
    savings: number;
    savingsPercent: number;
    resource: string;
    category: string;
}

interface ResourceExplorerProps {
    services: ServiceItem[];
    recommendations: RecommendationItem[];
    resources?: any[];
}

type SortMode = "cost" | "savings" | "name";
type ProviderFilter = "all" | "aws" | "gcp" | "azure";

export const ResourceExplorer = memo(function ResourceExplorer({
    services,
    recommendations,
    resources,
}: ResourceExplorerProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("cost");
    const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");

    // Compute potential savings per service by matching recommendations
    const savingsMap = useMemo(() => {
        const map: Record<string, { total: number; recs: RecommendationItem[] }> = {};
        recommendations.forEach((rec) => {
            services.forEach((s) => {
                const nameLC = s.service.toLowerCase();
                const recLC = (rec.resource + " " + rec.category + " " + rec.title).toLowerCase();
                if (
                    recLC.includes(nameLC) ||
                    nameLC.includes(rec.category?.toLowerCase() || "") ||
                    nameLC.includes(rec.resource?.toLowerCase() || "")
                ) {
                    if (!map[s.service]) map[s.service] = { total: 0, recs: [] };
                    if (!map[s.service].recs.find((r) => r.id === rec.id)) {
                        map[s.service].total += rec.savings;
                        map[s.service].recs.push(rec);
                    }
                }
            });
        });
        return map;
    }, [services, recommendations]);

    // Filter & sort
    const processedServices = useMemo(() => {
        let result = [...services];

        if (providerFilter !== "all") {
            result = result.filter((s) => s.provider === providerFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (s) =>
                    s.service.toLowerCase().includes(q) ||
                    s.provider.toLowerCase().includes(q)
            );
        }

        if (sortMode === "cost") {
            result.sort((a, b) => b.cost - a.cost);
        } else if (sortMode === "savings") {
            result.sort((a, b) => {
                const savA = savingsMap[a.service]?.total || 0;
                const savB = savingsMap[b.service]?.total || 0;
                return savB - savA;
            });
        } else {
            result.sort((a, b) => a.service.localeCompare(b.service));
        }

        return result;
    }, [services, providerFilter, searchQuery, sortMode, savingsMap]);

    const totalCost = services.reduce((sum, s) => sum + s.cost, 0);

    const handleRowClick = (serviceName: string) => {
        router.push(`/services/${encodeURIComponent(serviceName)}`);
    };

    return (
        <div className="glass-card p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h3 className="text-lg font-semibold">Resource Explorer</h3>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search services..."
                            className="pl-9 pr-4 py-2 w-[200px] bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>

                    {/* Provider filter pills */}
                    <div className="flex gap-1 bg-[var(--background-secondary)] rounded-lg p-0.5">
                        {(["all", "aws", "gcp", "azure"] as ProviderFilter[]).map((pf) => (
                            <button
                                key={pf}
                                onClick={() => setProviderFilter(pf)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    providerFilter === pf
                                        ? "bg-[var(--accent)] text-white shadow-sm"
                                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                                )}
                            >
                                {pf === "all" ? "All" : pf.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Sort dropdown */}
                    <div className="relative">
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as SortMode)}
                            className="appearance-none bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg pl-3 pr-8 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                        >
                            <option value="cost">Sort: Top Cost</option>
                            <option value="savings">Sort: Most Savings</option>
                            <option value="name">Sort: Name A-Z</option>
                        </select>
                        <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-muted)] pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="text-xs text-[var(--foreground-muted)] mb-3">
                Showing {processedServices.length} of {services.length} resources
                {totalCost > 0 && (
                    <span className="ml-2">
                        · Total: <span className="text-[var(--foreground)] font-medium">${totalCost.toLocaleString()}</span>
                    </span>
                )}
            </div>

            {/* Table */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Provider</th>
                            <th className="text-right">Cost</th>
                            <th className="text-right">Share</th>
                            <th className="text-right">Potential Savings</th>
                            <th className="w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedServices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-[var(--foreground-muted)]">
                                    No resources found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            processedServices.map((svc) => {
                                const savings = savingsMap[svc.service];
                                const provider = svc.provider as "aws" | "gcp" | "azure";

                                return (
                                    <tr
                                        key={svc.service}
                                        className="group cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
                                        onClick={() => handleRowClick(svc.service)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{
                                                        backgroundColor: getProviderColor(provider),
                                                    }}
                                                />
                                                <span className="font-medium group-hover:text-[var(--primary)] transition-colors">{svc.service}</span>
                                            </div>
                                        </td>
                                        <td>
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
                                        </td>
                                        <td className="text-right font-semibold">
                                            ${svc.cost.toLocaleString()}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(svc.percent, 100)}%`,
                                                            backgroundColor: getProviderColor(provider),
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-sm text-[var(--foreground-muted)] w-12 text-right">
                                                    {(svc.percent ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            {savings && savings.total > 0 ? (
                                                <span className="text-[var(--success)] font-medium inline-flex items-center gap-1">
                                                    <TrendingDown className="w-3.5 h-3.5" />
                                                    ${savings.total.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--foreground-muted)] text-sm">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <ExternalLink className="w-4 h-4 text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
