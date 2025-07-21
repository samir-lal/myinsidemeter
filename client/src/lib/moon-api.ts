export interface MoonPhaseAPI {
  phase: string;
  illumination: number;
  name: string;
  date: Date;
}

export async function fetchMoonPhase(date: Date = new Date()): Promise<MoonPhaseAPI> {
  try {
    // Primary API: FarmSense Moon Phases API
    const timestamp = Math.floor(date.getTime() / 1000);
    const response = await fetch(`https://api.farmsense.net/v1/moonphases/?d=${timestamp}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const phaseData = data[0];
        return {
          phase: phaseData.Phase?.toLowerCase().replace(' ', '_') || 'unknown',
          illumination: phaseData.Illumination || 0,
          name: phaseData.Phase || 'Unknown',
          date: date
        };
      }
    }
    
    // Fallback to calculation if API fails
    return calculateMoonPhase(date);
  } catch (error) {
    console.warn('Moon API error, using fallback calculation:', error);
    return calculateMoonPhase(date);
  }
}

export function calculateMoonPhase(date: Date): MoonPhaseAPI {
  const synodicMonth = 29.530588853; // Length of moon cycle in days
  const newMoon = new Date('2000-01-06T18:14:00Z'); // Known new moon reference
  
  const daysSinceNewMoon = (date.getTime() - newMoon.getTime()) / (1000 * 60 * 60 * 24);
  const currentCycle = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
  
  let phase: string;
  let name: string;
  
  // Calculate illumination percentage
  const illumination = Math.round(
    (1 - Math.cos((currentCycle / synodicMonth) * 2 * Math.PI)) * 50
  );
  
  // Determine phase based on cycle position
  if (currentCycle < 1.84566) {
    phase = 'new';
    name = 'New Moon';
  } else if (currentCycle < 5.53699) {
    phase = 'waxing_crescent';
    name = 'Waxing Crescent';
  } else if (currentCycle < 9.22831) {
    phase = 'first_quarter';
    name = 'First Quarter';
  } else if (currentCycle < 12.91963) {
    phase = 'waxing_gibbous';
    name = 'Waxing Gibbous';
  } else if (currentCycle < 16.61096) {
    phase = 'full';
    name = 'Full Moon';
  } else if (currentCycle < 20.30228) {
    phase = 'waning_gibbous';
    name = 'Waning Gibbous';
  } else if (currentCycle < 23.99361) {
    phase = 'last_quarter';
    name = 'Last Quarter';
  } else {
    phase = 'waning_crescent';
    name = 'Waning Crescent';
  }
  
  return {
    phase,
    illumination,
    name,
    date
  };
}

export function getMoonPhaseEmoji(phase: string): string {
  const phaseEmojis: Record<string, string> = {
    'new': '🌑',
    'waxing_crescent': '🌒',
    'first_quarter': '🌓',
    'waxing_gibbous': '🌔',
    'full': '🌕',
    'waning_gibbous': '🌖',
    'last_quarter': '🌗',
    'waning_crescent': '🌘'
  };
  
  return phaseEmojis[phase] || '🌑';
}
