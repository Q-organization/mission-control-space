import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Types matching App.tsx
interface Goal {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'big';
  description?: string;
  realWorldReward?: string;
  points?: number;
  targetDate?: string;
}

interface Goals {
  business: Goal[];
  product: Goal[];
  achievement: Goal[];
}

interface CustomPlanet {
  id: string;
  name: string;
  description?: string;
  type: 'business' | 'product' | 'achievement' | 'notion';
  size: 'small' | 'medium' | 'big';
  realWorldReward?: string;
  imageUrl?: string;
  createdBy: string;
}

interface UserPlanet {
  imageUrl: string;
  baseImage?: string;
  terraformCount: number;
  history: { imageUrl: string; description: string; timestamp: number }[];
  sizeLevel: number;
}

interface MascotHistoryEntry {
  imageUrl: string;
  planetName: string;
  timestamp: number;
  earnedBy: string;
}

// Default goals
const DEFAULT_GOALS: Goals = {
  business: [
    { id: 'b1', name: 'Gates open — 5 paying customers', size: 'small', points: 100, targetDate: '2026-02-12' },
    { id: 'b2', name: '10 customers / $5k MRR', size: 'small', points: 200, targetDate: '2026-02-19' },
    { id: 'b3', name: '20 customers / $10k MRR', size: 'small', points: 400, targetDate: '2026-02-28' },
    { id: 'b4', name: 'Hugues starts to open the gates', size: 'medium', points: 300, targetDate: '2026-03-07' },
    { id: 'b5', name: '$20k MRR', size: 'medium', points: 500, targetDate: '2026-03-14' },
    { id: 'b6', name: 'Affiliate/referral program live', size: 'medium', points: 300, targetDate: '2026-03-21' },
    { id: 'b7', name: '100 customers / $50k MRR', size: 'medium', points: 750, targetDate: '2026-03-31' },
    { id: 'b8', name: 'First agency partnership signed', size: 'medium', points: 500, targetDate: '2026-04-15' },
    { id: 'b9', name: '$100k MRR', size: 'big', points: 1000, targetDate: '2026-04-30' },
    { id: 'b10', name: '$150k MRR', size: 'big', points: 1500, targetDate: '2026-05-31' },
    { id: 'b11', name: '$250k MRR', size: 'big', points: 2500, targetDate: '2026-06-30' },
    { id: 'b12', name: '$500k MRR', size: 'big', points: 5000, targetDate: '2026-09-30' },
    { id: 'b13', name: '$1M MRR', size: 'big', points: 10000, targetDate: '2026-12-31' },
    { id: 'b14', name: '$3M MRR / $36M ARR', size: 'big', points: 15000, targetDate: '2027-06-30' },
    { id: 'b15', name: '$5M MRR / $60M ARR', size: 'big', points: 25000, targetDate: '2027-12-31' },
  ],
  product: [
    { id: 'p1', name: 'Templates Ready', size: 'small', points: 20, targetDate: '2026-02-06' },
    { id: 'p2', name: 'Public Launch', size: 'small', points: 30, targetDate: '2026-02-10' },
    { id: 'p3', name: 'Onboarding Wizard', size: 'small', points: 40, targetDate: '2026-02-21' },
    { id: 'p4', name: 'Educational Videos', size: 'medium', points: 60, targetDate: '2026-03-07' },
    { id: 'p5', name: '100 Videos Processed', size: 'medium', points: 80, targetDate: '2026-03-14' },
    { id: 'p6', name: 'Analytics Functioning', size: 'medium', points: 100, targetDate: '2026-03-31' },
    { id: 'p7', name: '1,000 Videos Processed', size: 'medium', points: 150, targetDate: '2026-04-30' },
    { id: 'p8', name: '50 Templates', size: 'medium', points: 200, targetDate: '2026-05-31' },
    { id: 'p9', name: 'Smooth UX Achieved', size: 'big', points: 300, targetDate: '2026-06-30' },
    { id: 'p10', name: '"Where Are The Bugs?"', size: 'big', points: 500, targetDate: '2026-09-30' },
    { id: 'p11', name: '100,000 Videos Processed', size: 'big', points: 750, targetDate: '2026-12-31' },
    { id: 'p12', name: 'AI Agent Builds Funnels', size: 'big', points: 1500, targetDate: '2027-06-30' },
    { id: 'p13', name: 'Desktop Version', size: 'big', points: 2000, targetDate: '2027-09-30' },
    { id: 'p14', name: '1,000,000 Videos Processed', size: 'big', points: 5000, targetDate: '2027-12-31' },
  ],
  achievement: [
    { id: 'a1', name: 'First Organic Signup', size: 'small', points: 20 },
    { id: 'a2', name: 'First Paying Customer', size: 'small', points: 30 },
    { id: 'a3', name: 'First Referral', size: 'small', points: 40 },
    { id: 'a4', name: 'First Week Streak', size: 'small', points: 50 },
    { id: 'a5', name: '10 Referrals', size: 'medium', points: 75 },
    { id: 'a6', name: 'Customers in 10+ Countries', size: 'medium', points: 100 },
    { id: 'a7', name: 'First Podcast Appearance', size: 'medium', points: 100 },
    { id: 'a8', name: 'First $10k Day', size: 'medium', points: 150 },
    { id: 'a9', name: 'Big Podcast (100k+ audience)', size: 'medium', points: 250 },
    { id: 'a10', name: 'Customers in 50+ Countries', size: 'big', points: 300 },
    { id: 'a11', name: 'Competitor Copies Us', size: 'big', points: 400 },
    { id: 'a12', name: 'Product Hunt Top 5', size: 'big', points: 500 },
    { id: 'a13', name: 'Hacker News Front Page', size: 'big', points: 600 },
    { id: 'a14', name: 'TechCrunch/Forbes Mention', size: 'big', points: 750 },
    { id: 'a15', name: 'Product Hunt #1 of Day', size: 'big', points: 1000 },
    { id: 'a16', name: 'Remy Jupille Uses Us', size: 'big', points: 1000 },
    { id: 'a17', name: 'Yomi Denzel Uses Us', size: 'big', points: 1250 },
    { id: 'a18', name: 'Iman Gadzhi Uses Us', size: 'big', points: 1500 },
    { id: 'a19', name: 'Charlie Morgan Uses Us', size: 'big', points: 1500 },
    { id: 'a20', name: 'Viral Video (1M+ views)', size: 'big', points: 2000 },
    { id: 'a21', name: 'Gary Vee Notice', size: 'big', points: 3000 },
    { id: 'a22', name: 'Alex Hormozi Notice', size: 'big', points: 3000 },
    { id: 'a23', name: 'Wikipedia Page', size: 'big', points: 5000 },
    { id: 'a24', name: 'Customer Tattoos Logo', size: 'big', points: 10000 },
  ],
};

