import * as React from "react";

interface AuthShellProps {
  heading: string;
  subheading: string;
  children: React.ReactNode;
}

export function AuthShell({ heading, subheading, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/50 p-8 shadow-card backdrop-blur-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
          <p className="mt-2 text-sm text-slate-400">{subheading}</p>
        </div>
        {children}
      </div>
    </div>
  );
}