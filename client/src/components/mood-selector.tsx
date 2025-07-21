import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cookieManager } from "@/lib/cookie-manager";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus } from "lucide-react";
import ActivitySelector from "./activity-selector";
import { trackEvent } from "@/lib/analytics";
// Hotjar tracking removed for iOS compatibility

interface MoodSelectorProps {
  onSuccess?: () => void;
}

const moods = [
  { value: 'excited', emoji: '😆', color: 'bg-gradient-to-br from-yellow-400 to-orange-500', label: 'Excited' },
  { value: 'happy', emoji: '😊', color: 'bg-gradient-to-br from-green-400 to-blue-500', label: 'Happy' },
  { value: 'neutral', emoji: '😐', color: 'bg-gradient-to-br from-gray-400 to-gray-600', label: 'Neutral' },
  { value: 'sad', emoji: '😢', color: 'bg-gradient-to-br from-blue-500 to-purple-600', label: 'Sad' },
  { value: 'anxious', emoji: '😰', color: 'bg-gradient-to-br from-purple-500 to-pink-600', label: 'Anxious' },
];

const subMoods = {
  excited: {
    question: "What kinds of excitement are you feeling? (Select all that apply)",
    options: ['Energized', 'Hopeful', 'Creative', 'Motivated', 'Celebratory', 'Playful', 'Inspired']
  },
  happy: {
    question: "What's contributing to your happiness? (Select all that apply)",
    options: ['Content', 'Peaceful', 'Grateful', 'Loved', 'Proud', 'Relieved', 'Joyful']
  },
  neutral: {
    question: "How would you describe this neutral feeling? (Select all that apply)",
    options: ['Bored', 'Indifferent', 'Mindful', 'Calm', 'Disconnected', 'Present', 'Just coasting']
  },
  sad: {
    question: "What aspects of sadness are you experiencing? (Select all that apply)",
    options: ['Disappointed', 'Lonely', 'Heartbroken', 'Regretful', 'Hopeless', 'Mourning', 'Numb']
  },
  anxious: {
    question: "What types of anxiety are you feeling? (Select all that apply)",
    options: ['Worried', 'Overwhelmed', 'Insecure', 'Restless', 'On edge', 'Nervous', 'Fearful']
  }
};

