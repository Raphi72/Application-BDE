-- ============================================
-- AUDIT DE LA BASE (lecture seule)
-- À exécuter dans Supabase > SQL Editor. Ne modifie rien : chaque bloc est
-- une requête à lancer séparément (sélectionner le bloc puis Run).
-- ============================================

-- 1. Comptes : confirmation de l'email, dernière connexion, rôle.
--    email_ok = false : adresse hors @aivancity.education / @aivancity.ai.
--    profil = false : compte sans profil (schema.sql le recrée).
SELECT
  u.email,
  p.name,
  p.role,
  u.email_confirmed_at IS NOT NULL AS confirme,
  public.is_allowed_email(u.email) AS email_ok,
  p.id IS NOT NULL AS profil,
  u.created_at::DATE AS cree_le,
  u.last_sign_in_at::DATE AS derniere_connexion
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;

-- 2. Administrateurs. Le compte de test Play Store n'a pas besoin du rôle
--    admin pour la revue Google ; pour le repasser en simple utilisateur :
--    UPDATE public.profiles SET role = 'user' WHERE id = '<uuid>';
SELECT u.email, p.name, p.id
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';

-- 3. Inscriptions jamais confirmées depuis plus de 7 jours (lien expiré :
--    la personne peut se réinscrire avec la même adresse).
SELECT u.email, u.created_at::DATE AS cree_le
FROM auth.users u
WHERE u.email_confirmed_at IS NULL
  AND u.created_at < NOW() - INTERVAL '7 days';

-- 4. Clés étrangères vers auth.users : toutes doivent être CASCADE ou
--    SET NULL, sinon la suppression de compte échoue.
SELECT
  c.conrelid::regclass AS table_,
  a.attname AS colonne,
  CASE c.confdeltype
    WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
    WHEN 'a' THEN 'NO ACTION (bloquant)' WHEN 'r' THEN 'RESTRICT (bloquant)'
    ELSE c.confdeltype::TEXT
  END AS a_la_suppression
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
ORDER BY 1, 2;

-- 5. Politiques RLS par table (référence : database/schema.sql, section 7).
SELECT tablename, count(*) AS politiques, string_agg(cmd, ', ' ORDER BY cmd) AS commandes
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 6. Triggers posés par schema.sql sur auth.users (attendus :
--    enforce_school_email et on_auth_user_created).
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
ORDER BY tgname;

-- 7. Compteurs : aucune ligne attendue (sinon relancer schema.sql).
SELECT 'event' AS type, e.id, e.current_participants AS stocke, count(r.id) AS reel
FROM public.events e LEFT JOIN public.event_registrations r ON r.event_id = e.id
GROUP BY e.id HAVING e.current_participants IS DISTINCT FROM count(r.id)
UNION ALL
SELECT 'poll', p.id, p.total_votes, count(v.id)
FROM public.polls p LEFT JOIN public.votes v ON v.poll_id = p.id
GROUP BY p.id HAVING p.total_votes IS DISTINCT FROM count(v.id)
UNION ALL
SELECT 'club', c.id, c.members_count, count(m.id)
FROM public.clubs c LEFT JOIN public.club_members m ON m.club_id = c.id
GROUP BY c.id HAVING c.members_count IS DISTINCT FROM count(m.id);
