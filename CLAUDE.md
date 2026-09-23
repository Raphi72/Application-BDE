# NØVYX — app du BDE aivancity

Application mobile du BDE aivancity : événements, sondages, actualités, clubs, profil.
Code et commentaires en français ; l'utilisateur échange en français.

## Stack

- React Native + **Expo SDK 57** (RN 0.86.3, React 19.2.3, New Architecture uniquement), JavaScript (pas de TypeScript).
- Backend Supabase ; clés dans `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, non versionné).
- Cible principale : Android (Play Store). Le web (`expo start --web`) sert seulement à tester.
- Dépôt GitHub **public** `Raphi72/Application-BDE`, branche `master`.
- Identité système dans `app.json` : `name` = `NØVYX`. Ne pas changer `slug` (`bde-app`) ni `package` / `bundleIdentifier` (`com.bde.app`) : cela casserait EAS et la fiche Play Store.

## Commandes

- Lancer : `npx expo start --go` (`expo-dev-client` est installé, donc sans `--go` Expo cible un development build).
- Après tout ajout ou suppression de dépendance : relancer avec `-c`. Un `npm install` / `uninstall` fait planter les Metro en cours d'exécution.
- Ajouter une dépendance : `npx expo install <paquet>` (versions alignées sur le SDK).
- Si le téléphone charge à l'infini : le terminal Metro attend une réponse à « Log in / Proceed anonymously ». Répondre, ou lancer avec `--offline`.
- Pas de tests automatisés ni de lint. Vérification rapide de syntaxe :
  `node -e "require('@babel/core').transformFileSync('<fichier>',{presets:['babel-preset-expo'],babelrc:false,configFile:false})"`

## Expo Go et SDK

- Le projet est en **SDK 57**. Expo Go du Play Store ne supporte que le **dernier SDK** : à chaque nouveau SDK, il faut migrer (voir la doc « Upgrade Expo SDK »), sinon Expo Go affiche « Project is incompatible ».
- Procédure de migration suivie pour 54 → 57 : `npx expo install expo@^57.0.9`, `npx expo install --fix`, `npx expo-doctor`, puis lecture des notes de version de chaque SDK intermédiaire. Consigne du skill officiel `expo-upgrade` : depuis le SDK 55 ou avant, **sauter le 56** (régression mémoire Hermes V1), avec `expo@57.0.9` minimum.
- Expo Go 57 affiche un bouton flottant « Tools » en haut à droite, par-dessus le bouton profil. Il n'existe que dans Expo Go ; on le masque dans le menu dev (option « Tools button »).
- Le splash est configuré via le plugin `expo-splash-screen` : la clé `splash` à la racine d'`app.json` n'est plus acceptée depuis le SDK 55.
- Expo Go met en cache l'icône du projet (même URL) : après un changement d'icône, vider ses données (`adb shell pm clear host.exp.exponent` sur l'émulateur) pour voir la nouvelle. Le splash `expo-splash-screen` ne s'affiche que dans les vraies builds, pas dans Expo Go.

## Architecture

- `src/navigation/AppNavigator.js` : pile racine native-stack (`MainTabs` + `Profile`).
  - `MainTabs` utilise un **navigateur maison** `CategoryPager` (`useNavigationBuilder` + `TabRouter`). Il rend Events / Polls / News / Clubs côte à côte dans une rangée `Animated` translatée ; chaque catégorie a sa propre native-stack.
  - Admin : pile séparée, affichée via l'état `adminActive`, non swipeable.
  - Barre d'onglets maison : `CustomBottomTabBar`.
- **Swipe entre catégories** : `Gesture.Pan()` de react-native-gesture-handler (`activeOffsetX ±10`, `failOffsetY ±20`, `runOnJS`). **Ne pas revenir à PanResponder** : sur Android, la décision prise en JS arrive trop tard, et la FlatList native vole le geste dès environ 20° de biais (cause historique du bug, détaillée dans `passation.md`). Le `GestureHandlerRootView` d'`App.js` est requis.
- Ouverture du Profil depuis les headers : `ProfileNavContext` / `useOpenProfile` (`src/navigation/ProfileNav.js`).
- `expo-notifications` est chargé par un `require` différé, hors Expo Go : son simple import y affiche une erreur.
- i18n : `src/translations/fr.js` **et** `en.js`, `t('section.cle', { param })` avec `{{param}}` dans les chaînes. Pluriels via `src/utils/plural.js`.
- Dates : `dateParts()` et `formatTime()` dans `src/utils/dateUtils.js`.

## Design system NØVYX

- **Référence complète : `branding.md`**. À mettre à jour si un token ou un composant change.
- Tokens : `src/constants/theme.js` (`PALETTE`, `COLORS`, `SECTION_COLORS`, `FONTS`, `STROKE`, `HARD_SHADOW`, `accentFor`).
- Visuels système (icône, icône adaptative et monochrome, splash, favicon, icône de notification, icône Play Store 512) : générés par `python scripts/generate_brand_assets.py`. Ne pas retoucher les PNG à la main.
- Kit UI : `src/components/ui/`, qui contient `AppText`, `Pop` (`PopCard` / `PopPressable` / `PopButton` / `RoundButton`), `Deco` (`Wordmark`, `Sticker`, `Burst`, `Zigzag`, `Segmented`, `SectionTitle`, `EmptyState`), `Headers` (`ScreenHeader`, `DetailHeader`, `stackScreenOptions`) et `Auth`.
- Règles à respecter :
  - importer `Text` / `TextInput` depuis `components/ui/AppText`, jamais depuis `react-native` ;
  - les couleurs vives servent de **fonds**, avec du texte encre ; pour du texte coloré sur le papier, utiliser `COLORS.primaryText` / `secondaryText` ;
  - pas d'ombres floues (utiliser `PopCard`), pas d'opacité pour désactiver un bouton ;
  - écran racine : `headerShown: false` + `ScreenHeader` ; pile de rubrique : `stackScreenOptions(couleur)`.

## Vérifier sur Android (émulateur)

- AVD `Medium_Phone_API_36.1` (SDK Android dans `%LOCALAPPDATA%\Android\Sdk`). APK Expo Go 57 déjà téléchargé : `%TEMP%\Expo-Go-57.0.9.apk` (URLs des APK par SDK : https://api.expo.dev/v2/versions/latest, champ `androidClientUrl`). Le réinstaller si l'émulateur a été coupé brutalement. Si le démarrage bloque sur « Loading snapshot », relancer à froid avec `-no-snapshot`.
- L'utilisateur garde souvent son propre Metro sur le port 8081 : ne pas y toucher et lancer un Metro de test à part, avec `npx expo start --go --offline --port 8082`, puis `adb reverse tcp:8082 tcp:8082` et l'intent `exp://127.0.0.1:8082` avec `-p host.exp.exponent`.
- Aucun identifiant n'est disponible. Pour voir l'app connectée, ajouter temporairement dans `AppNavigator` une fausse `session` : un objet **constant**, sinon on obtient une boucle de rendu. La retirer avant tout commit. Les écrans admin et les états connectés ne sont pas vérifiables de cette façon.
- Tester les gestes avec `adb shell input swipe` ; un swipe en biais simule un vrai pouce.

