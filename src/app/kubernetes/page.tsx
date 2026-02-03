"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Server,
  Box,
  Layers,
  TrendingDown,
  AlertCircle,
  BarChart3,
  RefreshCw,
  ChevronRight,
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

export default function KubernetesPage() {
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  useEffect(() => {
    const checkAccounts = async () => {
      try {
        const accountsResult = await accountsApi.getAll();
        const accountsExist = !!(accountsResult.data?.accounts && accountsResult.data.accounts.length > 0);
        setHasAccounts(accountsExist);
      } catch (error) {
        console.error("Error checking accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAccounts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading...</p>
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
            <Cloud className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">No Kubernetes Clusters Yet</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account with Kubernetes clusters (EKS, GKE, or AKS) to view container costs. 
          </p>
          <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Cloud Account
          </Link>
        </div>
      </div>
    );
  }

  // Empty state when no clusters found
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Kubernetes Costs</h1>
          <p className="text-[var(--foreground-muted)]">
            Container and cluster cost allocation and optimization
          </p>
        </div>
        <button className="btn btn-primary">
          <RefreshCw className="w-4 h-4" />
          Sync Clusters
        </button>
      </div>

      {/* Empty state for clusters */}
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
            <Layers className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h2 className="text-xl font-bold mb-3">No Clusters Found</h2>
          <p className="text-[var(--foreground-muted)]">
            No Kubernetes clusters were detected in your connected accounts. Click "Sync Clusters" to refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
