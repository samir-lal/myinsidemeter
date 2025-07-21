import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface GuestSession {
  guestId: string;
  moodCount: number;
  needsAccount: boolean;
}

export function useGuestSession() {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  // Initialize guest session on mount
  useEffect(() => {
    // Check for app version to force cache refresh
    const APP_VERSION = "2.3.0"; // Increment this to force refresh
    const storedVersion = localStorage.getItem("appVersion");
    
    if (storedVersion !== APP_VERSION) {
      // Clear all localStorage for cache refresh
      localStorage.clear();
      localStorage.setItem("appVersion", APP_VERSION);
      console.log("App version updated to", APP_VERSION);
    }
    
    const storedSession = localStorage.getItem("guestSession");
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setGuestSession(session);
      } catch (error) {
        console.error("Failed to parse guest session, creating new one");
        createNewGuestSession();
      }
    } else {
      createNewGuestSession();
    }

    function createNewGuestSession() {
      const newSession: GuestSession = {
        guestId: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        moodCount: 0,
        needsAccount: false,
      };

      setGuestSession(newSession);
      localStorage.setItem("guestSession", JSON.stringify(newSession));
    }
  }, []);

  // Get guest mood entries to count them
  const { data: guestEntries } = useQuery({
    queryKey: ["/api/mood-entries", guestSession?.guestId],
    queryFn: async () => {
      if (!guestSession?.guestId) return [];
      const response = await fetch(`/api/mood-entries?guestId=${guestSession.guestId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!guestSession?.guestId,
  });

  // Update mood count and check if account is needed
  useEffect(() => {
    if (guestEntries && guestSession) {
      const currentCount = guestEntries.length;
      const needsAccount = currentCount > 1; // Changed from >= 3 to > 1
      
      if (currentCount !== guestSession.moodCount || needsAccount !== guestSession.needsAccount) {
        const updatedSession = {
          ...guestSession,
          moodCount: currentCount,
          needsAccount,
        };
        setGuestSession(updatedSession);
        localStorage.setItem("guestSession", JSON.stringify(updatedSession));
      }
    }
  }, [guestEntries, guestSession]);

  const incrementMoodCount = () => {
    if (guestSession) {
      const updatedSession = {
        ...guestSession,
        moodCount: guestSession.moodCount + 1,
        needsAccount: guestSession.moodCount + 1 > 1, // Changed from >= 3 to > 1
      };
      setGuestSession(updatedSession);
      localStorage.setItem("guestSession", JSON.stringify(updatedSession));
    }
  };

  const clearGuestSession = () => {
    localStorage.removeItem("guestSession");
    setGuestSession(null);
  };

  return {
    guestSession,
    guestId: guestSession?.guestId,
    incrementMoodCount,
    clearGuestSession,
  };
}