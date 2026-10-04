import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "./api";

/** Live registrations + colleges, refetched every 60 s (PRD §4.2 M1). */
export function useStats() {
  return useQuery({
    queryKey: ["stats", "public"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}
