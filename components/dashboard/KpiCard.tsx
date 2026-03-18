import React from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  isPositive?: boolean;
  icon: string;
  loading?: boolean;
}

export function KpiCard({ title, value, delta, isPositive, icon, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] leading-none">
          {title}
        </h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          {value}
        </span>
        {delta && (
          <span className={`text-xs font-bold ${isPositive ? "text-twf-green" : "text-twf-red"}`}>
            {isPositive ? "↑" : "↓"} {delta}
          </span>
        )}
      </div>
      
      {/* Subtle background decoration */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.07] transition-opacity">
        <span className="text-8xl select-none">{icon}</span>
      </div>
    </div>
  );
}
