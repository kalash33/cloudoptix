"use client";

import { useState, useEffect } from "react";
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Bell,
  Calendar,
  Trash2,
  Edit2,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { accountsApi } from "@/lib/api";
import { formatCurrency, getProviderName, getProviderColor } from "@/lib/mockData";

export default function BudgetsPage() {
  const [isCreating, setIsCreating] = useState(false);
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
            <Target className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">No Budgets Yet</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account to create budgets and receive spending alerts.
          </p>
          <Link href="/onboarding" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Cloud Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Budgets & Alerts</h1>
          <p className="text-[var(--foreground-muted)]">
            Set spending limits and receive proactive notifications
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Active Budgets
            </span>
            <Target className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <p className="text-3xl font-bold">0</p>
        </div>

        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Total Budget
            </span>
            <Calendar className="w-5 h-5 text-[var(--info)]" />
          </div>
          <p className="text-3xl font-bold">$0</p>
        </div>

        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Current Spend
            </span>
            <TrendingUp className="w-5 h-5 text-[var(--success)]" />
          </div>
          <p className="text-3xl font-bold">$0</p>
        </div>

        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground-muted)]">
              Active Alerts
            </span>
            <Bell className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <p className="text-3xl font-bold">0</p>
        </div>
      </div>

      {/* Empty budgets state */}
      <div className="glass-card p-6 animate-fade-in">
        <h3 className="text-lg font-semibold mb-6">Your Budgets</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-[var(--foreground-muted)]" />
            </div>
            <h4 className="text-lg font-semibold mb-2">No Budgets Created</h4>
            <p className="text-sm text-[var(--foreground-muted)] mb-4">
              Create your first budget to track cloud spending and get notified when you approach your limits.
            </p>
            <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4" />
              Create Your First Budget
            </button>
          </div>
        </div>
      </div>

      {/* Create Budget Modal */}
      {isCreating && <CreateBudgetModal onClose={() => setIsCreating(false)} />}
    </div>
  );
}

function CreateBudgetModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-md p-6 m-4">
        <h3 className="text-xl font-semibold mb-2">Create Budget</h3>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">
          Set spending limits and alert thresholds
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Budget Name</label>
            <input
              type="text"
              placeholder="e.g., Production AWS"
              className="input"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Monthly Budget
            </label>
            <input type="number" placeholder="5000" className="input" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Provider</label>
            <select className="select">
              <option value="">All Providers</option>
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
              <option value="azure">Azure</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Alert Thresholds
            </label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="80" className="input w-20" />
              <span className="text-[var(--foreground-muted)]">%</span>
              <input type="number" placeholder="100" className="input w-20" />
              <span className="text-[var(--foreground-muted)]">%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Create Budget</button>
        </div>
      </div>
    </div>
  );
}
