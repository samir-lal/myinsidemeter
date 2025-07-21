import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X } from "lucide-react";
import { format, isAfter, isToday, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useGuestSession } from "@/hooks/useGuestSession";
import { getMoodEmoji } from "@/lib/mood-utils";

interface MoodEntry {
  id?: number;
  mood: string;
  subMood?: string;
  intensity: number;
  notes: string;
  activities?: string[];
  date: string;
}

interface MoodEntryFormProps {
  entry?: MoodEntry;
  onCancel: () => void;
  onSuccess: () => void;
  isAuthenticated: boolean;
}

const moodOptions = [
  { value: "excited", label: "Excited", emoji: "🤩" },
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "anxious", label: "Anxious", emoji: "😰" }
];

const activityOptions = [
  { value: "gym", label: "Gym" },
  { value: "yoga", label: "Yoga" },
  { value: "meditation", label: "Meditation" },
  { value: "sports", label: "Sports" },
  { value: "outdoors", label: "Outdoors" },
  { value: "other", label: "Other" }
];

const subMoodOptions: Record<string, string[]> = {
  excited: ["euphoric", "energetic", "thrilled", "elated", "passionate", "exhilarated"],
  happy: ["content", "joyful", "peaceful", "grateful", "optimistic", "cheerful"],
  neutral: ["calm", "balanced", "indifferent", "steady", "contemplative", "mellow"],
  sad: ["melancholy", "disappointed", "lonely", "grieving", "dejected", "somber"],
  anxious: ["worried", "restless", "overwhelmed", "nervous", "tense", "apprehensive"]
};

export default function MoodEntryForm({ entry, onCancel, onSuccess, isAuthenticated }: MoodEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { guestSession } = useGuestSession();
  
  // Form state
  const [selectedMood, setSelectedMood] = useState(entry?.mood || "");
  const [selectedSubMoods, setSelectedSubMoods] = useState<string[]>(
    entry?.subMood ? entry.subMood.split(', ') : []
  );
  const [intensity, setIntensity] = useState([entry?.intensity || 5]);
  const [notes, setNotes] = useState(entry?.notes || "");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(entry?.activities || []);
  const [selectedDate, setSelectedDate] = useState<Date>(
    entry?.date ? new Date(entry.date) : new Date()
  );

  // Calculate available dates (today and last 3 days)
  const today = new Date();
  const minDate = subDays(today, 3);
  
  const isDateDisabled = (date: Date) => {
    return isAfter(date, today) || isAfter(minDate, date);
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const toggleSubMood = (subMood: string) => {
    setSelectedSubMoods(prev => 
      prev.includes(subMood) 
        ? prev.filter(sm => sm !== subMood)
        : [...prev, subMood]
    );
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        date: selectedDate.toISOString().split('T')[0] + 'T12:00:00.000Z'
      };

      if (!isAuthenticated && guestSession?.guestId) {
        payload.guestId = guestSession.guestId;
      }

      if (entry?.id) {
        // Update existing entry
        return await apiRequest("PUT", `/api/mood-entries/${entry.id}`, payload);
      } else {
        // Create new entry
        return await apiRequest("POST", "/api/mood-entries", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood-analytics"] });
      
      toast({
        title: entry?.id ? "Mood updated! 🌙" : "Mood saved! 🌙",
        description: entry?.id ? "Your mood entry has been updated." : "Your mood has been logged successfully."
      });
      
      onSuccess();
    },
    onError: (error) => {
      console.error("Mood save error:", error);
      toast({
        title: "Error",
        description: `Failed to ${entry?.id ? 'update' : 'save'} mood entry: ${error.message || "Please try again."}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!selectedMood) {
      toast({
        title: "Please select a mood",
        description: "Choose how you're feeling to continue.",
        variant: "destructive"
      });
      return;
    }

    createOrUpdateMutation.mutate({
      mood: selectedMood,
      subMood: selectedSubMoods.join(', '),
      intensity: intensity[0],
      notes: notes.trim(),
      activities: selectedActivities
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {entry?.id ? "Edit Mood Entry" : "Add Mood Entry"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={isDateDisabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            You can log moods for today and the past 3 days
          </p>
        </div>

        {/* Mood Selection */}
        <div className="space-y-3">
          <Label>How are you feeling?</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={cn(
                  "p-4 rounded-lg border-2 text-center transition-all",
                  selectedMood === mood.value
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:scale-105"
                )}
              >
                <div className="text-2xl mb-1">{mood.emoji}</div>
                <div className="text-sm font-medium">{mood.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Mood Selection */}
        {selectedMood && subMoodOptions[selectedMood] && (
          <div className="space-y-3">
            <Label>Feeling more specifically... (optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              {subMoodOptions[selectedMood].map((subMood) => {
                const isSelected = selectedSubMoods.includes(subMood);
                
                const getMoodColors = () => {
                  const baseColors = {
                    excited: 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400',
                    happy: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400',
                    neutral: 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400',
                    sad: 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400',
                    anxious: 'border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-400'
                  };
                  
                  const selectedColors = {
                    excited: 'border-amber-500 bg-amber-100 text-amber-800',
                    happy: 'border-emerald-500 bg-emerald-100 text-emerald-800',
                    neutral: 'border-slate-500 bg-slate-100 text-slate-800',
                    sad: 'border-blue-500 bg-blue-100 text-blue-800',
                    anxious: 'border-purple-500 bg-purple-100 text-purple-800'
                  };
                  
                  return isSelected ? selectedColors[selectedMood as keyof typeof selectedColors] : baseColors[selectedMood as keyof typeof baseColors];
                };

                const toggleSubMood = () => {
                  setSelectedSubMoods(prev => 
                    prev.includes(subMood) 
                      ? prev.filter(sm => sm !== subMood)
                      : [...prev, subMood]
                  );
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
        {selectedMood && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span className="text-purple-500">💪</span>
                How strongly are you feeling this?
              </Label>
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
        )}

        {/* Activities */}
        <div className="space-y-3">
          <Label>Activities (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {activityOptions.map((activity) => (
              <Badge
                key={activity.value}
                variant={selectedActivities.includes(activity.value) ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => toggleActivity(activity.value)}
              >
                {activity.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Private Journal */}
        <div className="space-y-3">
          <Label>Private Journal</Label>
          <p className="text-sm text-muted-foreground">
            Write freely. Find patterns. Create gentle change.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What's on your mind? Your thoughts are private and secure..."
            className="min-h-[100px] resize-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Completely private and secure</span>
            <span>{notes.length}/500</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={createOrUpdateMutation.isPending || !selectedMood}
            className="flex-1"
          >
            {createOrUpdateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {entry?.id ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {entry?.id ? "Update Entry" : "Save Entry"}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}