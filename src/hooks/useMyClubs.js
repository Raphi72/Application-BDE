import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { EMPTY_CLUB_STATE, fetchMyClubState } from '../services/clubService';

/**
 * Adhésions de l'utilisateur connecté : ses clubs (avec son rôle), ses
 * demandes en attente et, pour les clubs qu'il préside, le nombre de demandes
 * à traiter. Rechargé chaque fois que l'écran reprend le focus.
 */
export function useMyClubs() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState(EMPTY_CLUB_STATE);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setState(await fetchMyClubState(userId));
    } catch (error) {
      // Migration pas encore passée ou réseau : l'app reste utilisable, sans
      // les infos d'adhésion.
      console.warn('Adhésions aux clubs indisponibles :', error?.message);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { ...state, loaded, refresh };
}
