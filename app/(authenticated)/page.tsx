import { auth } from "@clerk/nextjs/server";
import { 
  getOrCreateWorkspace, 
  getGoogleAdsIntegration, 
  getLastJobRun, 
  getRecentMetrics, 
  getRecommendations,
  getOutputs
} from "@/lib/db";
import Link from "next/link";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ClientSafeSummary } from "@/components/dashboard/ClientSafeSummary";
import { RecommendationsFeed } from "@/components/dashboard/RecommendationsFeed";

export default async function OverviewPage() {
  const { userId } = auth();
  const workspace = await getOrCreateWorkspace(userId!);
  const integration = await getGoogleAdsIntegration(workspace.id);
  const lastRun = await getLastJobRun(workspace.id);
  const metrics = await getRecentMetrics(workspace.id, 14);
  const recommendations = await getRecommendations(workspace.id, 10);
  const outputs = await getOutputs(workspace.id, workspace.retention_days || 30, 1);

  const connected = integration?.status === "active";
  const isPro = workspace.plan === "pro";

  // KPI Calculations (Week over Week)
  const currentWeek = metrics.slice(0, 7);
  const previousWeek = metrics.slice(7, 14);

  const sum = (arr: any[], key: string) => arr.reduce((acc, curr) => acc + (curr[key] || 0), 0);

  const stats = {
    spend: {
      curr: sum(currentWeek, "spend"),
      prev: sum(previousWeek, "spend"),
    },
    conversions: {
      curr: sum(currentWeek, "conversions"),
      prev: sum(previousWeek, "conversions"),
    },
    cpa: {
      curr: sum(currentWeek, "spend") / (sum(currentWeek, "conversions") || 1),
      prev: sum(previousWeek, "spend") / (sum(previousWeek, "conversions") || 1),
    },
    roas: {
      curr: sum(currentWeek, "revenue") / (sum(currentWeek, "spend") || 1),
      prev: sum(previousWeek, "revenue") / (sum(previousWeek, "spend") || 1),
    }
  };

  const getDelta = (curr: number, prev: number) => {
    if (!prev) return "0%";
    const d = ((curr - prev) / prev) * 100;
    return `${Math.abs(d).toFixed(1)}%`;
  };

  const latestOutput = outputs[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
              Live Dashboard
            </span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
            Strategy Overview
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl">
            {connected 
              ? `Performance is ${stats.roas.curr > stats.roas.prev ? "up" : "stable"} across your connected accounts. Here is what needs your attention today.`
              : "Welcome! Connect your Google Ads account to start receiving AI-powered optimizations."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/recommendations">
            <button className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-black text-xs text-gray-700 dark:text-gray-100 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
              View Strategy
            </button>
          </Link>
          <RunNowButton workspaceId={workspace.id} />
        </div>
      </header>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard 
          title="Total Spend" 
          value={`${stats.spend.curr.toLocaleString()} THB`} 
          delta={getDelta(stats.spend.curr, stats.spend.prev)}
          isPositive={stats.spend.curr < stats.spend.prev} // For spend, lower is often better depending on goal
          icon="💸"
        />
        <KpiCard 
          title="Conversions" 
          value={stats.conversions.curr.toLocaleString()} 
          delta={getDelta(stats.conversions.curr, stats.conversions.prev)}
          isPositive={stats.conversions.curr > stats.conversions.prev}
          icon="📈"
        />
        <KpiCard 
          title="Avg. CPA" 
          value={`${stats.cpa.curr.toFixed(2)} THB`} 
          delta={getDelta(stats.cpa.curr, stats.cpa.prev)}
          isPositive={stats.cpa.curr < stats.cpa.prev}
          icon="🎯"
        />
        <KpiCard 
          title="ROAS" 
          value={`${stats.roas.curr.toFixed(2)}x`} 
          delta={getDelta(stats.roas.curr, stats.roas.prev)}
          isPositive={stats.roas.curr > stats.roas.prev}
          icon="💎"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content: Recommendations */}
        <div className="lg:col-span-2 space-y-12">
          <RecommendationsFeed 
            initialRecommendations={recommendations} 
            isPro={isPro}
          />
        </div>

        {/* Sidebar: AI Summary & Health */}
        <div className="space-y-8">
          <ClientSafeSummary 
            content={latestOutput?.content_md}
            date={latestOutput ? new Date(latestOutput.created_at).toLocaleDateString() : undefined}
            isPro={isPro}
          />

          {/* Account Health Snapshot */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">
              Workspace Status
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Connection</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${connected ? "bg-twf-green shadow-[0_0_8px_rgba(0,208,132,0.5)]" : "bg-twf-red"}`} />
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100">{connected ? "Active" : "Disconnected"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Last Sync</span>
                <span className="text-sm font-black text-gray-900 dark:text-gray-100">
                  {lastRun ? new Date(lastRun.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Plan Tier</span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isPro ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                  {isPro ? "Pro" : "Free"}
                </span>
              </div>
            </div>

            {!connected && (
              <Link href="/settings" className="block mt-8">
                <button className="w-full py-3 bg-twf-red text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-twf-red/20 transition-all active:scale-95">
                  Reconnect Google Ads
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RunNowButton({ workspaceId }: { workspaceId: string }) {
  return (
    <form action="/api/jobs/run-now" method="POST">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95">
        <span>▶</span> Deep Scan Now
      </button>
    </form>
  );
}

