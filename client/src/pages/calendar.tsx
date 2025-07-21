import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { MoodEntry } from "@shared/schema";
import { useGuestSession } from "@/hooks/useGuestSession";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { guestSession } = useGuestSession();

  // Check if user is authenticated
  const { data: sessionData } = useQuery({
    queryKey: ["/api/session-test"],
    retry: false,
  });
  const user = (sessionData as any)?.sessionData?.user || null;
  const isAuthenticated = !!user;

  const { data: moodEntries = [], isLoading: moodEntriesLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood-entries", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      if (isAuthenticated) {
        const res = await fetch("/api/mood-entries?limit=100");
        if (!res.ok) return [];
        return res.json();
      } else {
        const guestParam = guestSession?.guestId ? `&guestId=${guestSession.guestId}` : '';
        const res = await fetch(`/api/mood-entries?limit=100${guestParam}`);
        if (!res.ok) return [];
        return res.json();
      }
    },
    enabled: isAuthenticated || !!guestSession,
  });

  const getMoodForDate = (date: Date) => {
    return moodEntries.find(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  const getMoodEmoji = (mood?: string) => {
    const moodEmojis: Record<string, string> = {
      excited: '😆',
      happy: '😊',
      neutral: '😐',
      sad: '😢',
      anxious: '😰'
    };
    return mood ? moodEmojis[mood] : '';
  };

  const getMoodColor = (mood?: string) => {
    const moodColors: Record<string, string> = {
      excited: 'bg-yellow-500',
      happy: 'bg-green-500',
      neutral: 'bg-gray-500',
      sad: 'bg-blue-500',
      anxious: 'bg-purple-500'
    };
    return mood ? moodColors[mood] : 'bg-transparent';
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="px-4 py-6 pt-20 space-y-6 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="text-[var(--lunar-accent)]" size={24} />
            <h1 className="text-2xl font-bold">Mood Calendar</h1>
          </div>
        </div>

        {/* Calendar Controls */}
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="hover:bg-[var(--lunar-accent)]/10"
            >
              <ChevronLeft size={16} />
            </Button>
            
            <h2 className="text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="hover:bg-[var(--lunar-accent)]/10"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm text-[var(--lunar)]/60 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {moodEntriesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--lunar)]/20 border-t-[var(--lunar)]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} className="aspect-square" />;
                }

                const mood = getMoodForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={index}
                    className={`aspect-square border border-[var(--lunar)]/10 rounded-lg p-1 flex flex-col items-center justify-center text-sm relative ${
                      isToday ? 'ring-2 ring-[var(--moon)] moon-glow' : ''
                    } ${isPast && !mood ? 'opacity-50' : ''}`}
                  >
                    <div className="text-xs text-[var(--lunar)]/70">
                      {day.getDate()}
                    </div>
                    {mood && (
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${getMoodColor(mood.mood)}`}>
                          {getMoodEmoji(mood.mood)}
                        </div>
                        <div className="text-xs mt-1 text-[var(--lunar)]/60">
                          {mood.intensity}/10
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Legend */}
        <Card className="glassmorphism border-[var(--lunar)]/20 p-4">
          <h3 className="text-sm font-medium mb-3">Mood Legend</h3>
          <div className="grid grid-cols-5 gap-3">
            {[
              { mood: 'excited', emoji: '😆', label: 'Excited' },
              { mood: 'happy', emoji: '😊', label: 'Happy' },
              { mood: 'neutral', emoji: '😐', label: 'Neutral' },
              { mood: 'sad', emoji: '😢', label: 'Sad' },
              { mood: 'anxious', emoji: '😰', label: 'Anxious' }
            ].map(item => (
              <div key={item.mood} className="text-center">
                <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${getMoodColor(item.mood)}`}>
                  {item.emoji}
                </div>
                <div className="text-xs text-[var(--lunar)]/70">{item.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glassmorphism border-[var(--lunar)]/20 p-4 text-center">
            <div className="text-2xl font-bold text-[var(--lunar-accent)]">{moodEntries.length}</div>
            <div className="text-sm text-[var(--lunar)]/70">Total Entries</div>
          </Card>
          <Card className="glassmorphism border-[var(--lunar)]/20 p-4 text-center">
            <div className="text-2xl font-bold text-[var(--moon)]">
              {moodEntries.length > 0 
                ? Math.max(...moodEntries.map(e => {
                    const date = new Date(e.date);
                    return Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                  })) + 1
                : 0
              }
            </div>
            <div className="text-sm text-[var(--lunar)]/70">Days Tracked</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
