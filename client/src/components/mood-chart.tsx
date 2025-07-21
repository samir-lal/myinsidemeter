import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ComposedChart } from 'recharts';
import type { MoodEntry } from "@shared/schema";
import { Dumbbell, Heart, Mountain, Gamepad2, TreePine, Plus } from "lucide-react";

interface MoodChartProps {
  entries: (MoodEntry & { moodScore?: number })[];
  showActivityIndicators?: boolean;
  showTooltip?: boolean;
}

export default function MoodChart({ entries, showActivityIndicators = false, showTooltip = true }: MoodChartProps) {
  // Sort entries by date and prepare time-based data
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const chartData = sortedEntries
    .slice(-30) // Last 30 entries
    .map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      moodScore: entry.moodScore || 0,
      intensity: entry.intensity,
      mood: entry.mood,
      subMood: entry.subMood || '',
      fullDate: new Date(entry.date).toLocaleDateString(),
      moonPhase: entry.moonPhase,
      activities: Array.isArray(entry.activities) ? entry.activities : [],
      timestamp: new Date(entry.date).getTime(),
      // Add activity indicators above mood score
      activityIndicator: (entry.activities && Array.isArray(entry.activities) && entry.activities.length > 0) ? (entry.moodScore || 0) + 0.5 : null
    }));



  const getActivityIcons = (activities: string[]) => {
    const activityIconMap: Record<string, any> = {
      gym: Dumbbell,
      yoga: Heart,
      meditation: Mountain,
      sports: Gamepad2,
      outdoors: TreePine,
      other: Plus
    };
    
    return activities.map(activity => activityIconMap[activity]).filter(Boolean);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const moodEmojis: Record<string, string> = {
        excited: '😆',
        happy: '😊',
        neutral: '😐',
        sad: '😢',
        anxious: '😰'
      };

      const moodColors: Record<string, string> = {
        excited: 'from-amber-500/20 to-yellow-500/20 border-amber-400/40',
        happy: 'from-emerald-500/20 to-green-500/20 border-emerald-400/40',
        neutral: 'from-slate-500/20 to-gray-500/20 border-slate-400/40',
        sad: 'from-blue-500/20 to-cyan-500/20 border-blue-400/40',
        anxious: 'from-purple-500/20 to-violet-500/20 border-purple-400/40'
      };

      return (
        <div className={`relative backdrop-blur-xl bg-gradient-to-br ${moodColors[data.mood] || 'from-slate-500/20 to-gray-500/20 border-slate-400/40'} border-2 rounded-2xl p-4 shadow-2xl min-w-48 transform transition-all duration-200 scale-105`}>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-white/5 rounded-2xl"></div>
          
          {/* Header with date and mood */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-wide">
                {data.date}
              </span>
              <div className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse"></div>
            </div>
            
            {/* Main mood display */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{moodEmojis[data.mood]}</span>
              <div>
                <p className="text-gray-900 dark:text-gray-100 font-medium capitalize text-base">
                  {data.mood}
                </p>
                {data.subMood && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                    {data.subMood}
                  </p>
                )}
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Intensity: {data.intensity}/10
                </p>
              </div>
            </div>

            {/* Mood score with visual indicator */}
            <div className="flex items-center gap-2 bg-white/20 dark:bg-black/20 rounded-lg p-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
              <span className="text-gray-800 dark:text-gray-100 text-sm font-medium">
                Mood Score: {data.moodScore?.toFixed(1)}
              </span>
            </div>

            {/* Moon phase if available */}
            {data.moonPhase && (
              <div className="flex items-center gap-2 bg-white/20 dark:bg-black/20 rounded-lg p-2">
                <span className="text-lg">🌙</span>
                <span className="text-gray-800 dark:text-gray-100 text-sm capitalize">
                  {data.moonPhase.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Activities section */}
            {data.activities && data.activities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">Activities:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.activities.map((activity: string, index: number) => {
                    const activityLabels: Record<string, string> = {
                      gym: 'Gym',
                      yoga: 'Yoga', 
                      meditation: 'Meditation',
                      sports: 'Sports',
                      outdoors: 'Outdoors',
                      other: 'Other'
                    };
                    
                    const activityColors: Record<string, string> = {
                      gym: 'bg-red-500/30 text-red-800 dark:text-red-100 border-red-400/50',
                      yoga: 'bg-cyan-500/30 text-cyan-800 dark:text-cyan-100 border-cyan-400/50',
                      meditation: 'bg-purple-500/30 text-purple-800 dark:text-purple-100 border-purple-400/50',
                      sports: 'bg-amber-500/30 text-amber-800 dark:text-amber-100 border-amber-400/50',
                      outdoors: 'bg-emerald-500/30 text-emerald-800 dark:text-emerald-100 border-emerald-400/50',
                      other: 'bg-slate-500/30 text-slate-800 dark:text-slate-100 border-slate-400/50'
                    };
                    
                    return (
                      <span 
                        key={index} 
                        className={`text-xs px-2.5 py-1 rounded-full border backdrop-blur-sm font-medium ${activityColors[activity] || activityColors.other}`}
                      >
                        {activityLabels[activity] || activity}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--lunar)]/60">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No mood data available yet.</p>
          <p className="text-sm">Start tracking to see your mood patterns!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/30 dark:border-purple-700/30 p-3 sm:p-4 shadow-sm">
      <div className="h-48 sm:h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 30 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(139, 92, 246, 0.15)" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              stroke="rgba(139, 92, 246, 0.6)"
              fontSize={10}
              tick={{ fill: 'rgba(139, 92, 246, 0.8)', fontSize: 10 }}
              textAnchor="middle"
              height={25}
              axisLine={{ stroke: 'rgba(139, 92, 246, 0.2)' }}
              tickLine={{ stroke: 'rgba(139, 92, 246, 0.2)' }}
              tickFormatter={(value, index) => {
                if (index === 0) return chartData[0]?.date || '';
                if (index === chartData.length - 1) return chartData[chartData.length - 1]?.date || '';
                return '';
              }}
              interval={0}
            />
            <YAxis 
              domain={[0, 5]}
              stroke="rgba(139, 92, 246, 0.6)"
              fontSize={9}
              tick={{ fill: 'rgba(139, 92, 246, 0.8)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(139, 92, 246, 0.2)' }}
              tickLine={{ stroke: 'rgba(139, 92, 246, 0.2)' }}
              width={20}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Line
              type="monotone"
              dataKey="moodScore"
              stroke="url(#moodGradient)"
              strokeWidth={2.5}
              dot={{ 
                fill: '#8B5CF6', 
                strokeWidth: 1.5, 
                r: 3,
                stroke: '#ffffff'
              }}
              activeDot={false}
            />
            
            {/* Activity indicators as scatter points - only show when enabled */}
            {showActivityIndicators && (
              <Scatter
                dataKey="activityIndicator"
                fill="#ef4444"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload.activities || !Array.isArray(payload.activities) || payload.activities.length === 0) return null;
                  
                  return payload.activities.map((activity: string, index: number) => {
                    const activityColors: Record<string, string> = {
                      gym: '#ef4444',
                      yoga: '#06b6d4', 
                      meditation: '#8b5cf6',
                      sports: '#f59e0b',
                      outdoors: '#10b981',
                      other: '#6b7280'
                    };
                    
                    const yPos = cy - (index * 6);
                    return (
                      <circle
                        key={`${payload.date}-${activity}-${index}`}
                        cx={cx}
                        cy={yPos}
                        r={3}
                        fill={activityColors[activity] || '#6b7280'}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  });
                }}
              />
            )}
            
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Mobile-friendly legend */}
      <div className="mt-2 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            <span>Trend</span>
          </div>
          <div className="text-gray-400">•</div>
          <div className="text-purple-600 dark:text-purple-400 font-medium">
            {chartData.length} entries
          </div>
        </div>
      </div>
    </div>
  );
}
