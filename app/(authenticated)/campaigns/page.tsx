"use client";

import { useState, useEffect } from "react";
import { CampaignInfo } from "@/lib/googleAds";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [genType, setGenType] = useState<"pulse" | "budget_adjust" | "client_update">("pulse");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateForCampaign = async () => {
    if (!selectedCampaign) return;

    setGenerating(true);
    setGeneratedContent(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          type: genType,
          date: new Date().toISOString().slice(0, 10),
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setGeneratedContent(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-8">Loading campaigns...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-6xl p-8">
      <h1 className="text-3xl font-bold mb-6">Campaigns</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Campaign List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a Campaign</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`p-4 border rounded cursor-pointer ${
                  selectedCampaign === campaign.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setSelectedCampaign(campaign.id)}
              >
                <div className="font-medium">{campaign.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ID: {campaign.id} | Status: {campaign.status} | Type: {campaign.channelType}
                </div>
                <div className="text-xs text-gray-500">
                  Account: {campaign.customerDescriptiveName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generation Panel */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Generate Report</h2>

          {selectedCampaign && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Report Type</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                >
                  <option value="pulse">Performance Pulse</option>
                  <option value="budget_adjust">Budget & Flighting Adjust</option>
                  <option value="client_update">Client Update</option>
                </select>
              </div>

              <button
                onClick={generateForCampaign}
                disabled={generating}
                className="w-full btn-primary disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Report"}
              </button>
            </div>
          )}

          {!selectedCampaign && (
            <p className="text-gray-500">Select a campaign to generate a report.</p>
          )}
        </div>
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Generated Report</h2>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">{generatedContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
}