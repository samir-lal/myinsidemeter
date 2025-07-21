import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MoodEntry } from "@shared/schema";
import { useState } from 'react';

interface LunarCorrelationChartProps {
  entries: (MoodEntry & { moodScore?: number })[];
}

export default function LunarCorrelationChart({ entries }: LunarCorrelationChartProps) {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  // Group entries by date and calculate daily averages
  const dailyData = entries.reduce((acc, entry) => {
    const dateKey = new Date(entry.date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        moodScores: [],
        moonPhase: entry.moonPhase ?? undefined,
        moonIllumination: entry.moonIllumination ?? undefined
      };
    }
    acc[dateKey].moodScores.push(entry.moodScore || 0);
    return acc;
  }, {} as Record<string, { date: string; moodScores: number[]; moonPhase?: string; moonIllumination?: number }>);

  // Calculate average mood score per day and moon phase numeric value
  const chartData = Object.values(dailyData).map(day => {
    const avgMoodScore = day.moodScores.reduce((sum, score) => sum + score, 0) / day.moodScores.length;
    
    // Convert moon phase to numeric value for Y-axis
    const phaseMap: Record<string, number> = {
      'new_moon': 0,
      'waxing_crescent': 1,
      'first_quarter': 2,
      'waxing_gibbous': 3,
      'full_moon': 4,
      'waning_gibbous': 5,
      'third_quarter': 6,
      'waning_crescent': 7
    };

    const moonPhaseName = day.moonPhase ? day.moonPhase.replace('_', ' ') : 'unknown';

    return {
      avgMoodScore: Number(avgMoodScore.toFixed(1)),
      moonPhaseValue: day.moonPhase ? phaseMap[day.moonPhase] || 0 : 0,
      moonPhaseName,
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      illumination: day.moonIllumination || 0,
      entryCount: day.moodScores.length,
      isHighlighted: selectedPhase ? moonPhaseName === selectedPhase : false
    };
  }).filter(data => data.avgMoodScore > 0);

  // Calculate phase statistics
  const phaseStats = chartData.reduce((acc, data) => {
    const phase = data.moonPhaseName;
    if (!acc[phase]) {
      acc[phase] = { total: 0, count: 0, entries: [] };
    }
    acc[phase].total += data.avgMoodScore;
    acc[phase].count += 1;
    acc[phase].entries.push(data);
    return acc;
  }, {} as Record<string, { total: number; count: number; entries: any[] }>);

  const phaseAverages = Object.entries(phaseStats).map(([phase, stats]) => ({
    phase,
    average: (stats.total / stats.count).toFixed(1),
    count: stats.count,
    entries: stats.entries
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const phaseEmojis: Record<string, string> = {
        'new moon': '🌑',
        'waxing crescent': '🌒',
        'first quarter': '🌓',
        'waxing gibbous': '🌔',
        'full moon': '🌕',
        'waning gibbous': '🌖',
        'third quarter': '🌗',
        'waning crescent': '🌘'
      };

      // Get mood color based on score
      const getMoodColor = (score: number) => {
        if (score >= 4) return 'from-amber-400 to-yellow-500';
        if (score >= 3) return 'from-emerald-400 to-green-500';
        if (score >= 2) return 'from-slate-400 to-gray-500';
        if (score >= 1) return 'from-blue-400 to-indigo-500';
        return 'from-purple-400 to-violet-500';
      };

      return (
        <div className="relative pointer-events-none">
          {/* Glassmorphism tooltip */}
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-amber-200/30 dark:border-amber-400/20 p-4 rounded-2xl shadow-2xl min-w-[200px] pointer-events-none">
            {/* Date header with gradient */}
            <div className={`bg-gradient-to-r ${getMoodColor(data.avgMoodScore)} text-white text-center py-2 px-3 rounded-xl mb-3 font-semibold text-sm`}>
              {data.date}
            </div>
            
            {/* Moon phase with large emoji */}
            <div className="flex items-center justify-center mb-3">
              <span className="text-4xl mr-2">{phaseEmojis[data.moonPhaseName]}</span>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">
                  {data.moonPhaseName}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {data.illumination}% illuminated
                </div>
              </div>
            </div>

            {/* Mood score with visual bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mood Score</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{data.avgMoodScore}/5.0</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getMoodColor(data.avgMoodScore)} rounded-full transition-all duration-300`}
                  style={{ width: `${(data.avgMoodScore / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Entry count */}
            <div className="text-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                {data.entryCount} {data.entryCount === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <div className="w-2 h-2 bg-white/90 dark:bg-gray-900/90 border-r border-b border-amber-200/30 dark:border-amber-400/20 rotate-45"></div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🌙</div>
          <p>No correlation data available yet.</p>
          <p className="text-sm">Track moods over multiple days to see lunar patterns!</p>
        </div>
      </div>
    );
  }

  const phaseEmojis: Record<string, string> = {
    'new moon': '🌑',
    'waxing crescent': '🌒',
    'first quarter': '🌓',
    'waxing gibbous': '🌔',
    'full moon': '🌕',
    'waning gibbous': '🌖',
    'third quarter': '🌗',
    'waning crescent': '🌘'
  };

  return (
    <div className="space-y-6 flex flex-col items-center">
      {/* Interactive Phase Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setSelectedPhase(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedPhase === null 
              ? 'bg-amber-500 text-white shadow-lg scale-105' 
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
          }`}
        >
          All Phases
        </button>
        {phaseAverages.map((phase) => (
          <button
            key={phase.phase}
            onClick={() => setSelectedPhase(phase.phase)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
              selectedPhase === phase.phase 
                ? 'bg-amber-500 text-white shadow-lg scale-105' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
            }`}
          >
            <span>{phaseEmojis[phase.phase]}</span>
            <span className="capitalize">{phase.phase.replace(' ', '')}</span>
            <span className="bg-white/20 px-1 rounded text-xs">{phase.count}</span>
          </button>
        ))}
      </div>

      {/* Enhanced Chart Area */}
      <div className="relative h-96 w-full max-w-lg mx-auto p-6 bg-gradient-to-br from-amber-50/20 via-orange-50/10 to-yellow-50/15 dark:from-amber-900/10 dark:via-orange-900/5 dark:to-yellow-900/10 rounded-2xl border border-amber-200/20 dark:border-amber-400/10 backdrop-blur-sm shadow-xl">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_50%)] rounded-2xl"></div>
        
        {/* Chart container */}
        <div className="relative h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              data={selectedPhase ? chartData.filter(d => d.moonPhaseName === selectedPhase) : chartData} 
              margin={{ top: 20, right: 30, left: 70, bottom: 70 }}
            >
              {/* Enhanced grid */}
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(245, 158, 11, 0.2)" 
                horizontal={true}
                vertical={true}
              />
              
              {/* Enhanced X-axis */}
              <XAxis 
                dataKey="avgMoodScore"
                domain={[0, 5]}
                type="number"
                stroke="rgba(245, 158, 11, 0.8)"
                fontSize={12}
                tick={{ fill: 'rgba(245, 158, 11, 0.9)', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(245, 158, 11, 0.5)', strokeWidth: 2 }}
                tickLine={{ stroke: 'rgba(245, 158, 11, 0.5)' }}
                label={{ 
                  value: 'Average Daily Mood Score', 
                  position: 'insideBottom', 
                  offset: -15, 
                  style: { textAnchor: 'middle', fill: 'rgba(245, 158, 11, 0.9)', fontSize: 13, fontWeight: 600 } 
                }}
              />
              
              {/* Enhanced Y-axis */}
              <YAxis 
                dataKey="moonPhaseValue"
                domain={[0, 7]}
                type="number"
                stroke="rgba(245, 158, 11, 0.8)"
                fontSize={12}
                tick={{ fill: 'rgba(245, 158, 11, 0.9)', fontSize: 10, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(245, 158, 11, 0.5)', strokeWidth: 2 }}
                tickLine={{ stroke: 'rgba(245, 158, 11, 0.5)' }}
                tickFormatter={(value) => {
                  const phases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
                  return phases[value] || '';
                }}
                label={{ 
                  value: 'Moon Phase', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle', fill: 'rgba(245, 158, 11, 0.9)', fontSize: 13, fontWeight: 600 } 
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Enhanced scatter points */}
              <Scatter
                dataKey="moonPhaseValue"
                fill="#F59E0B"
                stroke="#ffffff"
                strokeWidth={2}
                r={10}
                opacity={0.8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Floating stats when phase is selected */}
        {selectedPhase && (
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-amber-200/30 dark:border-amber-400/20 p-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{phaseEmojis[selectedPhase]}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">
                  {selectedPhase}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {phaseAverages.find(p => p.phase === selectedPhase)?.count || 0} entries
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              Avg: {phaseAverages.find(p => p.phase === selectedPhase)?.average || '0.0'}/5.0
            </div>
          </div>
        )}
      </div>

      {/* Phase correlation insights */}
      {phaseAverages.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-900/20 dark:to-orange-900/10 p-4 rounded-xl border border-amber-200/20 dark:border-amber-400/10">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
            <span className="text-lg">🌙</span>
            Lunar Mood Insights
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {phaseAverages.map((item) => (
              <button
                key={item.phase}
                onClick={() => setSelectedPhase(item.phase === selectedPhase ? null : item.phase)}
                className={`p-3 rounded-lg transition-all duration-200 ${
                  selectedPhase === item.phase
                    ? 'bg-amber-200 dark:bg-amber-800/50 shadow-lg scale-105'
                    : 'bg-white/60 dark:bg-gray-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                } border border-amber-200/30 dark:border-amber-400/20`}
              >
                <div className="text-center">
                  <div className="text-xl mb-1">{phaseEmojis[item.phase]}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mb-1 capitalize font-medium">
                    {item.phase.replace(' ', ' ')}
                  </div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {item.average}
                  </div>
                  <div className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {item.count} entries
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}