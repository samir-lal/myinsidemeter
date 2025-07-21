import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Heart, Mountain, Gamepad2, TreePine, Plus } from "lucide-react";

const activities = [
  { id: "gym", label: "Gym", icon: Dumbbell },
  { id: "yoga", label: "Yoga", icon: Heart },
  { id: "meditation", label: "Meditation", icon: Mountain },
  { id: "sports", label: "Sports", icon: Gamepad2 },
  { id: "outdoors", label: "Outdoors", icon: TreePine },
  { id: "other", label: "Other", icon: Plus },
];

interface ActivitySelectorProps {
  selectedActivities: string[];
  onActivitiesChange: (activities: string[]) => void;
}

export default function ActivitySelector({ selectedActivities, onActivitiesChange }: ActivitySelectorProps) {
  const activityColors = {
    gym: { 
      gradient: 'from-red-400 to-red-600',
      icon: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      hoverBorder: 'hover:border-red-300 dark:hover:border-red-700'
    },
    yoga: { 
      gradient: 'from-cyan-400 to-cyan-600',
      icon: 'text-cyan-500',
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      border: 'border-cyan-200 dark:border-cyan-800',
      hoverBorder: 'hover:border-cyan-300 dark:hover:border-cyan-700'
    },
    meditation: { 
      gradient: 'from-purple-400 to-purple-600',
      icon: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700'
    },
    sports: { 
      gradient: 'from-amber-400 to-amber-600',
      icon: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700'
    },
    outdoors: { 
      gradient: 'from-green-400 to-green-600',
      icon: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      hoverBorder: 'hover:border-green-300 dark:hover:border-green-700'
    },
    other: { 
      gradient: 'from-gray-400 to-gray-600',
      icon: 'text-gray-500',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-700'
    }
  };

  const toggleActivity = (activityId: string) => {
    const newActivities = selectedActivities.includes(activityId)
      ? selectedActivities.filter(id => id !== activityId)
      : [...selectedActivities, activityId];
    onActivitiesChange(newActivities);
  };

  return (
    <div className="p-4 bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/60 rounded-xl border border-white/20 backdrop-blur-sm shadow-lg">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
        <h3 className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Activities Done Today (optional)
        </h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {activities.map((activity) => {
          const Icon = activity.icon;
          const isSelected = selectedActivities.includes(activity.id);
          const colors = activityColors[activity.id as keyof typeof activityColors];
          
          return (
            <div
              key={activity.id}
              onClick={() => toggleActivity(activity.id)}
              className={`group relative h-16 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-105 border ${
                isSelected 
                  ? `bg-gradient-to-br ${colors.gradient} shadow-md border-white/30` 
                  : `${colors.bg} ${colors.border} ${colors.hoverBorder}`
              }`}
            >
              <div className="flex flex-col items-center justify-center h-full space-y-1 relative z-10">
                <Icon 
                  size={18} 
                  className={`transition-colors duration-200 ${
                    isSelected 
                      ? 'text-white drop-shadow-sm' 
                      : `${colors.icon} group-hover:scale-110`
                  }`} 
                />
                <span className={`text-xs font-medium transition-colors duration-200 ${
                  isSelected 
                    ? 'text-white drop-shadow-sm' 
                    : `${colors.icon} group-hover:font-semibold`
                }`}>
                  {activity.label}
                </span>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      

    </div>
  );
}