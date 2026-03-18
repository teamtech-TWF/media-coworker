"use client";

import React, { useState } from "react";
import { RecommendationCard } from "../RecommendationCard";
import Link from "next/link";

interface RecommendationsFeedProps {
  initialRecommendations: any[];
  isPro?: boolean;
}

export function RecommendationsFeed({ initialRecommendations, isPro = false }: RecommendationsFeedProps) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected" | "snoozed") => {
    // Update local state optimistically
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status } : rec))
    );

    try {
      await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      // Revert state if needed? For MVP we keep it simple.
    }
  };

  const pendingRecs = recommendations.filter((r) => r.status === "pending");
  const hasMore = recommendations.length > 5;

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">
              Action Center
            </h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mt-1">
              {pendingRecs.length} Urgent recommendations
            </p>
          </div>
        </div>
        <Link href="/recommendations" className="text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-2">
          View All Strategy <span>→</span>
        </Link>
      </div>

      <div className="space-y-6">
        {pendingRecs.length > 0 ? (
          pendingRecs.slice(0, 5).map((rec) => (
            <RecommendationCard
              key={rec.id}
              id={rec.id}
              title={rec.title}
              reason={rec.reason}
              evidence={rec.evidence}
              confidence={rec.confidence}
              status={rec.status}
              onStatusUpdate={handleStatusUpdate}
              isPro={isPro}
            />
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-12 text-center border-dashed">
            <span className="text-4xl mb-4 block">🏆</span>
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight mb-2">
              You're all caught up!
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Your accounts are currently in top shape. Check back later or run a deep scan for new insights.
            </p>
          </div>
        )}

        {hasMore && (
          <Link href="/recommendations" className="block">
            <button className="w-full py-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-black text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all border-dashed">
              Show {recommendations.length - 5} More Recommendations
            </button>
          </Link>
        )}
      </div>
    </section>
  );
}
