# 🔍 Guide de Débogage - Écran Blanc

Si vous voyez un écran blanc avec juste "BDE App", voici comment diagnostiquer :

## 1. Vérifier les erreurs dans le terminal

Regardez le terminal où vous avez lancé `npm start`. Vous devriez voir des erreurs en rouge.

## 2. Vérifier les erreurs dans Expo Go

1. **Secouez votre téléphone** pour ouvrir le menu de développement
2. Ou **appuyez 3 fois rapidement** sur l'écran
3. Sélectionnez **"Show Element Inspector"** ou **"Debug Remote JS"**
4. Regardez les erreurs affichées

## 3. Vérifier la console JavaScript

Dans Expo Go :
1. Secouez le téléphone
2. Sélectionnez **"Debug Remote JS"**
3. Cela ouvrira Chrome DevTools
4. Regardez l'onglet **Console** pour les erreurs

## 4. Erreurs courantes

### Erreur : "Cannot read property of undefined"
- Vérifiez que tous les imports sont corrects
- Vérifiez que les données mockées sont bien exportées

### Erreur : "Element type is invalid"
- Vérifiez que tous les composants sont bien exportés avec `export default`

### Erreur : "Unable to resolve module"
- Vérifiez que tous les fichiers existent
- Vérifiez les chemins d'import (relatifs vs absolus)

## 5. Test simple

Pour tester si React Native fonctionne, remplacez temporairement le contenu de `App.js` par :

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Test - Si vous voyez ceci, ça fonctionne !</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
  },
  text: {
    fontSize: 24,
    color: '#fff',
  },
});
```

Si cela fonctionne, le problème vient des imports ou des composants.

## 6. Vérifier les imports

Assurez-vous que tous ces fichiers existent :
- ✅ `src/screens/EventsScreen.js`
- ✅ `src/screens/PollsScreen.js`
- ✅ `src/screens/NewsScreen.js`
- ✅ `src/screens/ClubsScreen.js`
- ✅ `src/screens/GalleryScreen.js`
- ✅ `src/components/EventCard.js`
- ✅ `src/components/PollCard.js`
- ✅ `src/components/NewsCard.js`
- ✅ `src/components/ClubCard.js`
- ✅ `src/data/mockData.js`
- ✅ `src/utils/dateUtils.js`

## 7. Nettoyer et redémarrer

```bash
# Arrêter Expo (Ctrl+C)
# Nettoyer le cache
npx expo start -c
```

## 8. Réinstaller les dépendances

Si rien ne fonctionne :

```bash
# Supprimer node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Réinstaller
npm install

# Redémarrer
npx expo start -c
```

## 📸 Envoyer les erreurs

Si vous voyez des erreurs, copiez :
1. Le message d'erreur complet du terminal
2. Le message d'erreur de la console JavaScript (si disponible)
3. Une capture d'écran de l'écran rouge d'erreur dans Expo Go (si visible)
