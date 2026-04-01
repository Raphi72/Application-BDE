# 🔧 Résoudre l'erreur "Failed to download remote update"

Cette erreur signifie qu'Expo Go n'arrive pas à télécharger le bundle JavaScript depuis votre ordinateur.

## 🚀 Solutions (dans l'ordre)

### Solution 1 : Vérifier la connexion réseau

**Votre téléphone et votre ordinateur doivent être sur le même Wi-Fi !**

1. Vérifiez que votre téléphone est connecté au Wi-Fi (pas aux données mobiles)
2. Vérifiez que votre ordinateur est sur le même réseau Wi-Fi
3. Désactivez temporairement les données mobiles sur votre téléphone

### Solution 2 : Utiliser le mode Tunnel

Le mode tunnel fonctionne même si vous n'êtes pas sur le même réseau :

```bash
# Arrêtez Expo (Ctrl+C)
# Puis relancez avec tunnel
npx expo start --tunnel
```

Puis scannez le nouveau QR code.

### Solution 3 : Nettoyer le cache

```bash
# Arrêtez Expo (Ctrl+C)
# Nettoyez le cache
npx expo start -c
```

### Solution 4 : Vérifier le pare-feu Windows

Le pare-feu peut bloquer Expo :

1. Ouvrez **Paramètres Windows** > **Sécurité** > **Pare-feu Windows**
2. Cliquez sur **Autoriser une application via le pare-feu**
3. Vérifiez que **Node.js** est autorisé pour les réseaux privés
4. Si Node.js n'est pas dans la liste :
   - Cliquez sur **Modifier les paramètres**
   - Cliquez sur **Autoriser une autre application**
   - Ajoutez Node.js (généralement dans `C:\Program Files\nodejs\node.exe`)

### Solution 5 : Redémarrer Expo et Expo Go

1. **Arrêtez Expo** dans le terminal (Ctrl+C)
2. **Fermez complètement Expo Go** sur votre téléphone
3. **Relancez Expo** : `npm start`
4. **Rouvrez Expo Go** et scannez le QR code

### Solution 6 : Vérifier l'adresse IP

Si vous voyez `exp://127.0.0.1:8081` dans le terminal, cela ne fonctionnera pas.

**Solution :**
1. Trouvez l'adresse IP locale de votre ordinateur :
   - Ouvrez PowerShell
   - Tapez : `ipconfig`
   - Cherchez "Adresse IPv4" (ex: 192.168.1.100)
2. Utilisez le mode tunnel (Solution 2)

### Solution 7 : Réinstaller Expo Go

Parfois Expo Go peut avoir un problème :

1. **Désinstallez Expo Go** de votre téléphone
2. **Réinstallez-le** depuis le Play Store / App Store
3. **Relancez** `npm start`
4. **Scannez** le nouveau QR code

### Solution 8 : Vérifier les ports

Le port 8081 doit être libre :

```bash
# Vérifier si le port est utilisé (Windows PowerShell)
netstat -ano | findstr :8081
```

Si le port est utilisé, arrêtez l'autre processus ou changez le port :

```bash
npx expo start --port 8082
```

### Solution 9 : Désactiver le VPN/Proxy

Si vous utilisez un VPN ou un proxy :
- **Désactivez-le temporairement**
- Essayez de nouveau

### Solution 10 : Réinitialiser complètement

Si rien ne fonctionne :

```bash
# Arrêtez Expo (Ctrl+C)

# Supprimez le cache Expo
npx expo start -c --clear

# Ou supprimez manuellement
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force node_modules/.cache

# Relancez
npm start
```

## 🔍 Diagnostic

### Vérifier les erreurs dans le terminal

Regardez le terminal où vous avez lancé `npm start`. Y a-t-il des erreurs ?

### Vérifier dans Expo Go

1. **Secouez votre téléphone** pour ouvrir le menu
2. Sélectionnez **"View error log"**
3. Regardez les erreurs affichées

### Tester la connexion

Dans le terminal Expo, vous devriez voir :
```
› Metro waiting on exp://...
```

Si vous voyez `exp://127.0.0.1:8081`, utilisez le mode tunnel.

## ✅ Solution Rapide (Checklist)

Essayez dans cet ordre :

1. [ ] Téléphone et PC sur le même Wi-Fi
2. [ ] Mode tunnel : `npx expo start --tunnel`
3. [ ] Cache nettoyé : `npx expo start -c`
4. [ ] Pare-feu Windows autorise Node.js
5. [ ] Expo Go redémarré
6. [ ] Expo redémarré

## 📱 Alternative : Utiliser un émulateur

Si le problème persiste, utilisez un émulateur Android :

1. Installez Android Studio
2. Créez un émulateur
3. Lancez : `npx expo start --android`

## 🆘 Si Rien Ne Fonctionne

1. **Copiez le message d'erreur complet** du terminal
2. **Copiez le message d'erreur** d'Expo Go (si visible)
3. **Vérifiez** que vous avez bien configuré Supabase (`SETUP_SUPABASE.md`)
4. **Vérifiez** que `src/config/supabase.js` contient vos vraies clés

## 💡 Astuce

Le mode tunnel est généralement la solution la plus fiable :

```bash
npx expo start --tunnel
```

Cela fonctionne même si vous n'êtes pas sur le même réseau Wi-Fi, mais peut être un peu plus lent.
