"use client";

import { RecommendationCard } from "@/components/RecommendationCard";

export function RecommendationCardWrapper({
  recommendation,
  isPro,
}: {
  recommendation: any;
  isPro: boolean;
}) {
  const handleStatusUpdate = async (id: string, status: string) => {
    if (!isPro) return;
    
    await fetch("/api/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  };

  return (
    <RecommendationCard
      {...recommendation}
      isPro={isPro}
      onStatusUpdate={handleStatusUpdate}
    />
  );
}