## Historique récent (septembre 2026, tout est sur master et poussé)

- `f9f0dfa` : swipe entre catégories (navigateur maison + geste RNGH).
- `e2772c0` : `expo-notifications` en import différé hors Expo Go.
- `0ddf3db` : refonte complète du design (NØVYX, style « pop varsity »).
- `58d68ed` : `branding.md` + renommage de l'app en NØVYX (`app.json`, pages légales, fiche Play Store).
- `9ea3fac` : ce fichier.
- Migration Expo SDK 54 → 57 (RN 0.86) : dépendances alignées, `react-native-calendars` 1.1314 (supprime le doublon `safe-area-context`), splash via plugin, `@react-navigation/bottom-tabs` retiré (inutilisé). Vérifiée sur émulateur avec Expo Go 57.

## Points ouverts

- `@expo/vector-icons` est déprécié depuis le SDK 56 (au profit des paquets `@react-native-vector-icons/*`) : il fonctionne encore, migration à prévoir.
- React Navigation reste en v6 : fonctionne en SDK 57, mais la v7 est la version maintenue.
- Captures et bannière (`play-store/feature-graphic.png`) de la fiche Play Store à refaire : elles montrent l'ancien design.
- `play-store/FICHE_PLAY_STORE.md` contient les identifiants du compte testeur (administrateur) dans un dépôt public : mot de passe à changer, identifiants à sortir du dépôt.
- `GalleryScreen` est importé mais jamais routé (code mort).
- Web uniquement : un drag souris qui commence et finit sur une carte l'ouvre au relâchement (react-native-web déclenche `onPress` sur `click`). Problème préexistant, le mobile n'est pas concerné.
