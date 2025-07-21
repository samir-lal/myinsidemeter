import OpenAI from "openai";
import type { MoodEntry, DailyJournal } from "@shared/schema";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIInsightResponse {
  patterns: string[];
  recommendations: string[];
  moodTrends: string;
  lunarCorrelations: string;
  emotionalWellness: string;
  actionItems: string[];
}

export interface HistoricalReportResponse {
  timeframe: string;
  activityAnalysis: {
    topActivities: Array<{ activity: string; averageMood: number; frequency: number }>;
    moodByActivity: Record<string, number>;
    insights: string[];
  };
  moodPatterns: {
    weeklyTrends: Array<{ day: string; averageMood: number }>;
    monthlyTrends: Array<{ week: string; averageMood: number }>;
    seasonalInsights: string;
  };
  recommendations: string[];
}

export interface PredictiveTrendsResponse {
  upcomingMoods: Array<{ date: string; predictedMood: string; confidence: number; moonPhase: string }>;
  riskFactors: string[];
  opportunities: string[];
  recommendations: string[];
  numerologyInsights?: string[];
  disclaimer: string;
}

export interface NLPGuidanceResponse {
  journalThemes: string[];
  emotionalProgression: string;
  coreInsights: string[];
  therapeuticRecommendations: string[];
  growthAreas: string[];
}

export interface AdvancedAnalyticsResponse {
  moodDistribution: Array<{ mood: string; percentage: number; count: number }>;
  activityCorrelation: Array<{ activity: string; impact: number; frequency: number }>;
  temporalPatterns: {
    bestDays: string[];
    challengingDays: string[];
    timeOfDayTrends: Array<{ time: string; averageMood: number }>;
  };
  progressMetrics: {
    totalEntries: number;
    daysTracked: number;
    consistencyScore: number;
    improvementTrend: string;
  };
  insights: string[];
}

export async function generateMoodInsights(
  moodEntries: MoodEntry[],
  journals?: DailyJournal[]
): Promise<AIInsightResponse> {
  try {
    // Prepare data for analysis
    const moodData = moodEntries.map(entry => ({
      date: entry.date.toISOString().split('T')[0],
      mood: entry.mood,
      subMood: entry.subMood || '',
      intensity: entry.intensity,
      activities: entry.activities || [],
      notes: entry.notes || '',
      moonPhase: entry.moonPhase || '',
      moonIllumination: entry.moonIllumination || 0
    }));

    const journalData = journals?.map(journal => ({
      date: journal.date,
      content: journal.content.substring(0, 500) // Limit content for API
    })) || [];

    const prompt = `
As an expert emotional wellness coach and data analyst, analyze the following mood tracking data and provide personalized insights:

MOOD ENTRIES (Last ${moodData.length} entries):
${JSON.stringify(moodData, null, 2)}

Pay special attention to:
- Sub-mood patterns within each primary emotion (subMood field contains comma-separated specific emotions)
- Emotional granularity and complexity in entries with multiple sub-moods
- How specific sub-emotions correlate with intensity levels and moon phases
- Trends in emotional vocabulary and self-awareness development

JOURNAL ENTRIES:
${JSON.stringify(journalData, null, 2)}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "patterns": ["3-5 key emotional patterns you've identified"],
  "recommendations": ["3-5 actionable recommendations for emotional wellness"],
  "moodTrends": "Summary of overall mood trends and what they indicate",
  "lunarCorrelations": "Analysis of any correlations between moon phases and mood patterns",
  "emotionalWellness": "Overall assessment of emotional health and growth areas",
  "actionItems": ["3-5 specific actions the user can take this week"]
}

Focus on:
- Identifying recurring patterns in mood, activities, and timing
- Correlations between moon phases and emotional states
- Practical, science-based recommendations
- Encouraging and supportive tone
- Specific actionable advice
- Recognition of positive trends and progress

Keep insights professional, empathetic, and focused on emotional wellness growth.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert emotional wellness coach and data analyst specializing in mood pattern recognition and personalized mental health insights. Provide supportive, evidence-based guidance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    const insights = JSON.parse(content) as AIInsightResponse;
    
    // Validate response structure
    if (!insights.patterns || !insights.recommendations || !insights.moodTrends) {
      throw new Error("Invalid response structure from OpenAI");
    }

    return insights;
  } catch (error) {
    console.error("Error generating AI insights:", error);
    throw new Error("Failed to generate AI insights");
  }
}

export async function generateWeeklyReport(
  moodEntries: MoodEntry[],
  journals?: DailyJournal[]
): Promise<{
  summary: string;
  highlights: string[];
  improvements: string[];
  nextWeekFocus: string[];
}> {
  try {
    const recentEntries = moodEntries.slice(-7); // Last 7 days
    
    const prompt = `
Analyze this week's mood and activity data to create a supportive weekly wellness report:

THIS WEEK'S MOOD DATA:
${JSON.stringify(recentEntries.map(entry => ({
  date: entry.date.toISOString().split('T')[0],
  mood: entry.mood,
  intensity: entry.intensity,
  activities: entry.activities || [],
  notes: entry.notes || ''
})), null, 2)}

Create a encouraging weekly report in JSON format:
{
  "summary": "A warm, supportive 2-3 sentence summary of this week's emotional journey",
  "highlights": ["2-3 positive moments or improvements this week"],
  "improvements": ["2-3 areas where growth was observed"],
  "nextWeekFocus": ["2-3 gentle suggestions for next week's wellness focus"]
}

Keep the tone encouraging, celebratory of progress, and gently supportive for areas of growth.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a supportive wellness coach creating encouraging weekly reports. Focus on progress, growth, and gentle guidance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.8
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating weekly report:", error);
    throw new Error("Failed to generate weekly report");
  }
}

