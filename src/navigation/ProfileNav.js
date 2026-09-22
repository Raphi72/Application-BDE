import { createContext, useContext } from 'react';

/**
 * Profil vit dans la pile racine, au-dessus du pager de catégories
 * (Events/Polls/News/Clubs). Ce contexte, fourni par le pager, donne aux
 * écrans de catégorie une fonction pour ouvrir Profil depuis leurs en-têtes
 * sans dépendre de la hiérarchie de navigation.
 */
export const ProfileNavContext = createContext(() => {});

export function useOpenProfile() {
  return useContext(ProfileNavContext);
}
