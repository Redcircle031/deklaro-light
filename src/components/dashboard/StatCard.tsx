"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive === false
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {trend.isPositive === false ? "↓" : "↑"} {Math.abs(trend.value)}
                %
              </span>
              <span className="text-sm text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}
