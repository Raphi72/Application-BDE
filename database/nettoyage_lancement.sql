-- ============================================
-- NETTOYAGE DE LANCEMENT (script ponctuel, octobre 2026)
-- À exécuter UNE FOIS dans Supabase > SQL Editor, après database/schema.sql.
-- ============================================
--
-- 1. Supprime tout le contenu de test : événements, inscriptions, sondages,
--    votes, actualités, clubs, propositions et tout l'espace club.
--    Les comptes (auth.users), les profils et les jetons push sont conservés.
-- 2. Publie le sondage de satisfaction et l'actualité du week-end
--    d'intégration. Insertion en SQL : aucune notification push n'est
--    envoyée (contrairement à une création depuis l'espace admin de l'app).
--
-- Les 4 images de test du dossier events/ du bucket « images » ne peuvent pas
-- être supprimées en SQL : Supabase > Storage > images > events.

BEGIN;

-- ---------- 1. Purge du contenu de test ----------

DELETE FROM public.event_registrations;
DELETE FROM public.events;

DELETE FROM public.votes;
DELETE FROM public.polls;

DELETE FROM public.news;

DELETE FROM public.club_session_responses;
DELETE FROM public.club_sessions;
DELETE FROM public.club_posts;
DELETE FROM public.club_projects;
DELETE FROM public.club_join_requests;
DELETE FROM public.club_members;
DELETE FROM public.clubs;
DELETE FROM public.club_proposals;

-- ---------- 2. Contenu de lancement ----------

INSERT INTO public.polls (question, options, end_date)
VALUES (
  'Est-ce que vous êtes content de l''application ?',
  '["Oui", "Non", "Un peu"]'::jsonb,
  NULL
);

INSERT INTO public.news (title, content, category)
VALUES (
  'Retour sur le Week-end d''intégration',
  'Du 9 au 11 octobre, c''était le Week-end d''intégration ! Trois jours pour faire connaissance, partager de bons moments et bien démarrer l''année ensemble.

Merci à toutes celles et ceux qui étaient là, et merci à l''équipe du BDE qui a préparé ce week-end.

Ce n''est que le début : les prochains rendez-vous arrivent dans l''onglet Événements. Et dites-nous ce que vous pensez de l''application dans l''onglet Sondages !',
  'Événement'
);

COMMIT;

-- Contrôle : ce qui reste après le nettoyage.
SELECT 'profils conservés' AS element, count(*)::TEXT AS valeur FROM public.profiles
UNION ALL SELECT 'événements', count(*)::TEXT FROM public.events
UNION ALL SELECT 'clubs', count(*)::TEXT FROM public.clubs
UNION ALL SELECT 'sondages', string_agg(question, ' | ') FROM public.polls
UNION ALL SELECT 'actualités', string_agg(title, ' | ') FROM public.news;
