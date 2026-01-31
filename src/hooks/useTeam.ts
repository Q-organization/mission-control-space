import { useState, useEffect, useCallback } from 'react';
import { supabase, getTeamFromUrl, getStoredTeamId, setStoredTeamId, getShareUrl } from '../lib/supabase';
import type { MultiplayerTeam } from '../types';

interface UseTeamOptions {
  onTeamJoined?: (team: MultiplayerTeam) => void;
  onError?: (error: string) => void;
}

interface UseTeamReturn {
  team: MultiplayerTeam | null;
  isLoading: boolean;
  error: string | null;
  createTeam: (name?: string) => Promise<MultiplayerTeam | null>;
  joinTeam: (inviteCode: string) => Promise<MultiplayerTeam | null>;
  getShareUrl: () => string | null;
  leaveTeam: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const teamRowToMultiplayer = (row: any): MultiplayerTeam => ({
  id: row.id,
  name: row.name,
  inviteCode: row.invite_code,
  teamPoints: row.team_points,
  completedPlanets: row.completed_planets || [],
});

export function useTeam(options: UseTeamOptions = {}): UseTeamReturn {
  const [team, setTeam] = useState<MultiplayerTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a new team
  const createTeam = useCallback(async (name = 'Mission Control Team'): Promise<MultiplayerTeam | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('teams')
        .insert({ name })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (!data) {
        throw new Error('Failed to create team');
      }

      const multiplayerTeam = teamRowToMultiplayer(data);
      setTeam(multiplayerTeam);
      setStoredTeamId(data.id);

      // Update URL with invite code without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('team', data.invite_code);
      window.history.replaceState({}, '', url.toString());

      options.onTeamJoined?.(multiplayerTeam);
      return multiplayerTeam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create team';
      setError(message);
      options.onError?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  // Join an existing team by invite code
  const joinTeam = useCallback(async (inviteCode: string): Promise<MultiplayerTeam | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('teams')
        .select()
        .eq('invite_code', inviteCode)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Team not found. Check your invite code.');
        }
        throw new Error(fetchError.message);
      }

      if (!data) {
        throw new Error('Team not found');
      }

      const multiplayerTeam = teamRowToMultiplayer(data);
      setTeam(multiplayerTeam);
      setStoredTeamId(data.id);

      // Update URL with invite code without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('team', data.invite_code);
      window.history.replaceState({}, '', url.toString());

      options.onTeamJoined?.(multiplayerTeam);
      return multiplayerTeam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join team';
      setError(message);
      options.onError?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  // Get shareable URL for current team
  const getTeamShareUrl = useCallback((): string | null => {
    if (!team) return null;
    return getShareUrl(team.inviteCode);
  }, [team]);

  // Leave current team
  const leaveTeam = useCallback(() => {
    setTeam(null);
    localStorage.removeItem('mission-control-team-id');

    // Remove team from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('team');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Initialize: check URL for team code, then localStorage
  useEffect(() => {
    const initializeTeam = async () => {
      setIsLoading(true);

      // First check URL for invite code
      const urlTeamCode = getTeamFromUrl();
      if (urlTeamCode) {
        await joinTeam(urlTeamCode);
        return;
      }

      // Then check localStorage for saved team ID
      const storedTeamId = getStoredTeamId();
      if (storedTeamId) {
        try {
          const { data, error: fetchError } = await supabase
            .from('teams')
            .select()
            .eq('id', storedTeamId)
            .single();

          if (!fetchError && data) {
            const multiplayerTeam = teamRowToMultiplayer(data);
            setTeam(multiplayerTeam);

            // Update URL with invite code
            const url = new URL(window.location.href);
            url.searchParams.set('team', data.invite_code);
            window.history.replaceState({}, '', url.toString());

            options.onTeamJoined?.(multiplayerTeam);
          } else {
            // Team no longer exists, clear stored ID
            localStorage.removeItem('mission-control-team-id');
          }
        } catch {
          localStorage.removeItem('mission-control-team-id');
        }
      }

      setIsLoading(false);
    };

    initializeTeam();
  }, []); // Run only once on mount

  return {
    team,
    isLoading,
    error,
    createTeam,
    joinTeam,
    getShareUrl: getTeamShareUrl,
    leaveTeam,
  };
}
