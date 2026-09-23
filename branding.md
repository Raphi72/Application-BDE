# NØVYX — Guide de marque & design system

Référence complète de l'identité visuelle de l'application **NØVYX**, l'app du BDE aivancity.
Toutes les valeurs ci-dessous sont celles du code : si tu modifies un token, mets ce document à jour.

- Tokens : [`src/constants/theme.js`](src/constants/theme.js)
- Composants de base : [`src/components/ui/`](src/components/ui/)
- Composants métier : [`src/components/`](src/components/)

---

## Sommaire

1. [Identité](#1-identité)
2. [Vibe & direction artistique](#2-vibe--direction-artistique)
3. [Couleurs](#3-couleurs)
4. [Typographie](#4-typographie)
5. [Formes & matière](#5-formes--matière)
6. [Iconographie & emojis](#6-iconographie--emojis)
7. [Mouvement](#7-mouvement)
8. [Mise en page](#8-mise-en-page)
9. [Composants](#9-composants)
10. [Écrans](#10-écrans)
11. [Ton & rédaction](#11-ton--rédaction)
12. [Accessibilité](#12-accessibilité)
13. [À faire / à éviter](#13-à-faire--à-éviter)
14. [Recette : créer un nouvel écran](#14-recette--créer-un-nouvel-écran)
15. [Ressources techniques](#15-ressources-techniques)

---

## 1. Identité

### Nom

| Élément | Règle |
|---|---|
| Nom de l'app | **NØVYX** |
| Le « Ø » | Lettre O barrée, Unicode `U+00D8`. Windows : `Alt` + `0216` · macOS : `Option` + `Shift` + `O` |
| Casse | Toujours en capitales : `NØVYX`. Jamais « Novyx », « NOVYX » ou « N0VYX » (zéro) |
| Association | « BDE aivancity » dans le texte courant, « BDE AIVANCITY » dans les pastilles |
| Nom système | `app.json` → `"name": "NØVYX"` (nom affiché sous l'icône) |

### Logotype

Le logotype est **typographique** : le mot `NØVYX` composé en **Dela Gothic One**, couleur encre (`#17120E`), ou papier (`#FFF4E6`) sur fond encre. Composant : `Wordmark` (voir §9).

| Contexte | Taille |
|---|---|
| Écran de connexion (logotype géant) | 60 px (44 px en version compacte) |
| Écrans d'inscription et de réinitialisation (au-dessus du titre) | 22 px |
| Carte de membre (Profil) | 20 px, couleur papier |
| Header de rubrique (en haut à gauche) | 15 px |
| Pied du Profil | 14 px |

Le logotype est presque toujours accompagné de la pastille **BDE AIVANCITY** en pervenche (`#8A7DFF`), inclinée à −4°. Ce pervenche fait écho au texte « BDE AIVANCITY » de l'écusson du BDE.

### Écusson du BDE

L'écusson au robot doré est le logo **de l'association**, pas celui de l'app. Il n'est pas utilisé comme icône d'application. Il a inspiré deux choses : le pervenche de la pastille « BDE AIVANCITY », et l'univers varsity (écusson, blason, esprit « équipe »).

### Accroche

| FR | EN |
|---|---|
| Ta vie étudiante, en plus fort. | Student life, turned up. |

---

## 2. Vibe & direction artistique

**Pop varsity** = l'esprit **varsity** (maillots, écussons de club, chiffres de dossard, bandes de couleur, badges) × l'énergie **pop / néo-brutaliste** (aplats de couleurs franches, gros contours noirs, ombres dures, stickers collés de travers).

Mots-clés : *festif · affiche de soirée · billet de concert · fanzine · écusson brodé · carte de membre · sticker*.

| C'est… | Ce n'est pas… |
|---|---|
| Clair, chaud, papier crème | Sombre et violet « tech » générique |
| Des couleurs vives en **aplats** | Des dégradés, du verre dépoli, du néon flou |
| Des contours encre épais et des ombres **dures** | Des ombres floues (elevation Android) |
| Des objets réels : billet, écusson, carte de membre | Des cartes rectangulaires toutes identiques |
| Des stickers légèrement de travers | Du texte ou des cartes entières penchés |
| Du texte court, en « tu », qui donne envie | Du jargon administratif |

Chaque rubrique a **sa couleur**. Quand on swipe entre rubriques, le header, l'onglet actif et l'ombre de la barre du bas changent de couleur : on sait toujours où on est.

---

## 3. Couleurs

### Palette (`PALETTE`)

| Token | Hex | Rôle |
|---|---|---|
| `paper` | `#FFF4E6` | Fond de toute l'app (crème) |
| `paperDeep` | `#F6E2C6` | Fond secondaire, barres de résultats non gagnantes, boutons désactivés |
| `white` | `#FFFDF9` | Surface des cartes, champs, boutons ronds |
| `ink` | `#17120E` | Texte, contours, ombres dures, icônes, barre d'onglets |
| `inkSoft` | `#62564B` | Texte secondaire, étiquettes, placeholders |
| `tangerine` | `#FF5A1F` | Couleur **Événements** · action principale (boutons) |
| `periwinkle` | `#8A7DFF` | Couleur **Sondages** · pastille « BDE AIVANCITY » |
| `sun` | `#FFC53D` | Couleur **Actualités** · surlignage, sélection, « Prochain » |
| `lime` | `#C3F04A` | Couleur **Clubs** · statuts positifs (« Inscrit », « En cours », « Ton vote ») |
| `bubblegum` | `#FF85C8` | Couleur **Profil / Admin** · étoiles de compte à rebours |
| `mint` | `#43D9AD` | Accent secondaire (icônes lieu / email / propositions) |
| `cherry` | `#E8322C` | Statut « Complet », boutons de suppression |

### Couleurs sémantiques (`COLORS`)

| Token | Valeur | Usage |
|---|---|---|
| `background` | `paper` | Fond des écrans |
| `surface` | `white` | Fond des cartes et modales |
| `surfaceLight` | `#EBDCC6` | Séparateurs fins, souche des billets passés |
| `text` | `ink` | Texte principal |
| `textSecondary` | `inkSoft` | Texte secondaire |
| `primary` | `tangerine` | **Fond** d'action principale |
| `primaryText` | `#B83A0B` | Orange lisible **en texte** sur papier |
| `secondary` | `periwinkle` | **Fond** secondaire |
| `secondaryText` | `#5A4FCF` | Pervenche lisible **en texte** sur papier |
| `onPrimary` | `ink` | Texte ou icône posé sur un fond coloré |
| `success` | `#0E7A41` | Texte de succès sur papier |
| `error` | `#C8201B` | Texte d'erreur sur papier, lien « Supprimer mon compte » |
| `warning` | `#8A5300` | Texte d'avertissement sur papier |
| `border` | `ink` | Contours |
| `inputBackground` | `white` | Fond des champs |

### Couleur par rubrique (`SECTION_COLORS`)

| Rubrique | Couleur | Où elle apparaît |
|---|---|---|
| Événements | `tangerine` | Header, onglet actif, bouton « Je m'inscris », jour sélectionné du calendrier |
| Sondages | `periwinkle` | Header, bandeau des cartes sondage, barre gagnante, bouton « Valider mon vote » |
| Actualités | `sun` | Header, carte « à la une », pastilles de catégorie |
| Clubs | `lime` | Header, pastilles de catégorie, bloc charte, puces sélectionnées |
| Profil / Admin | `bubblegum` | Header, ombre de la carte de membre, bandeau des modales |

### Rotation d'accents (`ACCENT_CYCLE` + `accentFor(id)`)

Pour les éléments **sans visuel** (événement sans photo, écusson de club), la couleur est tirée de façon **stable** à partir de l'identifiant : un même élément garde toujours la même couleur.

Ordre du cycle : `tangerine → periwinkle → sun → lime → bubblegum → mint`.

### Règle d'or du contraste

> Les couleurs vives sont des **fonds**, avec du **texte encre** dessus. Jamais de texte en couleur vive sur le papier : pour du texte coloré, utiliser les variantes `*Text`.

| Combinaison | Ratio | Verdict |
|---|---|---|
| Encre sur `tangerine` | 5.96:1 | ✅ |
| Encre sur `periwinkle` | 5.72:1 | ✅ |
| Encre sur `sun` | 11.78:1 | ✅ |
| Encre sur `lime` | 14.06:1 | ✅ |
| Encre sur `bubblegum` | 8.36:1 | ✅ |
| Encre sur `mint` | 10.42:1 | ✅ |
| Encre sur `cherry` | 4.36:1 | ⚠️ gros texte uniquement (boutons) |
| Papier sur encre | 17.12:1 | ✅ |
| `inkSoft` sur papier | 6.55:1 | ✅ |
| `primaryText` sur papier | 5.30:1 | ✅ |
| `secondaryText` sur papier | 5.60:1 | ✅ |
| `success` / `error` / `warning` sur papier | 4.98 / 5.26 / 5.83:1 | ✅ |
| `tangerine` en texte sur papier | 2.87:1 | ❌ interdit |
| `sun` / `lime` en texte sur papier | 1.45 / 1.22:1 | ❌ interdit |

### Couleurs ponctuelles (hors tokens)

| Hex | Usage |
|---|---|
| `#FFF3CF` | Fond d'un champ de saisie **focus** (écrans d'accès) |
| `#FFE3DD` | Boîte d'erreur, boîte d'avertissement de suppression de compte |
| `#FFC9BF` | Dernier avertissement avant suppression du compte |
| `#C9BBA7` | Jours hors mois dans le calendrier |

Pas de mode sombre : l'app est entièrement claire (`userInterfaceStyle: "light"`, barre d'état en texte sombre).

---

## 4. Typographie

### Familles

| Rôle | Police | Paquet | Graisses chargées | Token |
|---|---|---|---|---|
| **Display** : titres, noms, logotype | Dela Gothic One | `@expo-google-fonts/dela-gothic-one` | 400 | `FONTS.display` |
| **Varsity** : chiffres, étiquettes, boutons, pastilles | Big Shoulders Display | `@expo-google-fonts/big-shoulders-display` | 800, 900 | `FONTS.varsityBold`, `FONTS.varsity` |
| **Texte courant** | Space Grotesk | `@expo-google-fonts/space-grotesk` | 400, 500, 600, 700 | `FONTS.body`, `bodyMedium`, `bodySemiBold`, `bodyBold` |

- **Dela Gothic One** : très grasse, large, aux coupes nettes, festive. Toujours en casse normale ou en capitales, jamais en italique. Réservée aux titres (≥ 15 px).
- **Big Shoulders Display** : condensée « dossard de maillot ». Toujours en **CAPITALES** (`textTransform: 'uppercase'`, jamais dans les chaînes de traduction), avec un léger espacement (0.5 à 1).
- **Space Grotesk** : sans-serif géométrique au caractère un peu décalé, pour tout le texte de lecture.

Les polices sont chargées dans [`App.js`](App.js) (`useFonts`). Pendant le chargement, l'app affiche un simple fond papier : l'app n'apparaît jamais avec la police système.

### Graisse automatique

Le composant `Text` de l'app ([`AppText.js`](src/components/ui/AppText.js)) remplace celui de React Native. Sans `fontFamily` explicite, il choisit la famille Space Grotesk à partir de `fontWeight` :

| `fontWeight` | Famille |
|---|---|
| `normal`, 100 à 400 | `SpaceGrotesk_400Regular` |
| 500 | `SpaceGrotesk_500Medium` |
| 600 | `SpaceGrotesk_600SemiBold` |
| `bold`, 700 à 900 | `SpaceGrotesk_700Bold` |

⚠️ Toujours importer `Text` / `TextInput` depuis `components/ui/AppText`, jamais depuis `react-native`. Pour un `Text` imbriqué dans un texte display ou varsity, repréciser `fontFamily` : sans cela, il repasse en Space Grotesk.

### Échelle typographique

| Usage | Police | Taille / interligne | Casse & espacement |
|---|---|---|---|
| Logotype connexion | Display | 60 | — |
| Titre de rubrique (header) | Display | 36 / 44 | Capitales (texte traduit passé en `toUpperCase()`) |
| Titre d'écran d'accès | Display | 30 / 38 | — |
| Titre de détail (événement, club) | Display | 28 / 36 | — |
| Titre de détail (actu) | Display | 26 / 34 | — |
| Titre « à la une » / carte featured | Display | 24 / 32 · 21 / 28 | — |
| Titre de carte (actu, club) | Display | 19 / 25-26 | — |
| Question de sondage | Display | 18 / 25 | — |
| Titre de billet | Display | 17 / 23 | — |
| Titre de header de détail | Varsity 900 | 26 / 30 | CAPITALES · 0.6 |
| Titre de section (« À VENIR », « RÉGLAGES ») | Varsity 900 | 28 / 32 | CAPITALES · 0.5 |
| Chiffre héros (jour du billet, stats) | Varsity 900 | 48-50 | — |
| Heure, pourcentage, compteur | Varsity 900 | 17-34 | — |
| Libellé de bouton | Varsity 900 | 22 / 26 (compact 18 / 21) | CAPITALES · 0.8 |
| Pastille (sticker) | Varsity 900 | 16 (petite 13) | CAPITALES · 0.6 |
| Étiquette de carte (« LIEU », « PARTICIPANTS ») | Varsity 800 | 15 | CAPITALES · 0.8, `inkSoft` |
| Libellé d'onglet | Varsity 900 | 13 / 15 | CAPITALES · 0.5 |
| Texte de lecture (description, article) | Space Grotesk 400 | 16 / 25 · 17 / 27 | — |
| Texte de carte, chapeau | Space Grotesk 400 | 14-15 / 20-22 | — |
| Méta (heure, lieu dans un billet) | Space Grotesk 500 | 14 | — |
| Valeur forte (nom de lieu, email) | Space Grotesk 700 | 15-16 | — |

Réglage Android : `includeFontPadding: false` sur les textes Varsity et les chiffres, pour un centrage vertical exact.

---

## 5. Formes & matière

### Contours

| Token | Valeur | Usage |
|---|---|---|
| `STROKE` | **2.5** | Contour des cartes, boutons, headers, barres de progression |
| — | 2 | Petits éléments : pastilles, carrés d'icône, puces, cases à cocher |
| — | 1.5 | Couture en pointillés des écussons de club |

Couleur des contours : toujours `ink`.

### Ombre dure (`HARD_SHADOW`)

Une vraie vue encre posée **derrière** l'élément, décalée. Pas de flou, identique sur Android, iOS et web.

| Élément | Décalage (x, y) | Couleur de l'ombre |
|---|---|---|
| Cartes, boutons (`HARD_SHADOW`) | 4, 5 | `ink` |
| Options de sondage | 3, 3 | `ink` |
| Boutons ronds | 2, 3 | `ink` |
| Bouton variante `dark` | 4, 5 | `tangerine` |
| Barre d'onglets | 4, 5 | couleur de la rubrique active |
| Carte de membre | 4, 5 | `bubblegum` |

### Arrondis (`RADIUS`)

| Valeur | Usage |
|---|---|
| 999 (pilule) | Pastilles, sélecteur segmenté, sélecteur de langue, puces |
| 10 (`RADIUS.s`) | Jours du calendrier, petits éléments |
| 12-14 | Carrés d'icône, champs du formulaire club, options de sondage, bouton compact |
| 16 | Boutons, champs des écrans d'accès |
| 18 (`RADIUS.m`) | Carte par défaut |
| 20-22 | Billets, cartes sondage / actu / club |
| 24 (`RADIUS.l`) | Carte de membre |
| 26 | Barre d'onglets |

### Motifs signature

| Motif | Description | Où |
|---|---|---|
| **Dents de scie** | Bord inférieur des headers : profondeur 10, période 18, trait encre 2.5 | Tous les headers, charte |
| **Perforation de billet** | Ligne de 16 tirets (9 × 2.5) entre deux encoches demi-rondes de 26 px (fond papier, contour encre) | Billets d'événement |
| **Souche** | Colonne de 78 px (84 en détail) à la couleur de l'événement : jour, mois et jour de semaine en Varsity | Billets, détail d'événement |
| **Écusson brodé** | Rond coloré, contour 2.5, couture intérieure en pointillés, initiales en Display, penché de −6° | Clubs |
| **Bandes varsity** | 3 bandes de 12 px (tangerine, sun, periwinkle), espacées de 8, inclinées à 24° | Carte de membre |
| **Filigrane affiche** | « NØVYX » répété en Display 38, opacité 13 %, incliné de −10°, sous un gros emoji | Visuel de repli des événements et des actus |
| **Explosion (étoile)** | Étoile à 12 branches (rayon intérieur 78 %), contour encre, texte Varsity au centre | Compte à rebours (J-12, AUJ., DEMAIN), décor de la connexion |
| **Formes de décor** | Grands ronds et pilules colorés qui débordent des coins de l'écran | Écrans d'accès |

### Inclinaisons

Seuls les **stickers** et les **objets** penchent, jamais les blocs de texte ni les cartes.

| Élément | Angle |
|---|---|
| Pastilles | −4° à +6° (par défaut −3°) |
| Étoile de compte à rebours | −12° |
| Écusson de club | −6° (liste), −8° (détail) |
| Pastille d'état vide | −8° · badge 🚀 : −10° |
| Numéros de la charte | −4° |
| Filigrane affiche | −10° · emoji d'affiche : −8° |
| Pilule de décor (connexion) | −18° |

---

## 6. Iconographie & emojis

### Icônes

- Bibliothèque : **Ionicons** (`@expo/vector-icons`).
- Couleur : **encre**, toujours. Pas d'icônes colorées posées sur le papier.
- Style : **pleines** dans le contenu (`time`, `location`, `people`, `star`, `calendar`) ; **pleine si actif / contour (`-outline`) si inactif** dans la barre d'onglets.
- **Carré d'icône** : 42 à 46 px, rayon 12 à 14, contour 2 encre, fond d'une couleur d'accent, icône encre de 20 à 24 px. Utilisé dans les lignes de réglages, le menu admin et les cartes lieu / contact.

| Onglet | Icône |
|---|---|
| Événements | `calendar` |
| Sondages | `stats-chart` |
| Actualités | `newspaper` |
| Clubs | `people` |
| Admin | `settings` |

### Emojis

Ils font partie de l'identité : utilisés en **gros** dans des pastilles rondes, jamais en décoration du texte courant.

**Emoji d'affiche** d'un événement sans photo (`posterEmoji`), déduit du titre :

| Mots-clés dans le titre | Emoji |
|---|---|
| soirée, party, fête, gala, bal, night | 🎉 |
| afterwork, bar, apéro, bière, pub | 🍻 |
| sport, foot, match, basket, tournoi, run, rugby, volley | ⚽ |
| jeu, game, gaming, tournament, lan | 🎮 |
| conf, talk, atelier, workshop, meetup, hackathon | 🎤 |
| pool, piscine, plage, beach | 🏖️ |
| ski, voyage, trip, week-end | ✈️ |
| (autre) | 🎟️ |

**États vides** : 🎟️ Événements · 🗓️ Calendrier vide · 🗳️ Sondages · 📰 Actualités · 🏆 Clubs · 🚀 « Ton club ici ? ».

---

## 7. Mouvement

| Interaction | Animation |
|---|---|
| Appui sur une carte ou un bouton pop | La face glisse **sur son ombre** (translation du décalage de l'ombre) : ressort `speed 40`, `bounciness 0`, driver natif. Retour identique au relâchement |
| Swipe entre rubriques | Le contenu suit le doigt, puis se cale : ressort `speed 14`, `bounciness 0`. Déclenché par 60 px de distance ou 800 px/s de vitesse |
| Message d'erreur (écrans d'accès) | Fondu d'apparition de 180 ms (`FadeIn`) |

Pas d'autre animation : le style est déjà très expressif, le mouvement reste sec et tactile.

---

## 8. Mise en page

### Espacements (`SPACING`)

`xs 4 · s 8 · m 16 · l 24 · xl 32`

| Règle | Valeur |
|---|---|
| Marge latérale des écrans | 16 |
| Espace entre header et liste | 12 |
| Espace sous un billet / sondage | 22 |
| Espace sous une carte actu / club | 20 |
| Espace sous une ligne de réglage | 12 |
| Marge sous un titre de section | 12 |
| Padding interne des cartes | 14 (carte de membre : 18) |

### Anatomie d'un écran de rubrique

```
┌─────────────────────────────┐  ← bandeau couleur de la rubrique (insets.top + 10)
│ NØVYX                  (U)  │  ← logotype 15 px · bouton profil rond 42 px (initiale)
│ ÉVÉNEMENTS                  │  ← titre Display 36/44
│ 1 à venir                   │  ← sous-titre Space Grotesk 600, 15 px
│ [ LISTE | CALENDRIER ]      │  ← contenu optionnel (sélecteur segmenté)
└\/\/\/\/\/\/\/\/\/\/\/\/\/\/\┘  ← dents de scie
  À VENIR (1)                     ← titre de section + pastille compteur
  ┌─ carte ─────────────────┐
  └─────────────────────────┘▌   ← ombre dure
 ┌───────────────────────────┐
 │ ▣  ▥  ▤  ▦              │▌   ← barre d'onglets flottante encre
 └───────────────────────────┘
```

Tous les headers de rubrique ont **la même hauteur**, pour que le swipe ne fasse pas sauter l'écran.

### Anatomie d'un écran de détail

- **Header de détail** : bouton retour rond de 40 px, puis titre de rubrique au singulier en Varsity 26 (« ÉVÉNEMENT », « CLUB »…), sur le bandeau de la rubrique avec les dents de scie.
- **Visuel héros** en pleine largeur (260 px), bordé en bas d'un trait de 2.5.
- **Titre Display**, puis des **cartes d'info** empilées.
- **Barre d'action fixée en bas** : fond papier, trait supérieur de 2.5, `PopButton` pleine largeur.

---

## 9. Composants

### Fondations — [`components/ui/AppText.js`](src/components/ui/AppText.js)

| Composant | Rôle |
|---|---|
| `Text` (export par défaut) | Remplace `Text` de React Native et applique automatiquement Space Grotesk selon `fontWeight` |
| `TextInput` | Idem pour les champs de saisie |

### Pop — [`components/ui/Pop.js`](src/components/ui/Pop.js)

| Composant | Rôle | Props principales |
|---|---|---|
| `PopCard` | Carte statique : contour encre 2.5 + ombre dure | `color` (fond, `white` par défaut), `shadowColor` (`ink`), `offset` (`{4,5}`), `radius` (18), `style` (face), `containerStyle` (marges) |
| `PopPressable` | Carte pressable, qui s'enfonce sur son ombre | idem + `onPress`, `onLongPress`, `disabled`, `dimWhenDisabled` |
| `PopButton` | Bouton principal (hauteur 56, compact 44) | `title`, `icon`, `variant`, `loading`, `disabled`, `compact` |
| `RoundButton` | Bouton rond (retour, profil, fermer) | `icon`, `size` (42), `color` (`white`), `children` |

L'ombre prend sa place grâce au padding du conteneur : les marges passées dans `containerStyle` restent libres.

**Variantes de `PopButton`** :

| Variante | Fond | Texte | Usage |
|---|---|---|---|
| `primary` | tangerine | encre | Action principale (Se connecter, Je m'inscris, Proposer un club) |
| `light` | white | encre | Action secondaire (Se désinscrire, Déconnexion, Lire la charte) |
| `periwinkle` | periwinkle | encre | Valider mon vote |
| `dark` | encre | papier (ombre tangerine) | Action forte sur fond clair |
| `success` / `sun` / `danger` | lime / sun / cherry | encre | Actions contextuelles |
| désactivé | `paperDeep` | `inkSoft` | Jamais d'opacité : elle salirait la couleur avec l'ombre |

### Déco — [`components/ui/Deco.js`](src/components/ui/Deco.js)

| Composant | Rôle | Détails |
|---|---|---|
| `Wordmark` | Logotype « NØVYX » | `size`, `color` |
| `Sticker` | Pastille autocollante | pilule, contour 2, Varsity 16 (13 si `small`), `color`, `textColor`, `rotate` (−3°), `icon` |
| `Burst` | Étoile « explosion » avec texte | 12 branches, `size` (76), `color` (bubblegum), `rotate` (−12°), `label`, `sublabel` |
| `Zigzag` | Bord en dents de scie (SVG) | `color`, `width`, `depth` (10), `period` (18) |
| `Segmented` | Sélecteur à options | pilule blanche contour 2.5 ; option active : fond encre, texte papier ; `icon` optionnel |
| `SectionTitle` | Titre de section de liste | Varsity 28 en capitales + pastille compteur optionnelle (`count`, `color`) |
| `EmptyState` | État vide | pastille ronde de 112 px, colorée, penchée de −8°, emoji 52 px ; titre Display 22 ; message 15 `inkSoft` |

### Headers — [`components/ui/Headers.js`](src/components/ui/Headers.js)

| Composant | Rôle |
|---|---|
| `ScreenHeader` | Header de rubrique : `title`, `subtitle`, `color`, `right`, `children` |
| `DetailHeader` | Header d'écran de détail (bouton retour et titre Varsity) |
| `stackScreenOptions(color)` | Options de native-stack : `DetailHeader` à la couleur de la rubrique et fond papier. Les écrans racines mettent `headerShown: false` et rendent `ScreenHeader` |
| `ProfileButton` | Bouton rond avec l'initiale de l'utilisateur, qui ouvre le Profil |

### Accès — [`components/ui/Auth.js`](src/components/ui/Auth.js)

| Composant | Rôle |
|---|---|
| `AuthBackdrop` | Décor : rond tangerine de 220 px (haut gauche), rond periwinkle de 180 px (bas droite), pilule lime de 150 × 54 à −18° (bas gauche), étoile sun de 120 px (haut droite) |
| `AuthBrand` | Logotype géant **ou** petit logotype + titre, pastille BDE AIVANCITY, sous-titre |
| `authStyles` | Champs : fond blanc, hauteur 58, rayon 16, contour 2.5. Focus : fond `#FFF3CF`, contour 3. Erreur : boîte `#FFE3DD`. Lien : Space Grotesk 700, souligné, encre |

### Composants métier

| Composant | Fichier | Description |
|---|---|---|
| `EventCard` | [`EventCard.js`](src/components/EventCard.js) | **Billet** : visuel de 140 px (190 si `featured`), perforation, souche date de 78 px, titre Display, heure et lieu, jauge de participants (hauteur 12). Stickers : PROCHAIN (sun), INSCRIT (lime), COMPLET (cherry), étoile J-x (bubblegum), PASSÉ (encre). Billet passé : opacité 60 %, souche `surfaceLight` |
| `PosterFallback` | idem | Visuel de repli : aplat couleur, filigrane NØVYX, gros emoji |
| `posterEmoji`, `countdownLabel`, `firstImage` | idem | Emoji d'affiche · libellé du compte à rebours (AUJ., DEMAIN, J-x) · première image d'un champ image (URL ou tableau JSON) |
| `PollCard` | [`PollCard.js`](src/components/PollCard.js) | Bandeau pervenche (statut + échéance + question Display 18). Avant vote : options pressables avec lettre A/B/C en rond, sélection en `sun`, bouton « Valider mon vote ». Après vote ou clôture : barres de 22 px, gagnante en pervenche, pastille TON VOTE |
| `NewsCard` | [`NewsCard.js`](src/components/NewsCard.js) | Fanzine : photo si elle existe, pastille catégorie, date Varsity, titre Display, chapeau, « PAR LE BDE » + flèche ronde. La plus récente est « à la une » sur fond `sun` |
| `ClubCard`, `ClubPatch` | [`ClubCard.js`](src/components/ClubCard.js) | Écusson de 76 px + nom, catégorie, description sur 2 lignes, membres, président |
| `CustomBottomTabBar` | [`navigation/CustomBottomTabBar.js`](src/navigation/CustomBottomTabBar.js) | Pilule encre flottante (rayon 26), ombre à la couleur de la rubrique active. Onglet actif : pastille de 48 × 32 colorée, icône pleine encre, libellé coloré. Inactif : icône contour papier à 60 % |
| `LanguageSwitcher` | [`LanguageSwitcher.js`](src/components/LanguageSwitcher.js) | Pilule blanche contour 2.5, option active fond encre. `floating` : en haut à droite, sous la barre d'état |

---

## 10. Écrans

| Écran | Principes |
|---|---|
| **Connexion** | Décor pop, logotype de 60 px, pastille BDE AIVANCITY, accroche, champs pop, « Se connecter » (primary), liens soulignés |
| **Inscription / Réinitialisation** | Même décor, petit logotype + titre Display 30 |
| **Mot de passe oublié** (modale) | Bandeau `sun` avec contour, titre Display 20 |
| **Événements — liste** | Sections « À VENIR » (le prochain en `featured`) puis « PASSÉS » (le plus récent en premier) |
| **Événements — calendrier** | Calendrier dans une `PopCard` : mois en Display, flèches rondes `sun`, jours avec événement en `sun` encadré, jour sélectionné en `tangerine`, aujourd'hui en `primaryText`. Dessous : prochains événements, ou ceux du jour choisi |
| **Détail d'événement** | Visuel héros avec étoile de compte à rebours, carte « quand » (souche + date longue + heure), carte lieu qui ouvre Google Maps, carte participants, description, barre d'action fixe (Je m'inscris / Se désinscrire / Complet / Événement terminé) |
| **Sondages** | Vote direct dans la liste, résultats après le vote |
| **Actualités** | Fanzine, première actu à la une, détail avec héros (ou visuel de repli 📰) |
| **Clubs** | Écussons ; en fin de liste, carte `sun` « Ton club ici ? » (Proposer + Lire la charte) |
| **Détail de club** | Écusson de 96 px + nom Display 28, stats en blocs (membres en `periwinkle`, président en `bubblegum`), ligne contact, description, « Contacter le président » fixé en bas |
| **Charte** (modale) | Bandeau `lime` + dents de scie, sections en cartes numérotées 01 à 05 (carrés colorés penchés) |
| **Proposer un club** | Bloc charte `lime`, sections blanches contour 2.5, champs papier contour 2, puces de catégorie en pilule (sélection `lime`) |
| **Profil** | Carte de membre (encre, bandes varsity, avatar `bubblegum`, statut MEMBRE ou ADMINISTRATEUR), Réglages, Déconnexion (light), « Zone sensible » avec lien de suppression discret |
| **Admin** | Header `bubblegum`, menu en cartes pop avec carré d'icône à la couleur de chaque rubrique |

---

## 11. Ton & rédaction

- **Tutoiement**, phrases courtes, énergie positive.
- **Boutons** : un verbe d'action à la 1ʳᵉ personne ou à l'impératif (« Je m'inscris », « Valider mon vote », « Proposer un nouveau club »).
- **Capitales** : appliquées par le style (`textTransform`), jamais écrites en dur dans les traductions.
- **Pluriels** : via `plural(t, language, count, oneKey, manyKey)` ([`utils/plural.js`](src/utils/plural.js)). En français, 0 et 1 sont au singulier.
- **Bilingue** : toute chaîne passe par `t()` avec une clé dans [`translations/fr.js`](src/translations/fr.js) **et** [`en.js`](src/translations/en.js).
- **Dates** : `dateParts()` pour les blocs date (« DIM 10 JANV »), `formatTime()` pour les heures (« 12h50 » en FR, « 12:50 » en EN). Jamais de secondes.

| Situation | FR | EN |
|---|---|---|
| Accroche | Ta vie étudiante, en plus fort. | Student life, turned up. |
| Inscription à un event | Je m'inscris | Count me in |
| Liste d'events vide | Aucun event pour l'instant · Le BDE prépare la suite. Reviens vite ! | No events yet · The BDE is cooking something up. Check back soon! |
| Choix d'une réponse | Choisis ta réponse, puis valide | Pick your answer, then confirm |
| Appel à créer un club | Ton club ici ? | Your club here? |
| Pas d'actus | Pas encore d'actus | No news yet |

---

## 12. Accessibilité

- **Contrastes** : voir la règle d'or (§3). Tout texte doit atteindre au moins 4.5:1.
- **Zones tactiles** : 44 px minimum (boutons de 56 px, boutons ronds de 40-42 px, onglets de 54 px de haut, `hitSlop` sur les petits liens).
- **Pas d'information par la couleur seule** : chaque statut a un texte (pastilles « INSCRIT », « COMPLET », « PASSÉ », « TON VOTE »).
- **État désactivé** : aplat `paperDeep` avec texte `inkSoft`, jamais une simple opacité.
- **Lecteurs d'écran** : `accessibilityRole` et `accessibilityLabel` sur les éléments pop pressables, les onglets et le sélecteur segmenté.

---

## 13. À faire / à éviter

✅ **À faire**
- Utiliser les tokens (`PALETTE`, `COLORS`, `SECTION_COLORS`, `FONTS`, `STROKE`, `HARD_SHADOW`), jamais des valeurs en dur.
- Poser le texte encre sur les couleurs vives.
- Contourner en encre (2 à 2.5) tout bloc coloré.
- Donner une ombre dure aux cartes (`PopCard` / `PopPressable`).
- Prévoir un visuel de repli pour tout contenu qui peut ne pas avoir de photo.
- Garder une seule couleur d'accent par rubrique ; `accentFor()` sert uniquement aux éléments sans visuel.

❌ **À éviter**
- Texte en tangerine, sun, lime, bubblegum ou mint sur le papier.
- Ombres floues (`elevation`, `shadowRadius`).
- Opacité pour désactiver un bouton.
- Dégradés, transparences « verre », mode sombre.
- Pencher des cartes ou des paragraphes (seulement les stickers et les objets).
- Une 4ᵉ famille de police, ou Dela Gothic One pour du texte de lecture.
- Des blocs image vides.

---

## 14. Recette : créer un nouvel écran

1. Choisir la couleur de rubrique dans `SECTION_COLORS` (ou en ajouter une).
2. Écran racine : `headerShown: false` + `<ScreenHeader title={t('…').toUpperCase()} subtitle={…} color={COLOR} />`.
3. Pile de navigation : `screenOptions={stackScreenOptions(COLOR)}`, ce qui donne les headers de détail.
4. Liste : `contentContainerStyle={{ padding: 16, paddingTop: 12 }}`, cartes en `PopPressable` (rayon 20-22, `marginBottom` 20-22).
5. Liste vide : `<EmptyState emoji="…" title={…} message={…} color={COLOR} />`.
6. Action principale d'un détail : barre fixée en bas avec un `PopButton`.
7. Textes : importer `Text` depuis `components/ui/AppText`, ajouter les clés dans `fr.js` **et** `en.js`.

---

## 15. Ressources techniques

| Sujet | Où |
|---|---|
| Tokens | `src/constants/theme.js` |
| Chargement des polices | `App.js` (`useFonts`) |
| Kit UI | `src/components/ui/` (`AppText`, `Pop`, `Deco`, `Headers`, `Auth`) |
| Traductions | `src/translations/fr.js`, `src/translations/en.js` |
| Utilitaires | `src/utils/dateUtils.js` (`dateParts`, `formatTime`), `src/utils/plural.js` |

**Dépendances de design** (toutes incluses dans Expo Go, SDK 54) : `expo-font`, `@expo-google-fonts/dela-gothic-one`, `@expo-google-fonts/big-shoulders-display`, `@expo-google-fonts/space-grotesk`, `react-native-svg` (dents de scie, étoiles), `@expo/vector-icons` (Ionicons).

**Identité système** (`app.json`) : `name` = `NØVYX` ; `slug` (`bde-app`) et identifiant Android / iOS (`com.bde.app`) inchangés, pour ne pas casser EAS ni la fiche Play Store.

**Chantier restant** : l'icône d'application et le splash screen (`assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`) sont encore les anciens visuels ; ils sont à redessiner dans ce style.
