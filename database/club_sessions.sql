-- ============================================
-- SESSIONS DE CLUB ET DROITS DES MEMBRES
-- À exécuter dans Supabase > SQL Editor, après database/clubs_espace.sql.
-- Idempotent : peut être relancé sans effacer les données.
-- ============================================

BEGIN;

-- Un membre ordinaire lit les projets mais ne peut plus proposer, modifier ou
-- supprimer de contenu. Le bureau, le président et les admins restent gérants.
DROP POLICY IF EXISTS "Club members can propose projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers and idea authors can update projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers and idea authors can delete projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers can insert projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers can update projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers can delete projects" ON public.club_projects;

CREATE POLICY "Club managers can insert projects" ON public.club_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_club_manager(club_id));

CREATE POLICY "Club managers can update projects" ON public.club_projects
  FOR UPDATE TO authenticated
  USING (public.is_club_manager(club_id))
  WITH CHECK (public.is_club_manager(club_id));

CREATE POLICY "Club managers can delete projects" ON public.club_projects
  FOR DELETE TO authenticated
  USING (public.is_club_manager(club_id));

-- Une fois accepté, un membre ne peut plus relire sa demande d'adhésion.
-- Seuls le président du club et les admins voient les demandes des membres.
DROP POLICY IF EXISTS "Join requests are viewable by requester and president"
  ON public.club_join_requests;
CREATE POLICY "Join requests are viewable by requester and president"
  ON public.club_join_requests
  FOR SELECT USING (
    (user_id = auth.uid() AND NOT public.is_club_member(club_id))
    OR public.is_club_president(club_id)
    OR public.is_bde_admin()
  );

DROP POLICY IF EXISTS "Requesters can cancel pending requests"
  ON public.club_join_requests;
CREATE POLICY "Requesters can cancel pending requests"
  ON public.club_join_requests
  FOR DELETE USING (
    user_id = auth.uid()
    AND status = 'pending'
    AND NOT public.is_club_member(club_id)
  );

-- Sessions proposées par le bureau : date, heure, lieu et détails.
CREATE TABLE IF NOT EXISTS public.club_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT CHECK (char_length(description) <= 2000),
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  location TEXT NOT NULL CHECK (char_length(btrim(location)) BETWEEN 1 AND 200),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_sessions_club_date_idx
  ON public.club_sessions(club_id, session_date, session_time);

CREATE TABLE IF NOT EXISTS public.club_session_responses (
  session_id UUID NOT NULL REFERENCES public.club_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('going', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS club_session_responses_user_idx
  ON public.club_session_responses(user_id);

-- L'auteur, le club et la date de création d'une session sont fixés côté
-- serveur. Le trigger actualise updated_at à chaque modification.
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
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS club_sessions_metadata ON public.club_sessions;
CREATE TRIGGER club_sessions_metadata
  BEFORE INSERT OR UPDATE ON public.club_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_club_session_metadata();

ALTER TABLE public.club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_session_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club sessions are viewable by club members"
  ON public.club_sessions;
CREATE POLICY "Club sessions are viewable by club members"
  ON public.club_sessions
  FOR SELECT TO authenticated
  USING (
    public.is_club_member(club_id)
    OR public.is_bde_admin()
  );

DROP POLICY IF EXISTS "Club managers can insert sessions"
  ON public.club_sessions;
CREATE POLICY "Club managers can insert sessions"
  ON public.club_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can update sessions"
  ON public.club_sessions;
CREATE POLICY "Club managers can update sessions"
  ON public.club_sessions
  FOR UPDATE TO authenticated
  USING (public.is_club_manager(club_id))
  WITH CHECK (public.is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can delete sessions"
  ON public.club_sessions;
CREATE POLICY "Club managers can delete sessions"
  ON public.club_sessions
  FOR DELETE TO authenticated
  USING (public.is_club_manager(club_id));

-- Les membres voient les réponses de leur club (pour le nombre de
-- participants). Toute écriture passe par respond_club_session.
DROP POLICY IF EXISTS "Club session responses are viewable by club members"
  ON public.club_session_responses;
CREATE POLICY "Club session responses are viewable by club members"
  ON public.club_session_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_sessions session
      WHERE session.id = session_id
        AND (
          public.is_club_member(session.club_id)
          OR public.is_bde_admin()
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_sessions TO authenticated;
GRANT SELECT ON public.club_session_responses TO authenticated;

-- Un membre répond pour lui-même ; l'identité ne vient jamais du client.
CREATE OR REPLACE FUNCTION public.respond_club_session(
  p_session_id UUID,
  p_response TEXT
)
RETURNS public.club_session_responses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_club_id UUID;
  v_response public.club_session_responses%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_response NOT IN ('going', 'not_going') THEN
    RAISE EXCEPTION 'invalid_response';
  END IF;

  SELECT club_id
  INTO v_club_id
  FROM public.club_sessions
  WHERE id = p_session_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF NOT public.is_club_member(v_club_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.club_session_responses (
    session_id,
    user_id,
    response
  )
  VALUES (
    p_session_id,
    v_uid,
    p_response
  )
  ON CONFLICT (session_id, user_id)
  DO UPDATE SET
    response = EXCLUDED.response,
    updated_at = NOW()
  RETURNING * INTO v_response;

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_club_session(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_club_session(UUID, TEXT)
  TO authenticated;

COMMIT;
