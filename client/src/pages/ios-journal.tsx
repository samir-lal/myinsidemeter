import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, BookOpen, UserPlus, Plus, Edit3, Trash2, FileText, Target, Tag } from "lucide-react";
import { format } from "date-fns";
import { getMoodEmoji, getMoodColor } from "@/lib/mood-utils";
import { useLocation } from "wouter";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useState, useEffect } from "react";
import JournalEntryForm from "@/components/journal-entry-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface MoodEntry {
  id: number;
  mood: string;
  subMood?: string;
  intensity: number;
  notes: string;
  activities: string[];
  date: string;
  moonPhase?: string;
  moonIllumination?: number;
}

export default function IOSJournal() {
  const { guestSession } = useGuestSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for form management
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);

  // Use the same auth approach as meter page
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Scroll to top when form opens for better UX
  useEffect(() => {
    if (showForm || editingEntry) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showForm, editingEntry]);
  
  // Navigation hook for programmatic navigation
  const [, setLocation] = useLocation();

  // Delete mutation for journal entries
  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return await apiRequest("DELETE", `/api/daily-journal/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-journal"] });
      toast({
        title: "Entry deleted",
        description: "Your journal entry has been removed."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete entry: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Fetch journal entries for the journal tab
  const { data: journalEntries = [], isLoading: journalLoading } = useQuery<any[]>({
    queryKey: ["/api/daily-journal", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      if (isAuthenticated) {
        // Use apiRequest to ensure iOS auth headers are included
        const response = await apiRequest("GET", "/api/daily-journal");
        return response || [];
      } else {
        // For guest users, show empty state
        return [];
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Show enhanced registration prompt for guests who haven't signed up
  if (!isAuthenticated && journalEntries.length >= 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900 dark:via-orange-900 dark:to-red-900 p-6 pt-20 flex items-center justify-center">
        <Card className="max-w-lg mx-auto p-8 text-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-2 border-amber-200/70 dark:border-amber-600/40 shadow-2xl">
          {/* Warm Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg mb-6">
            <span className="text-3xl text-white">🌟</span>
          </div>
          
          {/* Inspiring Headline */}
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-3">
            Your Journey of Self-Discovery Continues
          </h2>
          
          {/* Philosophical Message */}
          <p className="text-amber-700 dark:text-amber-300 mb-6 leading-relaxed">
            "The unexamined life is not worth living." - Socrates
            <br /><br />
            You've begun tracking your emotional patterns. Create an account to preserve these valuable insights and 
            <span className="font-semibold"> unlock the deeper wisdom within your Personal Growth Journal.</span>
          </p>
          
          {/* Benefits */}
          <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">Transform Your Self-Awareness:</h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 text-left">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 flex-shrink-0"></span>
                <span>Chronicle your emotional journey across time</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 flex-shrink-0"></span>
                <span>Discover hidden patterns in your mood cycles</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 flex-shrink-0"></span>
                <span>Access your reflections from any device</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 flex-shrink-0"></span>
                <span>Turn awareness into lasting transformation</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation("/register")}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <span className="mr-2">✨</span>
              Create Your Free Account
              <span className="ml-2">✨</span>
            </Button>
            <Button 
              onClick={() => setLocation("/login")}
              variant="outline" 
              className="w-full border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show loading state first while authentication is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 p-6 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show Account Required screen for unauthenticated users (only after loading is complete)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 p-6 pt-20 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-2 border-purple-200/70 dark:border-purple-600/40 shadow-2xl">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg mb-6">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          
          {/* Headline */}
          <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-3">
            Account Required
          </h2>
          
          {/* Elevator Pitch */}
          <p className="text-purple-700 dark:text-purple-300 mb-6 leading-relaxed">
            <span className="font-medium">New here?</span> Create your account at <span className="font-semibold">insidemeter.com</span> first to start tracking your emotional journey.
            <br /><br />
            <span className="text-sm text-purple-600 dark:text-purple-400">
              Your iOS app is the perfect pocket companion for quick mood entries on the go.
            </span>
          </p>
          
          {/* Sign In Button */}
          <Button 
            onClick={() => setLocation("/ios-login")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 px-3 sm:px-6 pb-3 sm:pb-6 pt-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 px-2 mt-8 sm:mt-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <h1 className="text-2xl sm:text-4xl font-bold">
              <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 bg-clip-text text-transparent" style={{
                backgroundImage: 'linear-gradient(to right, #9333ea, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Personal Growth Journal
              </span>
            </h1>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-gray-700 dark:text-gray-300 font-medium text-base sm:text-lg px-2 leading-relaxed">
              Your private reflections and emotional journey over time
            </p>
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50 rounded-lg px-3 py-2 sm:px-4 shadow-sm mx-2 sm:mx-0">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">Private and Secure</span>
                  <span className="hidden sm:inline"> • </span>
                  <br className="sm:hidden" />
                  <span className="text-xs">Write freely. Find patterns. Create gentle change.</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Show form or entry list */}
        {showForm || editingEntry ? (
          <JournalEntryForm
            entry={editingEntry || undefined}
            onCancel={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
            onSuccess={() => {
              // Force a small delay to ensure data refetches before hiding form
              setTimeout(() => {
                setShowForm(false);
                setEditingEntry(null);
              }, 100);
            }}
            isAuthenticated={isAuthenticated}
          />
        ) : (
          <>
            {/* Growth Stats */}
            {journalEntries.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50 p-6 shadow-lg mb-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
                  Your Growth Journey
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-4 border border-purple-100/50 dark:border-purple-800/30">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {journalEntries.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Journal Entries</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4 border border-blue-100/50 dark:border-blue-800/30">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {journalEntries.filter(entry => entry.content && entry.content.trim().length > 0).length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Entries with Content</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg p-4 border border-pink-100/50 dark:border-pink-800/30">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      {journalEntries.reduce((total, entry) => total + (entry.content?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Words Written</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Add Entry Button */}
            <div className="mb-6 text-center">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Journal Entry
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Reflect on your thoughts and experiences
              </p>
            </div>

            {/* Journal Entries */}
            {journalEntries.length === 0 ? (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50 p-8 text-center shadow-lg">
                <BookOpen className="w-16 h-16 text-purple-400 dark:text-purple-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  No Journal Entries Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start by adding your first journal entry to begin your growth journey.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {journalEntries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry) => (
                    <Card 
                      key={entry.id} 
                      className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50 p-4 sm:p-6 hover:border-purple-300/70 dark:hover:border-purple-600/70 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {/* Header with date and actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                            <span className="text-gray-800 dark:text-white font-medium text-sm sm:text-base">
                              {format(new Date(entry.date), 'MMMM d, yyyy')}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                              {format(new Date(entry.date), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Edit and Delete buttons */}
                        <div className="flex items-center gap-1 ml-2 sm:ml-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEntry(entry)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-purple-500 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                          >
                            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(entry.id)}
                            disabled={deleteMutation.isPending}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Goals if present */}
                      {entry.goals && entry.goals.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 dark:text-green-400" />
                            Goals
                          </h4>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {entry.goals.map((goal, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs border border-green-200/50 dark:border-green-700/50"
                              >
                                {goal}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Journal Content */}
                      {entry.content && entry.content.trim() && (
                        <div className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-purple-100/50 dark:border-purple-800/30">
                          <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 dark:text-purple-400" />
                            Journal Entry
                          </h4>
                          <div className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {entry.content}
                          </div>
                        </div>
                      )}

                      {/* Categories/Tags if present */}
                      {entry.categories && entry.categories.length > 0 && (
                        <div className="mt-4 pt-3 sm:pt-4 border-t border-gray-200/50 dark:border-slate-600/50">
                          <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 dark:text-blue-400" />
                            Categories
                          </h4>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {entry.categories.map((category, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs border border-blue-200/50 dark:border-blue-700/50"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}