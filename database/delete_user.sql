-- ============================================
-- Suppression de compte utilisateur
-- À exécuter dans Supabase > SQL Editor
-- (projet déjà déployé)
-- ============================================

-- Aligner les FK pour éviter les blocages à la suppression
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.news
  DROP CONSTRAINT IF EXISTS news_author_id_fkey;

ALTER TABLE public.news
  ADD CONSTRAINT news_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- RPC appelée par l'app : supabase.rpc('delete_user')
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.news
  SET author_id = NULL
  WHERE author_id = uid;

  DELETE FROM public.push_tokens WHERE user_id = uid;
  DELETE FROM public.event_registrations WHERE user_id = uid;
  DELETE FROM public.votes WHERE user_id = uid;
  DELETE FROM public.club_proposals WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