interface UseSupabaseDataOptions {
  teamId: string | null;
  playerId: string | null;
  username: string;
}

interface UseSupabaseDataReturn {
  // Data (loaded from Supabase)
  goals: Goals;
  customPlanets: CustomPlanet[];
  userPlanets: Record<string, UserPlanet>;
  mascotHistory: MascotHistoryEntry[];

  // Loading state
  isLoading: boolean;

  // Save functions
  saveGoals: (goals: Goals) => Promise<void>;
  saveCustomPlanets: (planets: CustomPlanet[]) => Promise<void>;
  saveUserPlanet: (userId: string, planet: UserPlanet) => Promise<void>;
  saveMascotHistory: (history: MascotHistoryEntry[]) => Promise<void>;

  // Refresh
  refreshData: () => Promise<void>;
}

/**
 * Hook to load and save data from Supabase.
 * Supabase is the ONLY source of truth - no localStorage.
 */
export function useSupabaseData(options: UseSupabaseDataOptions): UseSupabaseDataReturn {
  const { teamId, playerId, username } = options;

  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [customPlanets, setCustomPlanets] = useState<CustomPlanet[]>([]);
  const [userPlanets, setUserPlanets] = useState<Record<string, UserPlanet>>({});
  const [mascotHistory, setMascotHistory] = useState<MascotHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const initialLoadDone = useRef(false);

  // Fetch all data from Supabase
  const fetchFromSupabase = useCallback(async () => {
    if (!teamId) return;

    console.log('[useSupabaseData] Fetching from Supabase...');

    try {
      // Fetch team data (goals, custom_planets)
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('goals, custom_planets')
        .eq('id', teamId)
        .single();

      if (teamError) {
        console.error('[useSupabaseData] Error fetching team:', teamError);
      } else if (teamData) {
        // Only use Supabase goals if they exist and have content
        if (teamData.goals && typeof teamData.goals === 'object') {
          const supabaseGoals = teamData.goals as Goals;
          // Check if goals have actual content (not just empty arrays)
          const hasContent = supabaseGoals.business?.length > 0 ||
                            supabaseGoals.product?.length > 0 ||
                            supabaseGoals.achievement?.length > 0;
          if (hasContent) {
            setGoals(supabaseGoals);
          }
        }
        if (teamData.custom_planets && Array.isArray(teamData.custom_planets)) {
          setCustomPlanets(teamData.custom_planets as CustomPlanet[]);
        }
      }

      // Fetch all players' planet data for this team
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('username, planet_image_url, planet_base_image, planet_terraform_count, planet_size_level, planet_history, mascot_history')
        .eq('team_id', teamId);

      if (playersError) {
        console.error('[useSupabaseData] Error fetching players:', playersError);
      } else if (playersData) {
        const planets: Record<string, UserPlanet> = {};
        let currentUserMascotHistory: MascotHistoryEntry[] = [];

        for (const player of playersData) {
          if (player.planet_image_url || player.planet_terraform_count > 0) {
            planets[player.username] = {
              imageUrl: player.planet_image_url || '',
              baseImage: player.planet_base_image || undefined,
              terraformCount: player.planet_terraform_count || 0,
              sizeLevel: player.planet_size_level || 0,
              history: (player.planet_history as UserPlanet['history']) || [],
            };
          }

          // Get mascot history for current user
          if (player.username === username && player.mascot_history) {
            currentUserMascotHistory = player.mascot_history as MascotHistoryEntry[];
          }
        }

        setUserPlanets(planets);
        setMascotHistory(currentUserMascotHistory);
      }

      console.log('[useSupabaseData] Fetch complete');
    } catch (err) {
      console.error('[useSupabaseData] Fetch error:', err);
    }
  }, [teamId, username]);

  // Refresh data from Supabase
  const refreshData = useCallback(async () => {
    await fetchFromSupabase();
  }, [fetchFromSupabase]);

  // Save goals to Supabase
  const saveGoals = useCallback(async (newGoals: Goals) => {
    setGoals(newGoals);

    if (!teamId) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ goals: newGoals })
        .eq('id', teamId);

      if (error) {
        console.error('[useSupabaseData] Error saving goals:', error);
      }
    } catch (err) {
      console.error('[useSupabaseData] Exception saving goals:', err);
    }
  }, [teamId]);

  // Save custom planets to Supabase
  const saveCustomPlanets = useCallback(async (planets: CustomPlanet[]) => {
    setCustomPlanets(planets);

    if (!teamId) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ custom_planets: planets })
        .eq('id', teamId);

      if (error) {
        console.error('[useSupabaseData] Error saving custom planets:', error);
      }
    } catch (err) {
      console.error('[useSupabaseData] Exception saving custom planets:', err);
    }
  }, [teamId]);

  // Save user planet to Supabase
  const saveUserPlanet = useCallback(async (userId: string, planet: UserPlanet) => {
    setUserPlanets(prev => ({ ...prev, [userId]: planet }));

    if (!playerId || userId !== username) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({
          planet_image_url: planet.imageUrl,
          planet_base_image: planet.baseImage,
          planet_terraform_count: planet.terraformCount,
          planet_size_level: planet.sizeLevel,
          planet_history: planet.history,
        })
        .eq('id', playerId);

      if (error) {
        console.error('[useSupabaseData] Error saving user planet:', error);
      }
    } catch (err) {
      console.error('[useSupabaseData] Exception saving user planet:', err);
    }
  }, [playerId, username]);

  // Save mascot history to Supabase
  const saveMascotHistory = useCallback(async (history: MascotHistoryEntry[]) => {
    const cleanHistory = history
      .filter(entry => !entry.imageUrl.startsWith('data:'))
      .slice(-50);

    setMascotHistory(cleanHistory);

    if (!playerId) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ mascot_history: cleanHistory })
        .eq('id', playerId);

      if (error) {
        console.error('[useSupabaseData] Error saving mascot history:', error);
      }
    } catch (err) {
      console.error('[useSupabaseData] Exception saving mascot history:', err);
    }
  }, [playerId]);

  // Initial load from Supabase
  useEffect(() => {
    if (!teamId || initialLoadDone.current) return;

    const init = async () => {
      setIsLoading(true);
      await fetchFromSupabase();
      initialLoadDone.current = true;
      setIsLoading(false);
    };

    init();
  }, [teamId, fetchFromSupabase]);

  // Reset initialLoadDone when teamId changes
  useEffect(() => {
    initialLoadDone.current = false;
  }, [teamId]);

  // Subscribe to real-time updates for team data
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`supabase-data:${teamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` },
        (payload) => {
          const data = payload.new;
          if (data.goals && typeof data.goals === 'object') {
            const supabaseGoals = data.goals as Goals;
            const hasContent = supabaseGoals.business?.length > 0 ||
                              supabaseGoals.product?.length > 0 ||
                              supabaseGoals.achievement?.length > 0;
            if (hasContent) {
              setGoals(supabaseGoals);
            }
          }
          if (data.custom_planets && Array.isArray(data.custom_planets)) {
            setCustomPlanets(data.custom_planets as CustomPlanet[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Subscribe to player updates (for seeing other players' planet changes)
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`player-planets:${teamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const data = payload.new as {
            username: string;
            planet_image_url: string;
            planet_base_image: string;
            planet_terraform_count: number;
            planet_size_level: number;
            planet_history: UserPlanet['history'];
          };

          if (data.planet_image_url || data.planet_terraform_count > 0) {
            setUserPlanets(prev => ({
              ...prev,
              [data.username]: {
                imageUrl: data.planet_image_url || '',
                baseImage: data.planet_base_image || prev[data.username]?.baseImage,
                terraformCount: data.planet_terraform_count || 0,
                sizeLevel: data.planet_size_level || 0,
                history: data.planet_history || [],
              }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  return {
    goals,
    customPlanets,
    userPlanets,
    mascotHistory,
    isLoading,
    saveGoals,
    saveCustomPlanets,
    saveUserPlanet,
    saveMascotHistory,
    refreshData,
  };
}
