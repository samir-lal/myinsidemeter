import type { MoodEntry } from "@shared/schema";

export interface MoodAnalytics {
  averageMood: number;
  moodDistribution: Record<string, number>;
  moodsByPhase: Record<string, { count: number; totalMoodScore: number }>;
  totalEntries: number;
  streak: number;
}

// Centralized mood score calculation for consistency across the app
export function calculateMoodScore(mood: string, intensity: number, subMood?: string | null): number {
  const moodRankings: Record<string, number> = {
    'sad': 1,
    'anxious': 2,
    'neutral': 3,
    'happy': 4,
    'excited': 5
  };
  
  const ranking = moodRankings[mood.toLowerCase()] || 3;
  let baseScore = ranking * (intensity / 10);
  
  // Sub-mood adjustments to add nuance to the calculation
  if (subMood && subMood.trim() !== '') {
    const subMoodModifiers: Record<string, number> = {
      // Positive sub-moods (boost the score slightly)
      'euphoric': 0.3, 'energetic': 0.2, 'content': 0.1, 'joyful': 0.2, 'peaceful': 0.15,
      'optimistic': 0.2, 'grateful': 0.15, 'confident': 0.2, 'inspired': 0.25, 'serene': 0.1,
      'hopeful': 0.15, 'enthusiastic': 0.2, 'accomplished': 0.2, 'loved': 0.15, 'calm': 0.1,
      
      // Negative sub-moods (reduce the score slightly)
      'overwhelmed': -0.3, 'irritated': -0.2, 'disappointed': -0.2, 'worried': -0.25, 'lonely': -0.3,
      'frustrated': -0.25, 'stressed': -0.3, 'sad': -0.2, 'angry': -0.25, 'fearful': -0.3,
      'depressed': -0.4, 'anxious': -0.25, 'exhausted': -0.2, 'rejected': -0.3, 'guilty': -0.2,
      
      // Neutral sub-moods (minimal adjustment)
      'tired': -0.1, 'focused': 0.05, 'curious': 0.05, 'thoughtful': 0.05, 'restless': -0.05
    };
    
    const modifier = subMoodModifiers[subMood.toLowerCase()] || 0;
    baseScore = Math.max(0, Math.min(5, baseScore + modifier)); // Keep within 0-5 range
  }
  
  return Math.round(baseScore * 100) / 100; // Round to 2 decimal places
}

export function calculateMoodAnalytics(entries: MoodEntry[]): MoodAnalytics {
  if (entries.length === 0) {
    return {
      averageMood: 0,
      moodDistribution: {},
      moodsByPhase: {},
      totalEntries: 0,
      streak: 0
    };
  }

  // Calculate average mood using centralized function
  const totalMoodScore = entries.reduce((sum, entry) => {
    return sum + calculateMoodScore(entry.mood, entry.intensity, entry.subMood);
  }, 0);
  const averageMood = totalMoodScore / entries.length;

  const moodDistribution = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const moodsByPhase = entries.reduce((acc, entry) => {
    if (entry.moonPhase) {
      if (!acc[entry.moonPhase]) {
        acc[entry.moonPhase] = { count: 0, totalMoodScore: 0 };
      }
      acc[entry.moonPhase].count++;
      
      // Use centralized mood score calculation for consistency
      acc[entry.moonPhase].totalMoodScore += calculateMoodScore(entry.mood, entry.intensity, entry.subMood);
    }
    return acc;
  }, {} as Record<string, { count: number; totalMoodScore: number }>);

  const streak = calculateStreak(entries);

  return {
    averageMood,
    moodDistribution,
    moodsByPhase,
    totalEntries: entries.length,
    streak
  };
}

export function calculateStreak(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;

  // Group entries by date to handle multiple entries per day
  const entriesByDate = new Map<string, MoodEntry[]>();
  entries.forEach(entry => {
    const dateKey = new Date(entry.date).toDateString();
    if (!entriesByDate.has(dateKey)) {
      entriesByDate.set(dateKey, []);
    }
    entriesByDate.get(dateKey)!.push(entry);
  });

  // Sort unique dates in descending order
  const sortedDates = Array.from(entriesByDate.keys())
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const entryDate of sortedDates) {
    entryDate.setHours(0, 0, 0, 0);
    
    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (entryDate.getTime() < expectedDate.getTime()) {
      // Gap found, streak broken
      break;
    }
  }

  return streak;
}

export function getMoodColor(mood: string): string {
  const moodColors: Record<string, string> = {
    excited: '#f59e0b', // yellow-500
    happy: '#10b981',   // emerald-500
    neutral: '#6b7280', // gray-500
    sad: '#3b82f6',     // blue-500
    anxious: '#8b5cf6'  // purple-500
  };
  
  return moodColors[mood] || '#6b7280';
}

export function getMoodEmoji(mood: string): string {
  const moodEmojis: Record<string, string> = {
    excited: '😆',
    happy: '😊',
    neutral: '😐',
    sad: '😢',
    anxious: '😰'
  };
  
  return moodEmojis[mood] || '😐';
}

export function generateMoodInsights(analytics: MoodAnalytics): string[] {
  const insights: string[] = [];
  
  if (analytics.totalEntries >= 7) {
    if (analytics.averageMood >= 7) {
      insights.push("You've been maintaining a positive mood consistently!");
    } else if (analytics.averageMood < 5) {
      insights.push("Consider tracking patterns to identify what affects your mood.");
    }
  }
  
  if (analytics.streak >= 7) {
    insights.push(`Great job! You've tracked your mood for ${analytics.streak} days in a row.`);
  }
  
  // Moon phase insights
  const phaseAverages = Object.entries(analytics.moodsByPhase).map(([phase, data]) => ({
    phase,
    average: data.totalMoodScore / data.count
  }));
  
  if (phaseAverages.length >= 3) {
    const sorted = phaseAverages.sort((a, b) => b.average - a.average);
    const bestPhase = sorted[0];
    insights.push(`Your mood tends to be highest during ${bestPhase.phase.replace('_', ' ')} phases.`);
  }
  
  return insights;
}

export function exportMoodData(entries: MoodEntry[], analytics: MoodAnalytics): string {
  const exportData = {
    exportDate: new Date().toISOString(),
    summary: {
      totalEntries: analytics.totalEntries,
      averageMood: analytics.averageMood,
      currentStreak: analytics.streak,
      trackingPeriod: entries.length > 0 ? {
        start: entries[entries.length - 1].date,
        end: entries[0].date
      } : null
    },
    analytics,
    entries: entries.map(entry => ({
      date: entry.date,
      mood: entry.mood,
      subMood: entry.subMood || '',
      intensity: entry.intensity,
      notes: entry.notes,
      activities: entry.activities || [],
      moonPhase: entry.moonPhase,
      moonIllumination: entry.moonIllumination
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}