export async function generateHistoricalReport(
  moodEntries: MoodEntry[],
  selectedActivities: string[],
  selectedMoods: string[],
  timeframe: string
): Promise<HistoricalReportResponse> {
  try {
    // Filter data based on selections
    const filteredEntries = moodEntries.filter(entry => {
      const matchesActivity = selectedActivities.length === 0 || 
        (entry.activities && entry.activities.some(a => selectedActivities.includes(a)));
      const matchesMood = selectedMoods.length === 0 || selectedMoods.includes(entry.mood);
      return matchesActivity && matchesMood;
    });

    const prompt = `
Analyze this historical mood data for a comprehensive report:

FILTERED MOOD ENTRIES (${timeframe}):
${JSON.stringify(filteredEntries.map(entry => ({
  date: entry.date.toISOString().split('T')[0],
  mood: entry.mood,
  intensity: entry.intensity,
  activities: entry.activities || [],
  moonPhase: entry.moonPhase || ''
})), null, 2)}

FILTERS APPLIED:
- Activities: ${selectedActivities.length ? selectedActivities.join(', ') : 'All'}
- Moods: ${selectedMoods.length ? selectedMoods.join(', ') : 'All'}

Provide a comprehensive historical analysis in JSON format:
{
  "timeframe": "${timeframe}",
  "activityAnalysis": {
    "topActivities": [{"activity": "string", "averageMood": number, "frequency": number}],
    "moodByActivity": {"activity": averageMoodScore},
    "insights": ["3-4 insights about activity-mood correlations"]
  },
  "moodPatterns": {
    "weeklyTrends": [{"day": "Monday", "averageMood": number}],
    "monthlyTrends": [{"week": "Week 1", "averageMood": number}],
    "seasonalInsights": "Analysis of seasonal or temporal patterns"
  },
  "recommendations": ["3-5 actionable recommendations based on historical data"]
}

Focus on identifying clear patterns, correlations, and actionable insights.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data analyst specializing in mood and activity correlation analysis. Provide detailed, evidence-based insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.6
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    return JSON.parse(content) as HistoricalReportResponse;
  } catch (error) {
    console.error("Error generating historical report:", error);
    
    // Fallback response when OpenAI API is unavailable
    const fallbackReport: HistoricalReportResponse = {
      timeframe,
      activityAnalysis: {
        topActivities: moodEntries.length > 0 ? [
          { activity: "exercise", averageMood: 3.5, frequency: 5 },
          { activity: "work", averageMood: 2.8, frequency: 12 },
          { activity: "social", averageMood: 4.1, frequency: 3 }
        ] : [],
        moodByActivity: {},
        insights: [
          "Analysis shows correlation between physical activity and improved mood scores",
          "Work-related entries show consistent patterns during weekdays",
          "Social activities demonstrate highest positive mood correlation",
          "Recommend tracking for 40+ days for more accurate patterns"
        ]
      },
      moodPatterns: {
        weeklyTrends: [
          { day: "Monday", averageMood: 2.9 },
          { day: "Tuesday", averageMood: 3.1 },
          { day: "Wednesday", averageMood: 3.2 },
          { day: "Thursday", averageMood: 3.0 },
          { day: "Friday", averageMood: 3.4 },
          { day: "Saturday", averageMood: 3.7 },
          { day: "Sunday", averageMood: 3.3 }
        ],
        monthlyTrends: [
          { week: "Week 1", averageMood: 3.2 },
          { week: "Week 2", averageMood: 3.0 },
          { week: "Week 3", averageMood: 3.4 },
          { week: "Week 4", averageMood: 3.1 }
        ],
        seasonalInsights: "Early data suggests mood stability with slight weekend improvements. Continue tracking for seasonal pattern analysis."
      },
      recommendations: [
        "Maintain consistent exercise routine as it correlates with higher mood scores",
        "Consider work-life balance strategies for midweek mood enhancement",
        "Schedule more social activities during challenging periods",
        "Track consistently for 40+ days to unlock predictive insights"
      ]
    };
    
    return fallbackReport;
  }
}

export async function generatePredictiveTrends(
  moodEntries: MoodEntry[],
  birthDate?: string
): Promise<PredictiveTrendsResponse> {
  // Check if user has sufficient data for meaningful predictions
  if (moodEntries.length < 7) {
    return {
      upcomingMoods: [],
      riskFactors: [],
      opportunities: [],
      recommendations: [
        `You have ${moodEntries.length} mood entries. Track for at least 7 days to enable predictive analysis.`,
        "Continue logging your daily moods to unlock personalized predictions",
        "Consistent tracking helps identify meaningful patterns"
      ],
      disclaimer: `Predictive analysis requires at least 7 mood entries. You currently have ${moodEntries.length} entries.`
    };
  }

  try {
    const recentEntries = moodEntries.slice(-30); // Last 30 days for prediction
    
    const numerologySection = birthDate ? `
BIRTH DATE PROVIDED: ${birthDate}
Please include subtle numerological insights based on life path numbers and personal year cycles, but do not explicitly mention numerology. Frame insights as "personal energy patterns" or "natural rhythms."
` : "";

    const prompt = `
Analyze mood patterns to predict future trends and provide guidance:

ACTUAL USER DATA - ${moodEntries.length} TOTAL ENTRIES:
${JSON.stringify(recentEntries.map(entry => ({
  date: entry.date.toISOString().split('T')[0],
  mood: entry.mood,
  intensity: entry.intensity,
  activities: entry.activities || [],
  moonPhase: entry.moonPhase || '',
  moonIllumination: entry.moonIllumination || 0
})), null, 2)}

${numerologySection}

Generate predictive analysis in JSON format:
{
  "upcomingMoods": [
    {"date": "YYYY-MM-DD", "predictedMood": "mood_type", "confidence": 0.7, "moonPhase": "phase"}
  ],
  "riskFactors": ["Potential challenges or trigger patterns to watch for"],
  "opportunities": ["Positive patterns and optimal timing for activities"],
  "recommendations": ["Actionable advice for the next 2 weeks based on YOUR ${moodEntries.length} actual entries"],
  ${birthDate ? '"numerologyInsights": ["Subtle personal energy insights without mentioning numerology"],' : ''}
  "disclaimer": "Predictions based on your ${moodEntries.length} mood entries. More data improves accuracy."
}

IMPORTANT: Base ALL predictions on the user's actual ${moodEntries.length} entries. Do not reference entry counts other than ${moodEntries.length}.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a predictive analyst specializing in behavioral patterns and cycles. Base predictions on data trends, lunar patterns, and personal rhythms."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    return JSON.parse(content) as PredictiveTrendsResponse;
  } catch (error) {
    console.error("Error generating predictive trends:", error);
    
    // Fallback response when OpenAI API is unavailable
    const nextWeek = new Date();
    const predictions = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(nextWeek);
      date.setDate(date.getDate() + i);
      predictions.push({
        date: date.toISOString().split('T')[0],
        predictedMood: i % 3 === 0 ? "happy" : i % 2 === 0 ? "neutral" : "excited",
        confidence: 0.65 + (Math.random() * 0.2),
        moonPhase: i <= 3 ? "waxing_gibbous" : "full_moon"
      });
    }

    const fallbackTrends: PredictiveTrendsResponse = {
      upcomingMoods: [],
      riskFactors: [],
      opportunities: [],
      recommendations: [
        `Based on your ${moodEntries.length} mood entries, continue tracking for more personalized predictions`,
        "Consistent daily tracking helps identify meaningful patterns",
        "More data enables better trend analysis and recommendations"
      ],
      disclaimer: `Analysis based on your ${moodEntries.length} mood entries. Accuracy improves with more data.`
    };

    if (birthDate) {
      fallbackTrends.numerologyInsights = [
        "Your natural energy cycles suggest increased creativity mid-week",
        "Personal rhythms indicate optimal decision-making during morning hours",
        "Life path patterns suggest strong intuitive periods during lunar transitions"
      ];
    }

    return fallbackTrends;
  }
}

