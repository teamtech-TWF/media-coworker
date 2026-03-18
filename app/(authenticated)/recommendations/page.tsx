import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getRecommendations } from "@/lib/db";
import { RecommendationCardWrapper } from "./RecommendationCardWrapper";
import { RecommendationRefresh } from "./RecommendationRefresh";
import Link from "next/link";

export default async function RecommendationsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const workspace = await getOrCreateWorkspace(userId);
  const isPro = workspace.plan === "pro";
  
  // Free users only see the most recent 3 pending recommendations
  const limit = isPro ? 20 : 3;
  const recommendations = await getRecommendations(workspace.id, limit);

  const pending = recommendations.filter((r: any) => r.status === "pending");
  const history = isPro ? recommendations.filter((r: any) => r.status !== "pending") : [];

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              <Link href="/" className="hover:text-indigo-400 transition-colors">Workspace</Link>
              <span>/</span>
              <span className="text-slate-300">Strategy</span>
            </nav>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">AI Strategy Recommendations</h1>
            <p className="text-lg text-slate-400 font-medium max-w-2xl leading-relaxed">
              Proactive suggestions from Gemini to improve your Google Ads performance.
            </p>
          </div>
          {!isPro && (
            <Link href="/settings">
              <button className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                UPGRADE TO PRO
              </button>
            </Link>
          )}
        </div>
      </header>

      {!isPro && (
        <div className="mb-12 p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl flex items-center gap-6">
           <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">💡</div>
           <div>
              <h4 className="font-black text-white mb-1 tracking-tight">Level Up Your Strategy</h4>
              <p className="text-slate-400 font-medium leading-relaxed max-w-xl">
                Free plan users are limited to 3 recommendations. Pro members unlock confidence scoring, evidence panels, approval workflows, and full historical logs.
              </p>
           </div>
        </div>
      )}

      <RecommendationRefresh initialCount={pending.length} />

      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Pending Optimizations</h2>
          <div className="h-px flex-1 bg-slate-800/50" />
          {pending.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-twf-green/10 text-twf-green text-[10px] font-black uppercase tracking-widest">
              {pending.length} Active
            </span>
          )}
        </div>

        {pending.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {pending.map((rec: any) => (
              <RecommendationCardWrapper
                key={rec.id}
                recommendation={rec}
                isPro={isPro}
              />
            ))}
          </div>
        )}
      </section>

      {isPro ? (
        history.length > 0 && (
          <section>
             <div className="flex items-center gap-4 mb-8">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Historical Log</h2>
              <div className="h-px flex-1 bg-slate-800/50" />
            </div>
            <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
              {history.map((rec: any) => (
                <RecommendationCardWrapper
                  key={rec.id}
                  recommendation={rec}
                  isPro={isPro}
                />
              ))}
            </div>
          </section>
        )
      ) : (
        <section className="opacity-20 pointer-events-none grayscale">
           <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">History (Pro Only)</h2>
            <div className="h-px flex-1 bg-slate-800/50" />
          </div>
          <div className="p-16 bg-slate-900/30 rounded-3xl border border-slate-800/50 text-center">
             <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Strategic History Locked</p>
          </div>
        </section>
      )}
    </div>
  );
}
