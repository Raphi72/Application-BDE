# Fiche Google Play Store — NØVYX (BDE Aivancity)

Textes prêts à coller + captures générées le 9 septembre 2026.

## Identifiants testeurs (Play Console → App content / Test)

| Champ | Valeur |
|--------|--------|
| Email | `playstore.test@aivancity.ai` |
| Mot de passe | `PlayTest2026!` |
| Rôle | **Administrateur** (requis pour les tests Google Play) |

Vérifier / forcer le rôle admin :
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '9e20482d-139f-4543-82d5-4491dbf7c5a1';
```

---

## Nom de l'application
```
NØVYX – BDE Aivancity
```
*(21 caractères, max 30 ; alternative courte : `NØVYX`)*

## Description courte (max 80 caractères)
```
L'app officielle du BDE Aivancity : événements, sondages, clubs et actus.
```
*(79 caractères)*

## Description complète
```
NØVYX est l'application officielle du Bureau Des Étudiants d'Aivancity.

Restez connectés à la vie de l'école : consultez les événements, inscrivez-vous en un clic, votez aux sondages, suivez les actualités et découvrez les clubs & associations.

FONCTIONNALITÉS
• Événements : dates, lieux, capacité et inscription
• Sondages : votez et voyez les résultats en temps réel
• Actualités : les infos du BDE au même endroit
• Clubs & associations : parcourez les clubs et proposez-en un nouveau
• Notifications : soyez alertés des nouveautés importantes
• Profil : gérez votre compte, votre langue (FR/EN) et vos données

POUR QUI ?
Réservé aux étudiants Aivancity (connexion avec une adresse @aivancity.education ou @aivancity.ai).

SÉCURITÉ & CONFIDENTIALITÉ
Vos données sont protégées. Vous pouvez supprimer votre compte depuis l'écran Profil.
Politique de confidentialité : [À REMPLACER PAR L'URL PUBLIQUE de privacy-policy.html]

Contact : bdeaivancity@gmail.com
```

## Notes de version (1.0.0)
```
Première version de NØVYX :
• Connexion étudiants Aivancity
• Événements, sondages, actualités et clubs
• Proposition de création de club
• Profil, langue FR/EN et suppression de compte
```

## Catégorie
- **Catégorie principale** : Éducation  
- **Catégorie secondaire** (si dispo) : Social / Lifestyle

## Tags / mots-clés (aide interne, pas un champ officiel)
`BDE`, `Aivancity`, `étudiants`, `événements`, `sondages`, `clubs`, `campus`

## Classification du contenu
- Public cible : **étudiants majeurs / enseignement supérieur**
- Contenu : **Tout public** (pas de violence, pas d'achats in-app, pas de pubs)
- PEGI / classification : **PEGI 3** / Everyone (sauf si contenu clubs/events plus sensible)

## Contact fiche Play
- Email : `bdeaivancity@gmail.com`
- Politique de confidentialité : **URL HTTPS obligatoire** (héberger `privacy-policy.html`)

## Captures d'écran

Dossier : `play-store/screenshots/`

À uploader en priorité (versions `*-play.png` en 1080×1920) :

1. `01-login-play.png` — Connexion  
2. `02-evenements-play.png` — Événements  
3. `03-sondages-play.png` — Sondages  
4. `05-clubs-play.png` — Clubs & associations  
5. `06-profil-play.png` — Profil  

Optionnel : `04-actualites-play.png` (écran vide pour le moment — à recapturer quand il y aura des actus).

**Conseil Play Store** : minimum 2 captures téléphone ; idéalement 4–8.  
⚠️ Les captures actuelles montrent l'**ancien design** (avant la refonte NØVYX) : elles sont à refaire. Les captures actuelles viennent de la version web (Expo). Pour une fiche plus “native”, refaire les mêmes écrans sur un vrai téléphone Android (Expo Go ou build).

## Graphismes manquants à préparer

| Asset | Taille | Fichier source actuel |
|--------|--------|------------------------|
| Icône haute résolution | 512×512 | `play-store/icon-512.png` ✅ (généré par `scripts/generate_brand_assets.py`) |
| Bannière Feature Graphic | 1024×500 | `play-store/feature-graphic.png` ⚠️ ancien design, à refaire |
| Icône adaptive | déjà dans `assets/adaptive-icon.png` | OK pour le build |

## Checklist rapide Play Console

- [ ] Nom + descriptions collés  
- [ ] 4+ screenshots uploadés  
- [x] Icône 512×512 (`play-store/icon-512.png`)
- [ ] Feature graphic 1024×500  
- [ ] URL politique de confidentialité en ligne  
- [ ] Compte testeur renseigné  
- [ ] Questionnaire données / sécurité rempli  
- [ ] Classification contenu  
- [ ] AAB uploadé (EAS Build)
