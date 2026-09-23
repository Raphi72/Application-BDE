/**
 * Thème « NØVYX » — pop varsity.
 *
 * Papier crème, encre presque noire, blocs de couleur vive, contours épais et
 * ombres dures décalées. Règle de contraste : les couleurs vives servent de
 * FOND avec du texte encre par-dessus ; pour du texte coloré sur papier, on
 * utilise les variantes foncées (*Text).
 */
export const PALETTE = {
  paper: '#FFF4E6',
  paperDeep: '#F6E2C6',
  white: '#FFFDF9',
  ink: '#17120E',
  inkSoft: '#62564B',

  tangerine: '#FF5A1F',
  periwinkle: '#8A7DFF',
  sun: '#FFC53D',
  lime: '#C3F04A',
  bubblegum: '#FF85C8',
  mint: '#43D9AD',
  cherry: '#E8322C',
};

export const COLORS = {
  // Fonds
  background: PALETTE.paper,
  surface: PALETTE.white,
  surfaceLight: '#EBDCC6', // séparateurs, fonds discrets, états désactivés

  // Textes
  text: PALETTE.ink,
  textSecondary: PALETTE.inkSoft,

  // Accents (fonds) et leurs variantes lisibles en texte sur papier
  primary: PALETTE.tangerine,
  primaryText: '#B83A0B',
  secondary: PALETTE.periwinkle,
  secondaryText: '#5A4FCF',
  onPrimary: PALETTE.ink, // texte / icône posé sur un fond coloré

  // Fonctionnels (lisibles en texte sur papier)
  success: '#0E7A41',
  error: '#C8201B',
  warning: '#8A5300',

  // Éléments
  border: PALETTE.ink,
  inputBackground: PALETTE.white,
};

// Couleur signature de chaque rubrique : header, onglet actif, accents.
export const SECTION_COLORS = {
  Events: PALETTE.tangerine,
  Polls: PALETTE.periwinkle,
  News: PALETTE.sun,
  Clubs: PALETTE.lime,
  Admin: PALETTE.bubblegum,
  Profile: PALETTE.bubblegum,
};

// Rotation de couleurs pour les éléments sans visuel (événement sans photo,
// pastille de club…) : choisie de façon stable à partir d'un identifiant.
export const ACCENT_CYCLE = [
  PALETTE.tangerine,
  PALETTE.periwinkle,
  PALETTE.sun,
  PALETTE.lime,
  PALETTE.bubblegum,
  PALETTE.mint,
];

export const accentFor = (key) => {
  const str = String(key ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return ACCENT_CYCLE[Math.abs(hash) % ACCENT_CYCLE.length];
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

// Petit élément (chip, input) / carte / grand conteneur
export const RADIUS = {
  s: 10,
  m: 18,
  l: 24,
};

// Épaisseur de contour et décalage des ombres dures (style pop)
export const STROKE = 2.5;
export const HARD_SHADOW = { x: 4, y: 5 };

export const FONTS = {
  // Titres : grosse, tranchée, festive
  display: 'DelaGothicOne_400Regular',
  // Chiffres, étiquettes, chips : condensée façon maillot varsity
  varsity: 'BigShouldersDisplay_900Black',
  varsityBold: 'BigShouldersDisplay_800ExtraBold',
  // Texte courant
  body: 'SpaceGrotesk_400Regular',
  bodyMedium: 'SpaceGrotesk_500Medium',
  bodySemiBold: 'SpaceGrotesk_600SemiBold',
  bodyBold: 'SpaceGrotesk_700Bold',
  // Compatibilité avec l'ancien thème
  regular: 'SpaceGrotesk_400Regular',
  bold: 'SpaceGrotesk_700Bold',
};

// Les ombres floues de l'ancien thème sont remplacées par des ombres dures
// (voir PopCard) ; on garde les clés pour les écrans qui les étalent encore.
export const SHADOWS = {
  card: {},
  neon: {},
};
