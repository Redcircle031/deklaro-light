"use client";

import Link from "next/link";
import { Upload, FileText, Building2, Send, Download, Settings } from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const actions: QuickAction[] = [
  {
    title: "Upload Invoice",
    description: "Upload and process new invoices",
    icon: Upload,
    href: "/dashboard/invoices",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    title: "View Invoices",
    description: "Browse all invoices",
    icon: FileText,
    href: "/dashboard/invoices",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    title: "Manage Companies",
    description: "Add or edit company details",
    icon: Building2,
    href: "/dashboard/companies",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    title: "Submit to KSeF",
    description: "Submit invoices to government system",
    icon: Send,
    href: "/dashboard/ksef",
    color: "bg-orange-500 hover:bg-orange-600",
  },
  {
    title: "Export Data",
    description: "Download reports and exports",
    icon: Download,
    href: "/dashboard/reports",
    color: "bg-indigo-500 hover:bg-indigo-600",
  },
  {
    title: "Settings",
    description: "Configure tenant settings",
    icon: Settings,
    href: "/dashboard/settings",
    color: "bg-slate-500 hover:bg-slate-600",
  },
];

export function QuickActions() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${action.color} transition-colors`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-slate-900 group-hover:text-blue-600">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
