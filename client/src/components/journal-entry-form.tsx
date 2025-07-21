import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, BookOpen, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface JournalEntry {
  id?: number;
  date: string;
  content: string;
  goals?: string[];
  categories?: string[];
}

interface JournalEntryFormProps {
  entry?: JournalEntry;
  onCancel: () => void;
  onSuccess: () => void;
  isAuthenticated: boolean;
}

export default function JournalEntryForm({ entry, onCancel, onSuccess, isAuthenticated }: JournalEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [date, setDate] = useState(entry?.date || format(new Date(), 'yyyy-MM-dd'));
  const [content, setContent] = useState(entry?.content || '');
  const [goals, setGoals] = useState(entry?.goals?.join(', ') || '');
  const [categories, setCategories] = useState(entry?.categories?.join(', ') || '');

  // Create/update journal entry mutation
  const createMutation = useMutation({
    mutationFn: async (journalData: any) => {
      if (entry?.id) {
        // Update existing entry
        return await apiRequest("PUT", `/api/daily-journal/${entry.id}`, journalData);
      } else {
        // Create new entry
        return await apiRequest("POST", "/api/daily-journal", journalData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-journal"] });
      toast({
        title: entry?.id ? "Entry updated" : "Entry created",
        description: entry?.id ? "Your journal entry has been updated." : "Your journal entry has been saved."
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save entry: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please write something in your journal entry.",
        variant: "destructive"
      });
      return;
    }

    const journalData = {
      date,
      content: content.trim(),
      goals: goals.split(',').map(g => g.trim()).filter(g => g.length > 0),
      categories: categories.split(',').map(c => c.trim()).filter(c => c.length > 0)
    };

    createMutation.mutate(journalData);
  };

  return (
    <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {entry?.id ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/80 dark:bg-slate-700/80"
            required
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Journal Entry
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write about your thoughts, feelings, experiences, or anything on your mind..."
            className="bg-white/80 dark:bg-slate-700/80 min-h-[120px]"
            required
          />
        </div>

        {/* Goals */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Goals (optional, separate with commas)
          </label>
          <Input
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Exercise, Read a book, Meditate"
            className="bg-white/80 dark:bg-slate-700/80"
          />
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Categories (optional, separate with commas)
          </label>
          <Input
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="Personal, Work, Health, Relationships"
            className="bg-white/80 dark:bg-slate-700/80"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Saving...' : (entry?.id ? 'Update Entry' : 'Save Entry')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}