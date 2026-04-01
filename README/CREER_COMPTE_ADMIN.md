# 👤 Comment Créer un Compte Administrateur

## Méthode 1 : Via Supabase Dashboard (Recommandé)

### Étape 1 : Créer un compte normal
1. Lancez l'application
2. Créez un compte avec votre email et mot de passe
3. Connectez-vous

### Étape 2 : Modifier le rôle dans Supabase

1. **Allez dans Supabase Dashboard**
2. Cliquez sur **Table Editor** (dans la barre latérale)
3. Cliquez sur la table **`profiles`**
4. Trouvez votre utilisateur (cherchez par email dans la colonne correspondante, ou regardez l'ID)
5. Cliquez sur la ligne pour l'éditer
6. Dans la colonne **`role`**, changez `user` en `admin`
7. Cliquez sur **Save** (ou appuyez sur Entrée)

### Étape 3 : Reconnectez-vous

1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous** avec votre compte
3. Vous devriez maintenant voir l'onglet **"Admin"** dans la navigation !

---

## Méthode 2 : Via SQL (Alternative)

Si vous préférez utiliser SQL :

1. **Allez dans Supabase Dashboard** > **SQL Editor**
2. Exécutez cette requête (remplacez `VOTRE_EMAIL` par votre email) :

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'VOTRE_EMAIL'
);
```

3. **Déconnectez-vous** et **reconnectez-vous** dans l'application

---

## Vérification

Une fois que vous êtes admin, vous devriez voir :

✅ Un badge **"Administrateur"** sur votre écran de profil
✅ Un onglet **"Admin"** dans la barre de navigation en bas
✅ Le panneau d'administration avec toutes les options de gestion

---

## Panneau d'Administration

En tant qu'admin, vous pouvez :

- ✅ **Gérer les Événements** : Créer, modifier, supprimer
- ✅ **Gérer les Sondages** : Créer, modifier, supprimer
- ✅ **Gérer les Actualités** : Créer, modifier, supprimer
- ✅ **Gérer les Clubs** : Créer, modifier, supprimer
- ✅ **Gérer la Galerie** : (À venir)

Tous les changements que vous faites seront visibles par tous les utilisateurs !

---

## ⚠️ Important

- Seuls les comptes avec `role = 'admin'` dans la table `profiles` peuvent accéder au panneau admin
- Les utilisateurs normaux (`role = 'user'`) ne verront pas l'onglet Admin
- Vous pouvez créer plusieurs comptes admin si nécessaire

---

## 🆘 Problème : L'onglet Admin n'apparaît pas

1. Vérifiez que le rôle est bien `admin` dans Supabase (Table Editor > profiles)
2. Déconnectez-vous complètement de l'application
3. Reconnectez-vous
4. Si ça ne fonctionne toujours pas, redémarrez l'application
