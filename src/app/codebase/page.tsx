"use client";

import { useState, useEffect } from "react";
import {
  Code2,
  GitBranch,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Cloud,
  Server,
  Zap,
  ExternalLink,
  RefreshCw,
  Github,
  BarChart3,
  Plus,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { accountsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/mockData";

export default function CodebasePage() {
  const [isConnecting, setIsConnecting] = useState(false);
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
              <p className="text-sm text-[var(--primary)]/80">Codebase Analysis is currently in development.</p>
            </div>
          </div>
          <div className="w-20 h-20 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center mx-auto mb-6">
            <Code2 className="w-10 h-10 text-[var(--foreground-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Codebase Analysis</h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            Connect a cloud account first, then connect your code repositories to analyze cloud portability and optimization opportunities.
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
      <div className="mb-8 p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[var(--primary)]">Feature Coming Soon</h3>
          <p className="text-sm text-[var(--primary)]/80">Codebase Analysis is currently in development and will be available in an upcoming release. The data below is for preview purposes.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Codebase Analysis</h1>
          <p className="text-[var(--foreground-muted)]">
            Scan your repositories for cloud portability and optimization opportunities
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsConnecting(true)}
        >
          <GitBranch className="w-4 h-4" />
          Connect Repository
        </button>
      </div>

      {/* Empty state - no repos connected */}
      <div className="glass-card p-6 mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Connected Repositories</h3>
        </div>

        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
              <Github className="w-10 h-10 text-[var(--foreground-muted)]" />
            </div>
            <h2 className="text-xl font-bold mb-3">No Repositories Connected</h2>
            <p className="text-[var(--foreground-muted)] mb-6">
              Connect your GitHub, GitLab, or Bitbucket repositories to analyze your codebase for cloud provider lock-in and optimization opportunities.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setIsConnecting(true)}
            >
              <GitBranch className="w-4 h-4" />
              Connect Your First Repository
            </button>
          </div>
        </div>
      </div>

      {/* Features preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 animate-fade-in opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "var(--success)15" }}
            >
              <Zap className="w-6 h-6" style={{ color: "var(--success)" }} />
            </div>
            <span className="text-3xl font-bold text-[var(--foreground-muted)]">—</span>
          </div>
          <h3 className="font-semibold mb-1">Lambda-fit Functions</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Functions suitable for serverless deployment
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-in opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "var(--info)15" }}
            >
              <Server className="w-6 h-6" style={{ color: "var(--info)" }} />
            </div>
            <span className="text-3xl font-bold text-[var(--foreground-muted)]">—</span>
          </div>
          <h3 className="font-semibold mb-1">Container-ready Services</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Services ready for containerization
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-in opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "var(--primary)15" }}
            >
              <Cloud className="w-6 h-6" style={{ color: "var(--primary)" }} />
            </div>
            <span className="text-3xl font-bold text-[var(--foreground-muted)]">—</span>
          </div>
          <h3 className="font-semibold mb-1">Cloud-agnostic Patterns</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Code following cloud-agnostic practices
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-in opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "var(--warning)15" }}
            >
              <AlertCircle className="w-6 h-6" style={{ color: "var(--warning)" }} />
            </div>
            <span className="text-3xl font-bold text-[var(--foreground-muted)]">—</span>
          </div>
          <h3 className="font-semibold mb-1">Provider Lock-in Points</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Code tightly coupled to specific providers
          </p>
        </div>
      </div>

      {/* Connect Repository Modal */}
      {isConnecting && (
        <ConnectModal onClose={() => setIsConnecting(false)} />
      )}
    </div>
  );
}

function ConnectModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-md p-6 m-4">
        <h3 className="text-xl font-semibold mb-2">Connect Repository</h3>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">
          Connect your code repository to analyze cloud portability
        </p>

        <div className="space-y-3 mb-6">
          <button className="w-full p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 transition-colors flex items-center gap-3">
            <Github className="w-6 h-6" />
            <span className="font-medium">Connect GitHub</span>
          </button>
          <button className="w-full p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 transition-colors flex items-center gap-3">
            <Code2 className="w-6 h-6" />
            <span className="font-medium">Connect GitLab</span>
          </button>
          <button className="w-full p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 transition-colors flex items-center gap-3">
            <Server className="w-6 h-6" />
            <span className="font-medium">Connect Bitbucket</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