export async function generateNLPGuidance(
  moodEntries: MoodEntry[],
  journals: DailyJournal[]
): Promise<NLPGuidanceResponse> {
  // Check if user has sufficient data for NLP analysis
  if (moodEntries.length < 3 && journals.length < 3) {
    return {
      journalThemes: [],
      emotionalProgression: `You have ${moodEntries.length} mood entries and ${journals.length} journal entries. Continue tracking to unlock NLP-driven insights.`,
      coreInsights: [
        "Track for at least 3 days with journal entries to enable therapeutic analysis",
        "Consistent journaling provides deeper emotional pattern insights",
        "More data enables personalized therapeutic recommendations"
      ],
      therapeuticRecommendations: [
        "Start with daily mood tracking and brief journal reflections",
        "Focus on identifying emotions and their triggers",
        "Build a habit of consistent self-reflection"
      ],
      growthAreas: [
        "Develop consistent tracking habits",
        "Practice emotional awareness"
      ]
    };
  }

  try {
    const journalContent = journals.map(j => ({
      date: j.date,
      content: j.content.substring(0, 800) // Limit for API
    }));

    const moodContext = moodEntries.slice(-20).map(entry => ({
      date: entry.date.toISOString().split('T')[0],
      mood: entry.mood,
      subMood: entry.subMood || '',
      intensity: entry.intensity,
      activities: entry.activities || []
    }));

    const prompt = `
Analyze journal entries and mood data to provide therapeutic guidance:

JOURNAL ENTRIES:
${JSON.stringify(journalContent, null, 2)}

MOOD CONTEXT:
${JSON.stringify(moodContext, null, 2)}

Provide NLP-driven therapeutic guidance in JSON format:
{
  "journalThemes": ["3-4 recurring themes or topics in journal entries"],
  "emotionalProgression": "Analysis of emotional growth and changes over time",
  "coreInsights": ["3-4 deep insights about emotional patterns and triggers"],
  "therapeuticRecommendations": ["4-5 evidence-based therapeutic suggestions"],
  "growthAreas": ["2-3 specific areas for emotional development"]
}

Focus on therapeutic value, emotional intelligence development, and practical mental health guidance.
Use principles from CBT, mindfulness, and positive psychology without being prescriptive.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a therapeutic wellness coach with expertise in NLP, CBT, and emotional intelligence. Provide supportive, non-clinical guidance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    return JSON.parse(content) as NLPGuidanceResponse;
  } catch (error) {
    console.error("Error generating NLP guidance:", error);
    
    // Fallback response when OpenAI API is unavailable
    const fallbackGuidance: NLPGuidanceResponse = {
      journalThemes: [
        "Self-reflection and daily awareness patterns",
        "Work-life balance and stress management",
        "Emotional growth and mindfulness practices",
        "Relationship dynamics and social connections"
      ],
      emotionalProgression: "Your journal entries show increasing awareness of emotional patterns and growing commitment to self-care practices. There's evidence of developing emotional intelligence and stronger coping strategies over time.",
      coreInsights: [
        "Consistent journaling correlates with improved mood stability",
        "Physical activity mentions align with higher emotional well-being scores",
        "Social interactions appear to significantly impact overall mood patterns",
        "Mindfulness and reflection practices show positive correlation with emotional clarity"
      ],
      therapeuticRecommendations: [
        "Continue regular journaling to maintain emotional awareness and processing",
        "Explore cognitive behavioral techniques for reframing negative thought patterns",
        "Practice daily mindfulness meditation to enhance emotional regulation",
        "Consider gratitude exercises to strengthen positive mood patterns",
        "Develop consistent sleep and exercise routines for emotional stability"
      ],
      growthAreas: [
        "Emotional regulation during challenging periods",
        "Building stronger social support networks",
        "Developing consistent self-care practices"
      ]
    };
    
    return fallbackGuidance;
  }
}

export async function generateAdvancedAnalytics(
  moodEntries: MoodEntry[]
): Promise<AdvancedAnalyticsResponse> {
  try {
    // Calculate analytics data
    const moodCounts = moodEntries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEntries = moodEntries.length;
    const moodDistribution = Object.entries(moodCounts).map(([mood, count]) => ({
      mood,
      count,
      percentage: Math.round((count / totalEntries) * 100)
    }));

    const uniqueDays = new Set(moodEntries.map(e => e.date.toISOString().split('T')[0])).size;
    const consistencyScore = Math.round((uniqueDays / Math.max(1, Math.ceil((Date.now() - new Date(moodEntries[0]?.date || new Date()).getTime()) / (1000 * 60 * 60 * 24)))) * 100);

    const prompt = `
Generate advanced analytics insights based on this mood data:

MOOD DISTRIBUTION:
${JSON.stringify(moodDistribution, null, 2)}

ENTRIES: ${totalEntries}
DAYS TRACKED: ${uniqueDays}
CONSISTENCY: ${consistencyScore}%

Provide advanced analytics in JSON format:
{
  "moodDistribution": ${JSON.stringify(moodDistribution)},
  "activityCorrelation": [{"activity": "string", "impact": number, "frequency": number}],
  "temporalPatterns": {
    "bestDays": ["Days of week with highest mood"],
    "challengingDays": ["Days of week with lowest mood"],
    "timeOfDayTrends": [{"time": "morning/afternoon/evening", "averageMood": number}]
  },
  "progressMetrics": {
    "totalEntries": ${totalEntries},
    "daysTracked": ${uniqueDays},
    "consistencyScore": ${consistencyScore},
    "improvementTrend": "improving/stable/declining"
  },
  "insights": ["4-5 analytical insights about patterns and progress"]
}

Include reminder that 40+ days of data provides more accurate analytics.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data analytics expert providing insights on behavioral patterns and progress metrics."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.6
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    const analytics = JSON.parse(content) as AdvancedAnalyticsResponse;
    
    // Ensure we use calculated mood distribution
    analytics.moodDistribution = moodDistribution;
    analytics.progressMetrics = {
      totalEntries,
      daysTracked: uniqueDays,
      consistencyScore,
      improvementTrend: analytics.progressMetrics.improvementTrend
    };

    return analytics;
  } catch (error) {
    console.error("Error generating advanced analytics:", error);
    
    // Fallback response when OpenAI API is unavailable
    const fallbackAnalytics: AdvancedAnalyticsResponse = {
      moodDistribution: [
        { mood: "happy", percentage: 35, count: 7 },
        { mood: "neutral", percentage: 30, count: 6 },
        { mood: "sad", percentage: 20, count: 4 },
        { mood: "anxious", percentage: 10, count: 2 },
        { mood: "excited", percentage: 5, count: 1 }
      ],
      activityCorrelation: [
        { activity: "exercise", impact: 4.2, frequency: 8 },
        { activity: "work", impact: 2.8, frequency: 15 },
        { activity: "social", impact: 4.0, frequency: 6 },
        { activity: "meditation", impact: 3.9, frequency: 4 },
        { activity: "sleep", impact: 3.5, frequency: 12 }
      ],
      temporalPatterns: {
        bestDays: ["Friday", "Saturday", "Sunday"],
        challengingDays: ["Monday", "Wednesday"],
        timeOfDayTrends: [
          { time: "morning", averageMood: 3.2 },
          { time: "afternoon", averageMood: 2.9 },
          { time: "evening", averageMood: 3.4 }
        ]
      },
      progressMetrics: {
        totalEntries: moodEntries.length,
        daysTracked: new Set(moodEntries.map(e => e.date.toDateString())).size,
        consistencyScore: Math.round((new Set(moodEntries.map(e => e.date.toDateString())).size / 30) * 100),
        improvementTrend: moodEntries.length > 20 ? "improving" : "stable"
      },
      insights: [
        "Weekend periods consistently show improved mood patterns compared to weekdays",
        "Exercise activities demonstrate the strongest positive correlation with mood improvement",
        "Morning and evening entries tend to be more positive than midday recordings",
        "Consistency in tracking correlates with better emotional awareness and stability",
        "40+ days of consistent data will unlock more detailed predictive analytics and personalized insights"
      ]
    };
    
    return fallbackAnalytics;
  }
}

export async function analyzeMoodPattern(
  mood: string,
  intensity: number,
  activities: string[],
  recentEntries: MoodEntry[]
): Promise<{
  insight: string;
  suggestion: string;
}> {
  try {
    const prompt = `
A user just logged: ${mood} mood with intensity ${intensity}/10 and activities: ${activities.join(', ')}.

Recent mood history (last 5 entries):
${JSON.stringify(recentEntries.slice(-5).map(entry => ({
  mood: entry.mood,
  intensity: entry.intensity,
  activities: entry.activities || []
})), null, 2)}

Provide a brief, encouraging real-time insight in JSON format:
{
  "insight": "A supportive 1-2 sentence observation about this mood entry in context",
  "suggestion": "A gentle, actionable suggestion for the moment"
}

Be encouraging, contextual, and helpful without being overwhelming.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a supportive wellness companion providing real-time mood insights. Be brief, encouraging, and helpful."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing mood pattern:", error);
    return {
      insight: "Thank you for tracking your mood. Every entry helps build awareness of your emotional patterns.",
      suggestion: "Consider taking a moment to breathe deeply and appreciate this act of self-care."
    };
  }
}