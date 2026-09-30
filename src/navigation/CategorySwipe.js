import { createContext, useContext } from 'react';

// Geste horizontal du pager, exposé aux carrousels imbriqués afin qu'ils
// puissent lui déclarer explicitement leur priorité.
export const CategorySwipeContext = createContext(null);

export const useCategorySwipeGesture = () => useContext(CategorySwipeContext);
