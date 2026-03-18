"use client";

import { useState } from "react";

interface RecommendationProps {
  id: string;
  title: string;
  reason: string;
  evidence: any;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "snoozed";
  onStatusUpdate: (id: string, status: "approved" | "rejected" | "snoozed") => void;
  isPro?: boolean;
}

export function RecommendationCard({
  id,
  title,
  reason,
  evidence,
  confidence,
  status: initialStatus,
  onStatusUpdate,
  isPro = false,
}: RecommendationProps) {
  const [status, setStatus] = useState(initialStatus);

  const handleAction = (newStatus: "approved" | "rejected" | "snoozed") => {
    if (!isPro) return; // Guard for free users
    setStatus(newStatus);
    onStatusUpdate(id, newStatus);
  };

  const isResolved = status !== "pending";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border ${isResolved ? "opacity-60 border-gray-100" : "border-gray-200"} p-6 shadow-sm transition-all mb-4 relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">Status: <span className="uppercase font-black text-[10px] tracking-widest">{status}</span></p>
        </div>
        {isPro ? (
          <div className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tighter ${
            confidence > 0.8 ? "bg-twf-green/10 text-twf-green-dark" : "bg-twf-orange/10 text-twf-orange"
          }`}>
            {(confidence * 100).toFixed(0)}% Confidence
          </div>
        ) : (
          <div className="px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black uppercase text-gray-400">Pro Feature</div>
        )}
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
        {reason}
      </p>

      {/* Evidence Panel - Gated */}
      <div className={`bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 mb-6 relative ${!isPro && "min-h-[100px]"}`}>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Evidence Panel</h4>
        {isPro ? (
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(evidence || {}).map(([key, val]: [string, any]) => (
              <div key={key}>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{key.replace(/_/g, " ")}</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{String(val)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2">
            <p className="text-[10px] text-gray-400 font-bold italic">Evidence data is restricted to Pro members.</p>
          </div>
        )}
      </div>

      {/* Client Summary Block - Gated */}
      {isPro && (
        <div className="border-l-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 p-4 mb-6 italic">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Client-Safe Summary</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            "Based on our recent analysis of {title.toLowerCase()}, we recommend this optimization due to {reason.toLowerCase()}"
          </p>
        </div>
      )}

      {!isResolved && (
        <div className="flex gap-2">
          {isPro ? (
            <>
              <button
                onClick={() => handleAction("approved")}
                className="flex-1 bg-twf-green text-white py-2 rounded-xl font-black text-xs hover:bg-twf-green-dark transition-all"
              >
                APPROVE
              </button>
              <button
                onClick={() => handleAction("snoozed")}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
              >
                SNOOZE
              </button>
              <button
                onClick={() => handleAction("rejected")}
                className="flex-1 border border-twf-red text-twf-red py-2 rounded-xl font-black text-xs hover:bg-red-50 transition-all"
              >
                REJECT
              </button>
            </>
          ) : (
            <div className="w-full text-center py-2 bg-indigo-600 text-white rounded-xl font-black text-xs cursor-default">
              UPGRADE TO APPROVE RECOMMENDATIONS
            </div>
          )}
        </div>
      )}
    </div>
  );
}
