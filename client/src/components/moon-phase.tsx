import { useQuery } from "@tanstack/react-query";
import type { MoonPhase as MoonPhaseType } from "@shared/schema";

export default function MoonPhase() {
  const { data: moonPhase, isLoading } = useQuery<MoonPhaseType>({
    queryKey: ["/api/moon/current"],
    queryFn: async () => {
      const res = await fetch("/api/moon/current");
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - fresh for entire day
    refetchInterval: false, // No automatic refetching during the day
    refetchOnWindowFocus: false, // Don't refetch when returning to app
  });

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-full animate-pulse" />
        <p className="text-lg font-medium">Loading...</p>
      </div>
    );
  }

  if (!moonPhase) {
    return (
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-full" />
        <p className="text-lg font-medium">Unable to load moon phase</p>
      </div>
    );
  }

  const getMoonPhaseClass = (phase: string) => {
    const phaseClass = `moon-phase-${phase.replace('_', '-')}`;
    return `w-32 h-32 rounded-full mx-auto mb-4 moon-glow ${phaseClass}`;
  };

  return (
    <div className="text-center">
      <div className={getMoonPhaseClass(moonPhase.phase)} />
      <p className="text-lg font-medium">{moonPhase.name}</p>
      <p className="text-sm text-[var(--lunar)]/70">
        {Math.round(moonPhase.illumination)}% Illuminated
      </p>
    </div>
  );
}
