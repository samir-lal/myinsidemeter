import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, TrendingUp, BarChart3, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { MoodEntry } from "@shared/schema";

interface MoonMoodReportProps {
  days?: number;
}

export default function MoonMoodReport({ days = 180 }: MoonMoodReportProps) {
  const { data: analytics } = useQuery<{
    totalEntries: number;
    averageMood: number;
    moodsByPhase: Record<string, { count: number; totalIntensity: number }>;
    moodDistribution: Record<string, number>;
    periodDays: number;
  }>({
    queryKey: ["/api/mood-analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/mood-analytics?days=${days}`);
      return res.json();
    }
  });

  const { data: moodEntries = [] } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood-entries", days],
    queryFn: async () => {
      const res = await fetch(`/api/mood-entries?limit=${days * 2}`);
      return res.json();
    }
  });

  const getMoonPhaseEmoji = (phase: string) => {
    const phaseEmojis: Record<string, string> = {
      'new': '🌑',
      'waxing_crescent': '🌒',
      'first_quarter': '🌓',
      'waxing_gibbous': '🌔',
      'full': '🌕',
      'waning_gibbous': '🌖',
      'last_quarter': '🌗',
      'waning_crescent': '🌘'
    };
    return phaseEmojis[phase] || '🌑';
  };

  const formatPhaseName = (phase: string) => {
    return phase.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      excited: '#f59e0b',
      happy: '#10b981',
      neutral: '#6b7280',
      sad: '#3b82f6',
      anxious: '#8b5cf6'
    };
    return moodColors[mood] || '#6b7280';
  };

  const generateLunarCycleData = () => {
    if (!moodEntries.length) return [];
    
    // Group entries by lunar cycle (approximately 29.5 days)
    const cycles: { [key: number]: MoodEntry[] } = {};
    const cycleLength = 29.5;
    
    moodEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const daysSinceEpoch = Math.floor(entryDate.getTime() / (1000 * 60 * 60 * 24));
      const cycleNumber = Math.floor(daysSinceEpoch / cycleLength);
      
      if (!cycles[cycleNumber]) cycles[cycleNumber] = [];
      cycles[cycleNumber].push(entry);
    });

    return Object.entries(cycles).map(([cycle, entries]) => {
      const avgMood = entries.reduce((sum, entry) => sum + entry.intensity, 0) / entries.length;
      return {
        cycle: `Cycle ${cycle}`,
        averageMood: Number(avgMood.toFixed(1)),
        entriesCount: entries.length
      };
    }).slice(-6); // Last 6 cycles
  };

  const generateCorrelationInsights = () => {
    if (!analytics?.moodsByPhase || Object.keys(analytics.moodsByPhase).length === 0) {
      return [];
    }

    const phaseAverages = Object.entries(analytics.moodsByPhase).map(([phase, data]) => ({
      phase,
      average: data.totalIntensity / data.count,
      count: data.count
    })).sort((a, b) => b.average - a.average);

    const insights = [];
    
    if (phaseAverages.length >= 3) {
      const highest = phaseAverages[0];
      const lowest = phaseAverages[phaseAverages.length - 1];
      
      insights.push({
        type: 'best',
        phase: highest.phase,
        average: highest.average.toFixed(1),
        message: `Your mood is typically highest during ${formatPhaseName(highest.phase)} (${highest.average.toFixed(1)}/10 average)`
      });

      insights.push({
        type: 'challenging',
        phase: lowest.phase,
        average: lowest.average.toFixed(1),
        message: `${formatPhaseName(lowest.phase)} phases tend to be more challenging (${lowest.average.toFixed(1)}/10 average)`
      });

      // Find significant differences
      const difference = highest.average - lowest.average;
      if (difference > 1.5) {
        insights.push({
          type: 'pattern',
          phase: '',
          average: difference.toFixed(1),
          message: `Strong lunar correlation detected! Your mood varies by ${difference.toFixed(1)} points across moon phases`
        });
      }
    }

    return insights;
  };

  const lunarCycleData = generateLunarCycleData();
  const correlationInsights = generateCorrelationInsights();

  if (!analytics || analytics.totalEntries === 0) {
    return (
      <Card className="glassmorphism border-[var(--lunar)]/20 p-8 text-center">
        <Moon className="mx-auto mb-4 text-[var(--lunar)]/40" size={48} />
        <h3 className="text-lg font-medium mb-2">No Data Available</h3>
        <p className="text-[var(--lunar)]/60">
          Track your moods for {days} days to see your lunar correlation report.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold flex items-center justify-center gap-2 mb-2">
          <Moon className="text-[var(--moon)]" size={24} />
          {days}-Day Moon & Mood Report
        </h3>
        <p className="text-[var(--lunar)]/70">
          Analyzing {analytics.totalEntries} mood entries across {analytics.periodDays} days
        </p>
      </div>

      {/* Key Insights */}
      {correlationInsights.length > 0 && (
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-[var(--lunar-accent)]" size={18} />
            Key Insights
          </h4>
          <div className="space-y-3">
            {correlationInsights.map((insight, index) => (
              <div key={index} className={`p-3 rounded-lg ${
                insight.type === 'best' ? 'bg-green-500/10 border border-green-500/20' :
                insight.type === 'challenging' ? 'bg-blue-500/10 border border-blue-500/20' :
                'bg-[var(--lunar-accent)]/10 border border-[var(--lunar-accent)]/20'
              }`}>
                <p className="text-sm">
                  {insight.phase && getMoonPhaseEmoji(insight.phase)} {insight.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Moon Phase Correlation Chart */}
      {analytics.moodsByPhase && Object.keys(analytics.moodsByPhase).length > 0 && (
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="text-[var(--lunar-accent)]" size={18} />
            Mood by Moon Phase
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(analytics.moodsByPhase).map(([phase, data]) => ({
                phase: formatPhaseName(phase),
                average: Number((data.totalIntensity / data.count).toFixed(1)),
                count: data.count,
                emoji: getMoonPhaseEmoji(phase)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.1)" />
                <XAxis 
                  dataKey="phase" 
                  stroke="var(--lunar)"
                  fontSize={10}
                  tick={{ fill: 'var(--lunar)' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[1, 10]}
                  stroke="var(--lunar)"
                  fontSize={12}
                  tick={{ fill: 'var(--lunar)' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--space)',
                    border: '1px solid var(--lunar)',
                    borderRadius: '8px',
                    color: 'var(--lunar)'
                  }}
                  formatter={(value: number) => [
                    `${value}/10 average mood`, 
                    'Average Mood'
                  ]}
                  labelFormatter={(label: string, payload: any[]) => 
                    (payload?.[0]?.payload?.emoji || '') + ' ' + label
                  }
                />
                <Bar 
                  dataKey="average" 
                  fill="var(--lunar-accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Lunar Cycle Trends */}
      {lunarCycleData.length > 0 && (
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="text-[var(--lunar-accent)]" size={18} />
            Lunar Cycle Trends
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lunarCycleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.1)" />
                <XAxis 
                  dataKey="cycle" 
                  stroke="var(--lunar)"
                  fontSize={12}
                  tick={{ fill: 'var(--lunar)' }}
                />
                <YAxis 
                  domain={[1, 10]}
                  stroke="var(--lunar)"
                  fontSize={12}
                  tick={{ fill: 'var(--lunar)' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--space)',
                    border: '1px solid var(--lunar)',
                    borderRadius: '8px',
                    color: 'var(--lunar)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="averageMood"
                  stroke="var(--moon)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--moon)', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: 'var(--lunar-accent)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Phase Summary Grid */}
      {analytics.moodsByPhase && Object.keys(analytics.moodsByPhase).length > 0 && (
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
          <h4 className="font-semibold mb-4">Phase Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.moodsByPhase)
              .sort(([,a], [,b]) => (b.totalIntensity / b.count) - (a.totalIntensity / a.count))
              .map(([phase, data]) => (
              <div key={phase} className="text-center p-3 rounded-lg bg-[var(--lunar)]/5">
                <div className="text-2xl mb-1">{getMoonPhaseEmoji(phase)}</div>
                <div className="text-sm font-medium">{formatPhaseName(phase)}</div>
                <div className="text-lg font-bold text-[var(--lunar-accent)]">
                  {(data.totalIntensity / data.count).toFixed(1)}/10
                </div>
                <div className="text-xs text-[var(--lunar)]/60">{data.count} entries</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
        <h4 className="font-semibold mb-4">Personalized Recommendations</h4>
        <div className="space-y-3 text-sm">
          {correlationInsights.length > 0 ? (
            <>
              <p className="text-[var(--lunar)]/80">
                Based on your {days}-day tracking pattern:
              </p>
              <ul className="space-y-2 text-[var(--lunar)]/70">
                <li>• Plan important activities during your optimal moon phases</li>
                <li>• Practice extra self-care during challenging lunar periods</li>
                <li>• Continue tracking to strengthen pattern recognition</li>
                <li>• Consider moon phase timing for major decisions</li>
              </ul>
            </>
          ) : (
            <p className="text-[var(--lunar)]/70">
              Continue tracking for a few more weeks to discover your unique lunar patterns. 
              Most people need at least 60-90 days of data to see clear correlations.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}