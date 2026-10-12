-- ============================================
-- AUTEURS DES CONTENUS DE CLUB ET SUPPRESSION DE COMPTE
-- À exécuter dans Supabase > SQL Editor, après database/club_sessions.sql.
-- Idempotent : peut être relancé sans effet de bord.
-- ============================================
--
-- 1. club_sessions.created_by référençait auth.users en ON DELETE RESTRICT :
--    un membre du bureau ayant créé une session ne pouvait plus supprimer son
--    compte (delete_user échouait). La session est désormais conservée pour le
--    club, sans auteur.
-- 2. Les triggers qui figent l'auteur des annonces, projets et sessions
--    annulaient aussi sa remise à NULL par la base lors de la suppression du
--    compte, laissant une référence vers un compte qui n'existe plus.

BEGIN;

ALTER TABLE public.club_sessions ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.club_sessions DROP CONSTRAINT IF EXISTS club_sessions_created_by_fkey;
ALTER TABLE public.club_sessions
  ADD CONSTRAINT club_sessions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_club_content_author()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.author_id := auth.uid();
      NEW.author_name := (SELECT name FROM profiles WHERE id = auth.uid());
    END IF;
  ELSE
    NEW.club_id := OLD.club_id;
    -- Auteur figé, sauf sa remise à NULL par la base quand son compte est
    -- supprimé (ON DELETE SET NULL).
    IF NEW.author_id IS NOT NULL THEN
      NEW.author_id := OLD.author_id;
    END IF;
    NEW.author_name := OLD.author_name;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_club_session_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  ELSE
    NEW.club_id := OLD.club_id;
    -- Auteur figé, sauf sa remise à NULL quand son compte est supprimé.
    IF NEW.created_by IS NOT NULL THEN
      NEW.created_by := OLD.created_by;
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