export default function MoodSelector({ onSuccess }: MoodSelectorProps) {
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [selectedSubMoods, setSelectedSubMoods] = useState<string[]>([]);
  const [intensity, setIntensity] = useState([5]);
  const [notes, setNotes] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const { toast } = useToast();
  const { guestSession, incrementMoodCount, clearGuestSession } = useGuestSession();



  // Check if user is authenticated using unified auth system
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Clear guest session when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && guestSession) {
      clearGuestSession();
    }
  }, [isAuthenticated, guestSession, clearGuestSession]);

  // iOS app - user tracking disabled

  const saveMoodMutation = useMutation({
    mutationFn: async (data: { mood: string; subMood: string[]; intensity: number; notes: string; activities: string[]; date: Date }) => {
      const payload = {
        ...data,
        subMood: data.subMood.join(', '), // Convert array to comma-separated string for storage
        date: data.date.toISOString(),
        guestId: guestSession?.guestId
      };

      return await apiRequest("POST", "/api/mood-entries", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/session-test"] });
      
      // Track mood entry with cookie manager for analytics
      cookieManager.trackMoodPattern(selectedMood, intensity[0], selectedActivities);
      cookieManager.trackUserAction('mood_logged', {
        mood: selectedMood,
        subMoods: selectedSubMoods,
        intensity: intensity[0],
        hasNotes: notes.length > 0,
        activitiesCount: selectedActivities.length,
        isAuthenticated
      });
      
      // Track mood entry with Google Analytics
      trackEvent('mood_entry', 'engagement', selectedMood, intensity[0]);
      
      // iOS app - analytics tracking disabled
      
      // Only increment guest mood count if user is not authenticated
      if (!isAuthenticated) {
        incrementMoodCount();
      }
      
      toast({
        title: "Mood saved! 🌙",
        description: "Your mood has been logged successfully."
      });
      
      // Reset form
      setSelectedMood("");
      setSelectedSubMoods([]);
      setIntensity([5]);
      setNotes("");
      setSelectedActivities([]);
      
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Mood save error:", error);
      toast({
        title: "Error",
        description: `Failed to save mood entry: ${error.message || "Please try again."}`,
        variant: "destructive"
      });
    }
  });

  const handleSaveMood = () => {
    if (!selectedMood) {
      toast({
        title: "Please select a mood",
        description: "Choose how you're feeling before saving.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedSubMoods.length) {
      toast({
        title: "Please specify your mood",
        description: `${subMoods[selectedMood as keyof typeof subMoods]?.question}`,
        variant: "destructive"
      });
      return;
    }

    saveMoodMutation.mutate({
      mood: selectedMood,
      subMood: selectedSubMoods,
      intensity: intensity[0],
      notes: notes.trim(),
      activities: selectedActivities,
      date: new Date()
    });
  };

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-6">



        {/* Mood Selection */}
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Select your mood</h3>
          <div className="grid grid-cols-5 gap-3">
            {moods.map((mood) => (
              <button
                key={mood.value}
                onClick={() => {
                  setSelectedMood(mood.value);
                  setSelectedSubMoods([]); // Reset sub-moods when changing primary mood
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg hover:scale-110 transition-transform ${mood.color} ${
                  selectedMood === mood.value ? 'ring-2 ring-[var(--moon)]' : ''
                }`}
                title={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Mood Selection - Show only when primary mood is selected */}
        {selectedMood && subMoods[selectedMood as keyof typeof subMoods] && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">
              {subMoods[selectedMood as keyof typeof subMoods].question}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {subMoods[selectedMood as keyof typeof subMoods].options.map((subMood) => {
                const isSelected = selectedSubMoods.includes(subMood);
                const toggleSubMood = () => {
                  if (isSelected) {
                    setSelectedSubMoods(selectedSubMoods.filter(sm => sm !== subMood));
                  } else {
                    setSelectedSubMoods([...selectedSubMoods, subMood]);
                  }
                };

                // Get mood-specific colors - pleasing light tones with good readability
                const getMoodColors = () => {
                  switch (selectedMood) {
                    case 'excited':
                      return isSelected 
                        ? 'bg-amber-200 text-amber-900 border-amber-300 shadow-md' 
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
                    case 'happy':
                      return isSelected 
                        ? 'bg-emerald-200 text-emerald-900 border-emerald-300 shadow-md' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
                    case 'neutral':
                      return isSelected 
                        ? 'bg-slate-200 text-slate-900 border-slate-300 shadow-md' 
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100';
                    case 'sad':
                      return isSelected 
                        ? 'bg-blue-200 text-blue-900 border-blue-300 shadow-md' 
                        : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
                    case 'anxious':
                      return isSelected 
                        ? 'bg-purple-200 text-purple-900 border-purple-300 shadow-md' 
                        : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100';
                    default:
                      return isSelected 
                        ? 'bg-gray-200 text-gray-900 border-gray-300 shadow-md' 
                        : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100';
                  }
                };

                return (
                  <div
                    key={subMood}
                    onClick={toggleSubMood}
                    className={`relative h-12 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-105 border flex items-center justify-center ${getMoodColors()}`}
                  >
                    <span className="text-xs font-medium text-center px-1">
                      {subMood}
                    </span>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strength Slider - Enhanced UI */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="text-purple-500">💪</span>
              How strongly are you feeling this?
            </h3>
            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-700">
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{intensity[0]}/10</span>
            </div>
          </div>
          <div className="relative">
            <Slider
              value={intensity}
              onValueChange={setIntensity}
              max={10}
              min={1}
              step={1}
              className="w-full mb-2"
            />
            {/* Visual intensity bars */}
            <div className="flex justify-between items-center gap-1 mt-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    i < intensity[0]
                      ? intensity[0] <= 3
                        ? 'bg-blue-400'
                        : intensity[0] <= 7
                        ? 'bg-purple-400'
                        : 'bg-pink-400'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mt-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Slightly
            </span>
            <span className="text-center px-2 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full">
              {intensity[0] <= 3 ? 'Mild' : intensity[0] <= 7 ? 'Moderate' : 'Intense'}
            </span>
            <span className="flex items-center gap-1">
              Very strongly
              <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
            </span>
          </div>
        </div>

        {/* Private Journal */}
        <div className="p-4 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200/50 dark:border-orange-700/30 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400"></div>
            <h3 className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Private Journal
            </h3>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your private thoughts about this mood... (completely private)"
            className="bg-white/70 dark:bg-gray-800/70 border-orange-200/60 dark:border-orange-700/60 text-gray-900 dark:text-gray-100 placeholder:text-orange-600/60 dark:placeholder:text-orange-400/60 resize-none focus:border-orange-300 dark:focus:border-orange-600 focus:ring-orange-200/50 dark:focus:ring-orange-800/50"
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-2 leading-relaxed">
            <div className="font-medium">Write freely. Find patterns. Create gentle change.</div>
            <div className="opacity-75">Private and secure • {notes.length}/500 characters</div>
          </div>
        </div>

        {/* Activity Selection */}
        <ActivitySelector 
          selectedActivities={selectedActivities}
          onActivitiesChange={setSelectedActivities}
        />

        {/* Save Button */}
        <Button
          onClick={handleSaveMood}
          disabled={!selectedMood || saveMoodMutation.isPending}
          className="w-full bg-[var(--lunar-accent)] hover:bg-[var(--lunar-accent)]/80 font-medium py-3"
        >
          {saveMoodMutation.isPending ? "Saving..." : "Save Mood Entry"}
        </Button>
      </div>
    </Card>
  );
}
