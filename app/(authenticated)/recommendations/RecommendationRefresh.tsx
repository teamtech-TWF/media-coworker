"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export function RecommendationRefresh({ initialCount }: { initialCount: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/run-recommendations", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to refresh recommendations", err);
    } finally {
      setLoading(false);
    }
  }, [loading, router]);

  // Automatically trigger if none found
  useEffect(() => {
    if (initialCount === 0 && !loading) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCount]);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <div className="inline-block w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-black text-white tracking-tight mb-2">Gemini is Thinking...</h3>
        <p className="text-slate-400 animate-pulse font-medium">Scanning your Google Ads account for alpha...</p>
      </div>
    );
  }

  // If initial count is 0 and we're not loading (meaning it's the state AFTER an empty refresh)
  if (initialCount === 0 && !loading) {
    return (
      <div className="p-12 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl text-center backdrop-blur-sm">
        <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">☕️</div>
        <h3 className="text-xl font-bold text-white mb-2">Quiet morning...</h3>
        <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
          Gemini analyzed your data but didn&apos;t find any high-confidence optimizations right now. Check back later or try a full re-sync.
        </p>
        <button 
          onClick={handleRefresh}
          className="btn-primary px-8 py-3"
        >
          Try Full Re-Sync
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-6">
      <button 
        onClick={handleRefresh}
        disabled={loading}
        className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-2"
      >
        <span>🔄</span> Re-Sync Strategy
      </button>
    </div>
  );
}
