/**
 * Thème "Futuriste Clean" pour l'application BDE
 */
export const COLORS = {
    // Fond général (Very dark blue/black)
    background: '#0E0E13',

    // Surfaces (Cartes, headers, tabbar)
    surface: '#1A1A24',
    surfaceLight: '#2A2A35', // Pour les bordures ou états hover

    // Textes
    text: '#FFFFFF',
    textSecondary: '#A0A0B0', // Gris bleuté pour les sous-titres

    // Accents
    primary: '#7C5CFF', // Violet futuriste
    secondary: '#00FFD1', // Turquoise néon

    // Fonctionnels
    success: '#4CAF50',
    error: '#FF453A',
    warning: '#FFD60A',

    // Éléments
    border: '#2A2A35',
    inputBackground: '#13131A',
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
};

export const FONTS = {
    regular: 'System', // On garde la font système pour l'instant
    bold: 'System',
};

export const SHADOWS = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    neon: {
        shadowColor: '#7C5CFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    }
};
