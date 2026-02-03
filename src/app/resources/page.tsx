"use client";

import { useState, useEffect } from "react";
import {
  Server,
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  Pause,
  MoreHorizontal,
  ExternalLink,
  Cpu,
  HardDrive,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { accountsApi } from "@/lib/api";
import {
  formatCurrency,
  getProviderName,
  getProviderColor,
} from "@/lib/mockData";

type StatusFilter = "all" | "running" | "stopped" | "idle";
type ProviderFilter = "all" | "aws" | "gcp" | "azure";

interface Resource {
  id: string;
  name: string;
  type: string;
  provider: "aws" | "gcp" | "azure";
  region: string;
  status: "running" | "stopped" | "idle";
  cost: number;
  cpuUtilization: number;
  memoryUtilization: number;
  recommendation?: string;
}

export default function ResourcesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for connected accounts
        const accountsResult = await accountsApi.getAll();
        const accountsExist = !!(accountsResult.data?.accounts && accountsResult.data.accounts.length > 0);
        setHasAccounts(accountsExist);
        // Resources will be fetched via sync once accounts are connected
      } catch (error) {
        console.error("Error checking accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredResources = resources.filter((resource) => {
    if (statusFilter !== "all" && resource.status !== statusFilter) return false;
    if (providerFilter !== "all" && resource.provider !== providerFilter)
      return false;
    if (
      searchQuery &&
      !resource.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const totalCost = resources.reduce((sum, r) => sum + r.cost, 0);
  const wastefulCost = resources
    .filter((r) => r.recommendation)
    .reduce((sum, r) => sum + r.cost, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading resources...</p>
        </div>
      </div>
    );
  }

  // Empty state when no accounts connected
  if (!hasAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center mx-auto mb-6">
            <Server className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">No Resources Yet</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account to view and monitor your cloud resources.
          </p>
          <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Cloud Account
          </Link>
        </div>
      </div>
    );
  }

  // Empty state when no resources found
  if (resources.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Resource Inventory</h1>
            <p className="text-[var(--foreground-muted)]">
              Monitor and optimize your cloud infrastructure
            </p>
          </div>
          <button className="btn btn-primary">
            <RefreshCw className="w-4 h-4" />
            Sync Resources
          </button>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
              <Server className="w-10 h-10 text-[var(--foreground-muted)]" />
            </div>
            <h2 className="text-xl font-bold mb-3">No Resources Found</h2>
            <p className="text-[var(--foreground-muted)]">
              Click "Sync Resources" to fetch your cloud resources.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Resource Inventory</h1>
          <p className="text-[var(--foreground-muted)]">
            Monitor and optimize your cloud infrastructure
          </p>
        </div>
        <button className="btn btn-primary">
          <RefreshCw className="w-4 h-4" />
          Sync Resources
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Total Resources
            </span>
            <Server className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <p className="text-3xl font-bold">{resources.length}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Monthly Cost
            </span>
            <HardDrive className="w-5 h-5 text-[var(--info)]" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Underutilized
            </span>
            <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <p className="text-3xl font-bold">
            {resources.filter((r) => r.cpuUtilization < 20).length}
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Wasteful Spend
            </span>
            <Cpu className="w-5 h-5 text-[var(--danger)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--danger)]">
            {formatCurrency(wastefulCost)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--foreground-muted)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="select w-32"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="idle">Idle</option>
            </select>

            <select
              value={providerFilter}
              onChange={(e) =>
                setProviderFilter(e.target.value as ProviderFilter)
              }
              className="select w-32"
            >
              <option value="all">All Providers</option>
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
              <option value="azure">Azure</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Resource Name</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Region</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Status</th>
                <th className="text-right">Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((resource) => (
                <ResourceRow key={resource.id} resource={resource} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const statusConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
    running: {
      icon: CheckCircle,
      label: "Running",
      color: "text-[var(--success)]",
      bg: "bg-[var(--success-subtle)]",
    },
    stopped: {
      icon: Pause,
      label: "Stopped",
      color: "text-[var(--foreground-muted)]",
      bg: "bg-[var(--surface)]",
    },
    idle: {
      icon: AlertCircle,
      label: "Idle",
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-subtle)]",
    },
  };

  const status = statusConfig[resource.status];
  const StatusIcon = status.icon;

  const getUtilizationColor = (value: number) => {
    if (value < 20) return "text-[var(--danger)]";
    if (value < 50) return "text-[var(--warning)]";
    return "text-[var(--success)]";
  };

  return (
    <tr className="group">
      <td>
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-8 rounded-full"
            style={{ backgroundColor: getProviderColor(resource.provider) }}
          />
          <div>
            <p className="font-medium">{resource.name}</p>
            {resource.recommendation && (
              <p className="text-xs text-[var(--warning)] mt-0.5">
                ⚡ {resource.recommendation}
              </p>
            )}
          </div>
        </div>
      </td>
      <td>
        <span className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded">
          {resource.type}
        </span>
      </td>
      <td>
        <span
          className={clsx(
            "badge",
            resource.provider === "aws" && "cloud-aws",
            resource.provider === "gcp" && "cloud-gcp",
            resource.provider === "azure" && "cloud-azure"
          )}
        >
          {getProviderName(resource.provider)}
        </span>
      </td>
      <td className="text-[var(--foreground-muted)]">{resource.region}</td>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                resource.cpuUtilization < 20 && "bg-[var(--danger)]",
                resource.cpuUtilization >= 20 &&
                  resource.cpuUtilization < 50 &&
                  "bg-[var(--warning)]",
                resource.cpuUtilization >= 50 && "bg-[var(--success)]"
              )}
              style={{ width: `${resource.cpuUtilization}%` }}
            />
          </div>
          <span
            className={clsx(
              "text-sm font-medium",
              getUtilizationColor(resource.cpuUtilization)
            )}
          >
            {resource.cpuUtilization}%
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                resource.memoryUtilization < 20 && "bg-[var(--danger)]",
                resource.memoryUtilization >= 20 &&
                  resource.memoryUtilization < 50 &&
                  "bg-[var(--warning)]",
                resource.memoryUtilization >= 50 && "bg-[var(--success)]"
              )}
              style={{ width: `${resource.memoryUtilization}%` }}
            />
          </div>
          <span
            className={clsx(
              "text-sm font-medium",
              getUtilizationColor(resource.memoryUtilization)
            )}
          >
            {resource.memoryUtilization}%
          </span>
        </div>
      </td>
      <td>
        <span
          className={clsx(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            status.bg,
            status.color
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </td>
      <td className="text-right font-semibold">
        {formatCurrency(resource.cost)}/mo
      </td>
      <td>
        <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--surface)] transition-all">
          <MoreHorizontal className="w-4 h-4 text-[var(--foreground-muted)]" />
        </button>
      </td>
    </tr>
  );
}
