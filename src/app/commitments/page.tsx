"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Plus,
  Calendar,
  ArrowRight,
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

export default function CommitmentsPage() {
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
          <div className="mb-8 p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--primary)]">Feature Coming Soon</h3>
              <p className="text-sm text-[var(--primary)]/80">Commitment Management is currently in development.</p>
            </div>
          </div>
          <div className="w-20 h-20 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">No Commitments Yet</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account to view and manage your Reserved Instances, Savings Plans, and Committed Use Discounts.
          </p>
          <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Cloud Account
          </Link>
        </div>
      </div>
    );
  }

  // Empty state when no commitments found
  return (
    <div className="min-h-screen">
      <div className="mb-8 p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[var(--primary)]">Feature Coming Soon</h3>
          <p className="text-sm text-[var(--primary)]/80">Commitment Management is currently in development and will be available in an upcoming release. The data below is for preview purposes.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Commitment Management</h1>
          <p className="text-[var(--foreground-muted)]">
            Reserved Instances, Savings Plans, and Committed Use Discounts
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Purchase Commitment
        </button>
      </div>

      {/* Summary Stats - Show zeros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Coverage Rate
            </span>
            <Wallet className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <p className="text-3xl font-bold">0%</p>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            of eligible spend
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Avg. Utilization
            </span>
            <TrendingUp className="w-5 h-5 text-[var(--success)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--foreground-muted)]">
            N/A
          </p>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            no commitments
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Unutilized Value
            </span>
            <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <p className="text-3xl font-bold">$0</p>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            this billing period
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Potential Savings
            </span>
            <CheckCircle className="w-5 h-5 text-[var(--info)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--info)]">
            —
          </p>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            analyzing usage...
          </p>
        </div>
      </div>

      {/* Empty commitments state */}
      <div className="glass-card p-6 animate-fade-in">
        <h3 className="text-lg font-semibold mb-6">Active Commitments</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[var(--foreground-muted)]" />
            </div>
            <h4 className="text-lg font-semibold mb-2">No Active Commitments</h4>
            <p className="text-sm text-[var(--foreground-muted)] mb-4">
              You don't have any Reserved Instances or Savings Plans yet. Based on your usage patterns, we'll recommend cost-saving commitments.
            </p>
            <button className="btn btn-secondary">
              View Recommendations
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
