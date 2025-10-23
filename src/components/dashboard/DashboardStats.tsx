"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Building2,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { StatCard } from "./StatCard";

interface DashboardStatsData {
  overview: {
    totalInvoices: number;
    pendingInvoices: number;
    processedInvoices: number;
    failedInvoices: number;
    successRate: number;
  };
  ksef: {
    submittedToKsef: number;
    submissionRate: number;
  };
  companies: {
    totalCompanies: number;
  };
  financial: {
    totalAmount: number;
    monthlyAmount: number;
  };
  recent: {
    last7Days: number;
    currentMonth: number;
  };
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load dashboard statistics: {error}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Primary Stats Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={stats.overview.totalInvoices}
          description={`${stats.recent.last7Days} in last 7 days`}
          icon={FileText}
          trend={{
            value: stats.recent.last7Days,
            label: "this week",
            isPositive: true,
          }}
        />

        <StatCard
          title="Processed"
          value={stats.overview.processedInvoices}
          description={`${stats.overview.successRate}% success rate`}
          icon={CheckCircle}
          className="border-green-200 bg-green-50"
        />

        <StatCard
          title="Pending"
          value={stats.overview.pendingInvoices}
          description="Awaiting processing"
          icon={Clock}
          className="border-yellow-200 bg-yellow-50"
        />

        <StatCard
          title="Failed"
          value={stats.overview.failedInvoices}
          description="Needs attention"
          icon={XCircle}
          className={
            stats.overview.failedInvoices > 0
              ? "border-red-200 bg-red-50"
              : ""
          }
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="KSeF Submitted"
          value={stats.ksef.submittedToKsef}
          description={`${stats.ksef.submissionRate}% of total`}
          icon={Send}
        />

        <StatCard
          title="Companies"
          value={stats.companies.totalCompanies}
          description="Active clients"
          icon={Building2}
        />

        <StatCard
          title="Monthly Total"
          value={formatCurrency(stats.financial.monthlyAmount)}
          description={`${stats.recent.currentMonth} invoices this month`}
          icon={DollarSign}
        />

        <StatCard
          title="All-Time Total"
          value={formatCurrency(stats.financial.totalAmount)}
          description="Processed invoices value"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
