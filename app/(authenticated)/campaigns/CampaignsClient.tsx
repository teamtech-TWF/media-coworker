"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CampaignInfo } from "@/lib/googleAds";
import { CampaignMetrics } from "@/lib/db";
import { MediaPlan, CreativeInsight } from "@/lib/db";

interface ActiveCampaignsProps {
  initialCampaigns: CampaignInfo[];
  initialMetrics?: CampaignMetrics[]; // Added default value below
  initialMediaPlans?: MediaPlan[];
  initialCreativeInsights?: CreativeInsight[];
}

export default function ActiveCampaignsPage({ initialCampaigns, initialMetrics = [], initialMediaPlans = [], initialCreativeInsights = [] }: ActiveCampaignsProps) {
  const [allCampaigns, setAllCampaigns] = useState<CampaignInfo[]>(initialCampaigns);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "", channelType: "" });
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const [generatingRecommendation, setGeneratingRecommendation] = useState(false);

  // Process initialMetrics to aggregate for each campaign
  const campaignMetricsMap = useMemo(() => {
    const map = new Map<string, CampaignMetrics[]>();
    // Ensure initialMetrics is treated as an array
    const metricsArr = Array.isArray(initialMetrics) ? initialMetrics : [];
    metricsArr.forEach(metric => {
      if (!map.has(metric.campaign_id)) {
        map.set(metric.campaign_id, []);
      }
      map.get(metric.campaign_id)?.push(metric);
    });
    return map;
  }, [initialMetrics]);

  // Memoize filtered and sorted campaigns
  const filteredCampaigns = useMemo(() => {
    let campaigns = allCampaigns;

    // Apply search term filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      campaigns = campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerSearchTerm) ||
          c.id.toLowerCase().includes(lowerSearchTerm) ||
          c.customerDescriptiveName.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply status filter
    if (filters.status) {
      campaigns = campaigns.filter((c) => c.status === filters.status);
    }

    // Apply channel type filter
    if (filters.channelType) {
      campaigns = campaigns.filter((c) => c.channelType === filters.channelType);
    }

    // Sort by name or status? For now, let's keep it simple.
    // campaigns.sort((a, b) => a.name.localeCompare(b.name));

    return campaigns;
  }, [allCampaigns, searchTerm, filters]);

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const handleGenerateRecommendation = async () => {
    if (selectedCampaignIds.size === 0) {
      alert("Please select at least one campaign.");
      return;
    }

    setGeneratingRecommendation(true);
    setRecommendations(null);

    try {
      const response = await fetch("/api/ai/run-campaign-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignIds: Array.from(selectedCampaignIds),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error: any) {
      console.error("Error generating recommendation:", error);
      alert(`Error generating recommendation: ${error.message}`);
    } finally {
      setGeneratingRecommendation(false);
    }
  };

  // Fetch initial data (ideally done server-side and passed as props)
  // useEffect(() => {
  //   // If data is not passed as props, fetch it here.
  //   // fetchCampaigns();
  // }, []);

  const uniqueStatuses = Array.from(new Set(allCampaigns.map((c) => c.status)));
  const uniqueChannelTypes = Array.from(new Set(allCampaigns.map((c) => c.channelType)));

  // --- Placeholder data for insights (to be replaced by actual fetched data) ---
  const selectedCampaignsData = useMemo(() => {
    if (selectedCampaignIds.size === 0) return null;

    const selectedCampaignObjects = allCampaigns.filter(c => selectedCampaignIds.has(c.id));
    const selectedCampaignIdsArray = Array.from(selectedCampaignIds);

    // Aggregate metrics for selected campaigns
    const aggregatedMetrics = initialMetrics.filter(m => selectedCampaignIds.has(m.campaign_id));
    // Basic aggregation for display
    const totalSpend = aggregatedMetrics.reduce((sum, m) => sum + (m.spend ?? 0), 0);
    const totalImpressions = aggregatedMetrics.reduce((sum, m) => sum + (m.impressions ?? 0), 0);
    const totalClicks = aggregatedMetrics.reduce((sum, m) => sum + (m.clicks ?? 0), 0);
    const totalConversions = aggregatedMetrics.reduce((sum, m) => sum + (m.conversions ?? 0), 0);
    const totalRevenue = aggregatedMetrics.reduce((sum, m) => sum + (m.revenue ?? 0), 0);

    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Placeholder for time series (would need more complex aggregation)
    const timeSeriesPlaceholder = "Chart placeholder for selected campaign metrics over time.";

    // Check for optional data
    const hasMediaPlanData = initialMediaPlans.some(mp => selectedCampaignIdsArray.includes(mp.campaign_id));
    const hasCreativeInsightData = initialCreativeInsights.some(ci => selectedCampaignIdsArray.includes(ci.campaign_id));

    return {
      totalSpend, totalImpressions, totalClicks, totalConversions, totalRevenue, avgROAS, avgCPA,
      timeSeriesPlaceholder,
      hasMediaPlanData,
      hasCreativeInsightData
    };
  }, [selectedCampaignIds, allCampaigns, initialMetrics, initialMediaPlans, initialCreativeInsights]);
  // --- End Placeholder data ---

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-black text-white tracking-tight mb-6">Active Campaigns</h1>

      {/* Filters and Search */}
      <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search campaigns by name, ID, or account..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] p-3 border border-slate-700 rounded-xl bg-slate-900/80 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
        />
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="p-3 border border-slate-700 rounded-xl bg-slate-900/80 shadow-sm min-w-[150px]"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={filters.channelType}
            onChange={(e) => setFilters({ ...filters, channelType: e.target.value })}
            className="p-3 border border-slate-700 rounded-xl bg-slate-900/80 shadow-sm min-w-[180px]"
          >
            <option value="">All Channel Types</option>
            {uniqueChannelTypes.map((channelType) => (
              <option key={channelType} value={channelType}>{channelType}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaign List Section */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Campaigns ({filteredCampaigns.length})</h2>
            <button
              onClick={() => setSelectedCampaignIds(new Set(filteredCampaigns.map(c => c.id)))}
              disabled={filteredCampaigns.length === 0}
              className="text-sm font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Select All ({filteredCampaigns.length})
            </button>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
            {filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`flex items-center p-4 border rounded-2xl transition-all duration-200 cursor-pointer ${
                    selectedCampaignIds.has(campaign.id)
                      ? "bg-indigo-500/10 border-indigo-500 shadow-lg"
                      : "bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600"
                  }`}
                  onClick={() => handleSelectCampaign(campaign.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCampaignIds.has(campaign.id)}
                    onChange={() => handleSelectCampaign(campaign.id)}
                    className="mr-4 h-5 w-5 text-indigo-400 focus:ring-indigo-500 border-slate-600 rounded bg-slate-900 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-black text-lg text-white tracking-tight">{campaign.name}</p>
                      {campaignMetricsMap.has(campaign.id) && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">${fmt(campaignMetricsMap.get(campaign.id)!.reduce((sum, m) => sum + (m.spend ?? 0), 0))}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {(() => {
                              const metrics = campaignMetricsMap.get(campaign.id)!;
                              const spend = metrics.reduce((sum, m) => sum + (m.spend ?? 0), 0);
                              const revenue = metrics.reduce((sum, m) => sum + (m.revenue ?? 0), 0);
                              return spend > 0 ? `${(revenue / spend).toFixed(2)}x ROAS` : "No Spend";
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                      <span className="font-bold uppercase tracking-widest text-[10px]">ID: {campaign.id}</span>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Status: {campaign.status}</span>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Type: {campaign.channelType}</span>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Account: {campaign.customerDescriptiveName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-500">
                No campaigns match your search or filters.
              </div>
            )}
          </div>
        </div>

        {/* Action and Results Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sticky top-6 self-start">
          <h2 className="text-2xl font-black text-white tracking-tight mb-6">
            {selectedCampaignIds.size} Campaign{selectedCampaignIds.size !== 1 ? 's' : ''} Selected
          </h2>

          <div className="space-y-4 mb-8">
            <button
              onClick={handleGenerateRecommendation}
              disabled={selectedCampaignIds.size === 0 || generatingRecommendation}
              className="w-full btn-primary text-lg py-4 shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingRecommendation ? "Generating..." : "Generate Recommendations"}
            </button>
            <button
              onClick={() => setSelectedCampaignIds(new Set())}
              disabled={selectedCampaignIds.size === 0}
              className="w-full btn-secondary py-3 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Selection
            </button>
          </div>

          {/* Recommendation Results */}
          {(recommendations !== null || generatingRecommendation) && (
            <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
              <h3 className="text-xl font-black text-indigo-400 tracking-tight mb-4 flex items-center gap-2">
                <span>Generated Recommendations</span>
                {generatingRecommendation && (
                  <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                )}
              </h3>
              
              {generatingRecommendation ? (
                <p className="text-slate-400 italic">Processing selected campaigns...</p>
              ) : recommendations && recommendations.length > 0 ? (
                <div className="space-y-6">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl shadow-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-white text-lg leading-tight">{rec.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          rec.confidence > 0.8 ? "bg-green-500/20 text-green-400" : "bg-indigo-500/20 text-indigo-400"
                        }`}>
                          {Math.round(rec.confidence * 100)}% Match
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-4 leading-relaxed">{rec.reason}</p>
                      
                      {rec.evidence && Object.keys(rec.evidence).length > 0 && (
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Data Points</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(rec.evidence).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex flex-col">
                                <span className="text-[10px] text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                                <span className="text-xs font-bold text-slate-200">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No recommendations were generated for the selected campaigns.</p>
              )}
            </div>
          )}

          {/* Insights Panel */}
          <div className="mt-8 pt-8 border-t border-slate-800">
            <h3 className="text-xl font-black text-white tracking-tight mb-4">Selected Campaign Insights</h3>
            {selectedCampaignIds.size > 0 && selectedCampaignsData ? (
              <div className="space-y-6">
                {/* Aggregate Metrics */}
                <div>
                  <h4 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-3">Aggregate Metrics (Last 90 Days)</h4>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <p className="text-sm text-slate-400">Spend: <span className="font-medium">${fmt(selectedCampaignsData.totalSpend)}</span></p>
                    <p className="text-sm text-slate-400">Impressions: <span className="font-medium">{selectedCampaignsData.totalImpressions.toLocaleString()}</span></p>
                    <p className="text-sm text-slate-400">Clicks: <span className="font-medium">{selectedCampaignsData.totalClicks.toLocaleString()}</span></p>
                    <p className="text-sm text-slate-400">Conversions: <span className="font-medium">{fmt(selectedCampaignsData.totalConversions)}</span></p>
                    <p className="text-sm text-slate-400">ROAS: <span className="font-medium">{fmt(selectedCampaignsData.avgROAS)}x</span></p>
                  </div>
                </div>

                {/* Time Series Analysis (Placeholder) */}
                <div>
                  <h4 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-3">Time Series Analysis</h4>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 h-40 flex items-center justify-center">
                    {selectedCampaignsData.timeSeriesPlaceholder}
                  </div>
                </div>

                {/* Media Plan Comparison (Optional) */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <h4 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-3">Media Plan Comparison</h4>
                  {selectedCampaignsData.hasMediaPlanData ? (
                    <div className="space-y-4">
                      {initialMediaPlans.filter(mp => selectedCampaignIds.has(mp.campaign_id)).map(mp => (
                        <div key={mp.id} className="text-sm text-slate-300 border-t border-slate-700 pt-2 first:border-0 first:pt-0">
                          <p className="font-bold text-indigo-400 mb-1">{allCampaigns.find(c => c.id === mp.campaign_id)?.name}</p>
                          <div className="prose prose-invert prose-sm max-w-none line-clamp-3">
                            {mp.content_md}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Media plan data not available for selected campaigns.</p>
                  )}
                </div>

                {/* Creative Intelligence Insights (Optional) */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <h4 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-3">Creative Intelligence</h4>
                  {selectedCampaignsData.hasCreativeInsightData ? (
                    <div className="space-y-4">
                      {initialCreativeInsights.filter(ci => selectedCampaignIds.has(ci.campaign_id)).map(ci => (
                        <div key={ci.id} className="text-sm text-slate-300 border-t border-slate-700 pt-2 first:border-0 first:pt-0">
                          <p className="font-bold text-indigo-400 mb-1">{allCampaigns.find(c => c.id === ci.campaign_id)?.name}</p>
                          <div className="prose prose-invert prose-sm max-w-none line-clamp-3">
                            {ci.content_md}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Creative insights not available for selected campaigns.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Select campaigns to see detailed insights.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder utility functions for formatting, assuming they are available globally or imported
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtCurrency(n: number): string {
  // Basic currency formatting, assumes USD or generic dollar sign
  return `$${fmt(n)}`;
}
