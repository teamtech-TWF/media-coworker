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
    <div className={`group relative bg-slate-900/40 border rounded-3xl p-8 transition-all duration-300 overflow-hidden ${
      isResolved ? "opacity-40 border-slate-800 scale-[0.98] grayscale" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 shadow-xl"
    }`}>
      {/* Visual Accent */}
      {!isResolved && (
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 shadow-[2px_0_15px_rgba(79,70,229,0.3)]" />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎯</span>
            <h3 className="text-2xl font-black text-white tracking-tight leading-none">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status:</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
              status === 'pending' ? 'bg-indigo-500/10 text-indigo-400' : 
              status === 'approved' ? 'bg-twf-green/10 text-twf-green' : 
              'bg-slate-800 text-slate-400'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {isPro ? (
          <div className={`px-4 py-2 rounded-2xl flex flex-col items-center border ${
            confidence > 0.8 ? "bg-twf-green/5 border-twf-green/20" : "bg-twf-orange/5 border-twf-orange/20"
          }`}>
            <span className={`text-sm font-black ${confidence > 0.8 ? "text-twf-green" : "text-twf-orange"}`}>
              {(confidence * 100).toFixed(0)}%
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Confidence</span>
          </div>
        ) : (
          <div className="px-4 py-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-center">
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pro Feature</span>
          </div>
        )}
      </div>

      <p className="text-lg text-slate-300 font-medium leading-relaxed mb-8 max-w-3xl">
        {reason}
      </p>

      {/* Evidence Panel - Gated */}
      <div className={`bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 mb-8 transition-colors group-hover:border-slate-800 ${!isPro && "min-h-[80px] flex items-center justify-center"}`}>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Evidence Matrix</h4>
        {isPro ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(evidence || {}).map(([key, val]: [string, any]) => (
              <div key={key}>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{key.replace(/_/g, " ")}</p>
                <p className="text-lg font-black text-slate-200 tracking-tight">{String(val)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Data restriction applied · Upgrade for full access</p>
        )}
      </div>

      {/* Client Summary Block - Gated */}
      {isPro && (
        <div className="border-l-4 border-indigo-500 bg-indigo-500/5 p-6 mb-8 rounded-r-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📧</span>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Executive Summary (Client Ready)</h4>
          </div>
          <p className="text-sm text-slate-300 font-medium italic leading-relaxed">
            &quot;Based on our recent analysis of {title.toLowerCase()}, we recommend this optimization due to {reason.toLowerCase()}&quot;
          </p>
        </div>
      )}

      {!isResolved && (
        <div className="flex flex-col sm:flex-row gap-3">
          {isPro ? (
            <>
              <button
                onClick={() => handleAction("approved")}
                className="flex-[2] bg-twf-green hover:bg-twf-green-dark text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-twf-green/20 transition-all active:scale-95"
              >
                Approve & Execute
              </button>
              <button
                onClick={() => handleAction("snoozed")}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Snooze
              </button>
              <button
                onClick={() => handleAction("rejected")}
                className="flex-1 border border-twf-red/50 hover:bg-twf-red/10 text-twf-red py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Reject
              </button>
            </>
          ) : (
            <Link href="/settings" className="w-full">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
                Unlock Implementation Suite
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
