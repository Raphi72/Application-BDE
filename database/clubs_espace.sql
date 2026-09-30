-- ============================================
-- ESPACE CLUB : présidents, adhésions, sessions, projets, annonces
-- À exécuter dans Supabase > SQL Editor, APRÈS schema.sql.
-- Idempotent : peut être relancé sans casser l'existant.
-- ============================================
--
-- Principe :
-- - Le président d'un club est un compte (clubs.president_id), posé
--   automatiquement quand un admin valide sa proposition (trigger : l'écran
--   admin n'a rien de spécial à faire), ou désigné par un admin
--   (RPC admin_set_club_president).
-- - Un étudiant demande à rejoindre un club (RPC request_club_join) avec un
--   message facultatif ; seul le président (et les admins BDE) voit la demande,
--   avec le nom et l'email du demandeur, et l'accepte ou la refuse.
-- - Les membres ont un espace privé en lecture : annonces, sessions, projets
--   et liste des membres. Ils répondent présent/absent aux sessions. Le bureau
--   (role 'bureau') publie les contenus ; le président gère aussi les demandes,
--   les membres et les infos du club.
-- - clubs.members_count est tenu à jour automatiquement (trigger).
--
-- Les écritures sensibles passent par des fonctions SECURITY DEFINER ou des
-- politiques RLS qui vérifient les droits de l'appelant.

-- ============================================
-- 1. CLUBS : colonnes ajoutées
-- ============================================

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS president_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.club_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity >= 1),
  ADD COLUMN IF NOT EXISTS recruiting BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS clubs_president_id_idx ON public.clubs(president_id);

-- ============================================
-- 2. NOUVELLES TABLES
-- ============================================

-- Membres d'un club. Le président y figure aussi (il compte comme membre) ;
-- son statut de président vient de clubs.president_id.
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'bureau')),
  title TEXT CHECK (char_length(title) <= 40), -- intitulé libre du bureau (Trésorier…)
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS club_members_user_id_idx ON public.club_members(user_id);

-- Demandes d'adhésion. Nom et email sont copiés à l'envoi (par la RPC, pas
-- par le client) : c'est ce que le président voit.
CREATE TABLE IF NOT EXISTS public.club_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT CHECK (char_length(message) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Une seule demande en attente par personne et par club.
CREATE UNIQUE INDEX IF NOT EXISTS club_join_requests_one_pending_idx
  ON public.club_join_requests(club_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS club_join_requests_club_status_idx
  ON public.club_join_requests(club_id, status);

-- Projets et idées du club. Un membre peut proposer une idée ; le bureau la
-- fait passer en cours puis terminée.
CREATE TABLE IF NOT EXISTS public.club_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT CHECK (char_length(description) <= 2000),
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'in_progress', 'done')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_projects_club_id_idx ON public.club_projects(club_id);

-- Annonces du bureau, visibles par les membres du club.
CREATE TABLE IF NOT EXISTS public.club_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_posts_club_id_idx ON public.club_posts(club_id);

-- Sessions du club : créées par le bureau, consultées par les membres qui
-- peuvent indiquer s'ils participent ou non.
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

-- ============================================
-- 3. FONCTIONS DE DROITS
-- ============================================
-- SECURITY DEFINER : elles lisent les tables sans passer par la RLS, ce qui
-- évite la récursion quand une politique de club_members interroge
-- club_members.

CREATE OR REPLACE FUNCTION public.is_bde_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_club_president(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id AND president_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = auth.uid())
      OR is_club_president(p_club_id);
$$;

-- Bureau au sens large : président, membres du bureau, admins BDE.
CREATE OR REPLACE FUNCTION public.is_club_manager(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_bde_admin()
      OR is_club_president(p_club_id)
      OR EXISTS (
        SELECT 1 FROM club_members
        WHERE club_id = p_club_id AND user_id = auth.uid() AND role = 'bureau'
      );
$$;

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- members_count = nombre réel de lignes dans club_members.
CREATE OR REPLACE FUNCTION public.sync_club_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_club_id := OLD.club_id;
  ELSE
    v_club_id := NEW.club_id;
  END IF;

  UPDATE clubs
  SET members_count = (SELECT count(*) FROM club_members WHERE club_id = v_club_id)
  WHERE id = v_club_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS club_members_count_sync ON public.club_members;
CREATE TRIGGER club_members_count_sync
  AFTER INSERT OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_club_members_count();

-- Le compteur ne se saisit plus à la main : toute écriture sur clubs (admin
-- compris) le ramène au nombre réel de membres.
CREATE OR REPLACE FUNCTION public.enforce_club_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.members_count := (SELECT count(*) FROM club_members WHERE club_id = NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clubs_members_count_enforce ON public.clubs;
CREATE TRIGGER clubs_members_count_enforce
  BEFORE INSERT OR UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_club_members_count();

-- Validation d'une proposition par l'admin : l'écran admin crée le club puis
-- passe la proposition à 'approved' (ou l'inverse). Dans les deux ordres, on
-- relie le club à sa proposition (même nom) : l'auteur devient président et
-- premier membre, la capacité de la proposition devient celle du club.
CREATE OR REPLACE FUNCTION public.link_club_to_proposal(p_club_id UUID, p_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_president UUID;
BEGIN
  UPDATE clubs c
  SET proposal_id = p.id,
      president_id = COALESCE(c.president_id, p.user_id),
      max_capacity = COALESCE(c.max_capacity, p.max_capacity)
  FROM club_proposals p
  WHERE c.id = p_club_id AND p.id = p_proposal_id
  RETURNING c.president_id INTO v_president;

  IF v_president IS NOT NULL THEN
    INSERT INTO club_members (club_id, user_id, role)
    VALUES (p_club_id, v_president, 'bureau')
    ON CONFLICT (club_id, user_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.link_club_to_proposal(UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.link_approved_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_proposal_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'club_proposals' THEN
    IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
      RETURN NULL;
    END IF;
    v_proposal_id := NEW.id;
    SELECT id INTO v_club_id FROM clubs
    WHERE proposal_id IS NULL AND lower(btrim(name)) = lower(btrim(NEW.club_name))
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    IF NEW.proposal_id IS NOT NULL THEN
      RETURN NULL;
    END IF;
    v_club_id := NEW.id;
    SELECT p.id INTO v_proposal_id FROM club_proposals p
    WHERE p.status = 'approved'
      AND lower(btrim(p.club_name)) = lower(btrim(NEW.name))
      AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.proposal_id = p.id)
    ORDER BY p.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_club_id IS NOT NULL AND v_proposal_id IS NOT NULL THEN
    PERFORM link_club_to_proposal(v_club_id, v_proposal_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS club_proposals_link_club ON public.club_proposals;
CREATE TRIGGER club_proposals_link_club
  AFTER UPDATE OF status ON public.club_proposals
  FOR EACH ROW EXECUTE FUNCTION public.link_approved_proposal();

DROP TRIGGER IF EXISTS clubs_link_proposal ON public.clubs;
CREATE TRIGGER clubs_link_proposal
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.link_approved_proposal();

-- Auteur des annonces et projets : fixé côté serveur à l'insertion, figé
-- ensuite (ainsi que le club et la date de création).
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
    NEW.author_id := OLD.author_id;
    NEW.author_name := OLD.author_name;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS club_projects_author ON public.club_projects;
CREATE TRIGGER club_projects_author
  BEFORE INSERT OR UPDATE ON public.club_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_club_content_author();

DROP TRIGGER IF EXISTS club_posts_author ON public.club_posts;
CREATE TRIGGER club_posts_author
  BEFORE INSERT OR UPDATE ON public.club_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_club_content_author();

-- Métadonnées des sessions : auteur fixé à l'appelant et champs structurels
-- immuables après création.
CREATE OR REPLACE FUNCTION public.set_club_session_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
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

-- Date de fin d'un projet (sert au rapport mensuel).
CREATE OR REPLACE FUNCTION public.set_club_project_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' THEN
    IF TG_OP = 'INSERT' OR OLD.status <> 'done' THEN
      NEW.completed_at := NOW();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS club_projects_completed_at ON public.club_projects;
CREATE TRIGGER club_projects_completed_at
  BEFORE INSERT OR UPDATE ON public.club_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_club_project_completed_at();

-- ============================================
-- 5. POLITIQUES RLS
-- ============================================

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_session_responses ENABLE ROW LEVEL SECURITY;

-- Membres : chacun voit ses adhésions, les membres voient ceux de leur club.
-- Écriture uniquement via les RPC (request/respond/leave/remove…).
DROP POLICY IF EXISTS "Club members are viewable by club members" ON public.club_members;
CREATE POLICY "Club members are viewable by club members" ON public.club_members
  FOR SELECT USING (
    user_id = auth.uid() OR is_club_member(club_id) OR is_bde_admin()
  );

-- Demandes : le demandeur voit les siennes, le président celles de son club.
DROP POLICY IF EXISTS "Join requests are viewable by requester and president" ON public.club_join_requests;
CREATE POLICY "Join requests are viewable by requester and president" ON public.club_join_requests
  FOR SELECT USING (
    (user_id = auth.uid() AND NOT is_club_member(club_id))
    OR is_club_president(club_id)
    OR is_bde_admin()
  );

-- Le demandeur peut annuler une demande encore en attente.
DROP POLICY IF EXISTS "Requesters can cancel pending requests" ON public.club_join_requests;
CREATE POLICY "Requesters can cancel pending requests" ON public.club_join_requests
  FOR DELETE USING (
    user_id = auth.uid()
    AND status = 'pending'
    AND NOT is_club_member(club_id)
  );

-- Projets : visibles des membres, écrits uniquement par le bureau.
DROP POLICY IF EXISTS "Club projects are viewable by club members" ON public.club_projects;
CREATE POLICY "Club projects are viewable by club members" ON public.club_projects
  FOR SELECT USING (is_club_member(club_id) OR is_bde_admin());

DROP POLICY IF EXISTS "Club members can propose projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers and idea authors can update projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers and idea authors can delete projects" ON public.club_projects;
DROP POLICY IF EXISTS "Club managers can insert projects" ON public.club_projects;
CREATE POLICY "Club managers can insert projects" ON public.club_projects
  FOR INSERT TO authenticated WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can update projects" ON public.club_projects;
CREATE POLICY "Club managers can update projects" ON public.club_projects
  FOR UPDATE TO authenticated
  USING (is_club_manager(club_id))
  WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can delete projects" ON public.club_projects;
CREATE POLICY "Club managers can delete projects" ON public.club_projects
  FOR DELETE TO authenticated USING (is_club_manager(club_id));

-- Annonces : visibles des membres, écrites par le bureau.
DROP POLICY IF EXISTS "Club posts are viewable by club members" ON public.club_posts;
CREATE POLICY "Club posts are viewable by club members" ON public.club_posts
  FOR SELECT USING (is_club_member(club_id) OR is_bde_admin());

DROP POLICY IF EXISTS "Club managers can insert posts" ON public.club_posts;
CREATE POLICY "Club managers can insert posts" ON public.club_posts
  FOR INSERT WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can update posts" ON public.club_posts;
CREATE POLICY "Club managers can update posts" ON public.club_posts
  FOR UPDATE USING (is_club_manager(club_id)) WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can delete posts" ON public.club_posts;
CREATE POLICY "Club managers can delete posts" ON public.club_posts
  FOR DELETE USING (is_club_manager(club_id));

-- Sessions : lecture par les membres, gestion par le bureau.
DROP POLICY IF EXISTS "Club sessions are viewable by club members" ON public.club_sessions;
CREATE POLICY "Club sessions are viewable by club members" ON public.club_sessions
  FOR SELECT TO authenticated
  USING (is_club_member(club_id) OR is_bde_admin());

DROP POLICY IF EXISTS "Club managers can insert sessions" ON public.club_sessions;
CREATE POLICY "Club managers can insert sessions" ON public.club_sessions
  FOR INSERT TO authenticated WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can update sessions" ON public.club_sessions;
CREATE POLICY "Club managers can update sessions" ON public.club_sessions
  FOR UPDATE TO authenticated
  USING (is_club_manager(club_id))
  WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "Club managers can delete sessions" ON public.club_sessions;
CREATE POLICY "Club managers can delete sessions" ON public.club_sessions
  FOR DELETE TO authenticated USING (is_club_manager(club_id));

-- Les réponses sont visibles des membres ; leur écriture passe uniquement par
-- respond_club_session, qui impose l'identité de l'appelant.
DROP POLICY IF EXISTS "Club session responses are viewable by club members"
  ON public.club_session_responses;
CREATE POLICY "Club session responses are viewable by club members"
  ON public.club_session_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_sessions session
      WHERE session.id = session_id
        AND (is_club_member(session.club_id) OR is_bde_admin())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_sessions TO authenticated;
GRANT SELECT ON public.club_session_responses TO authenticated;

-- Storage : un président peut envoyer les photos de son club (dossier clubs/).
-- Les admins gardent leur politique existante (SETUP_STORAGE_SIMPLE.md).
DROP POLICY IF EXISTS "Club presidents upload club images" ON storage.objects;
CREATE POLICY "Club presidents upload club images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'clubs'
    AND EXISTS (SELECT 1 FROM public.clubs WHERE president_id = auth.uid())
  );

-- ============================================
-- 6. RPC (appelées par l'app via supabase.rpc)
-- ============================================
-- Les erreurs métier sont levées avec un code court (ex. 'club_full') que
-- l'app traduit (src/services/clubService.js).

-- Demander à rejoindre un club (message facultatif, 500 caractères max).
CREATE OR REPLACE FUNCTION public.request_club_join(p_club_id UUID, p_message TEXT DEFAULT NULL)
RETURNS public.club_join_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_club clubs%ROWTYPE;
  v_email TEXT;
  v_name TEXT;
  v_message TEXT := NULLIF(btrim(p_message), '');
  v_request club_join_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_club FROM clubs WHERE id = p_club_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'club_not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  IF EXISTS (
    SELECT 1 FROM club_join_requests
    WHERE club_id = p_club_id AND user_id = v_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'request_pending';
  END IF;
  IF NOT v_club.recruiting THEN
    RAISE EXCEPTION 'recruiting_closed';
  END IF;
  IF v_club.max_capacity IS NOT NULL AND v_club.members_count >= v_club.max_capacity THEN
    RAISE EXCEPTION 'club_full';
  END IF;
  IF char_length(v_message) > 500 THEN
    RAISE EXCEPTION 'message_too_long';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT NULLIF(btrim(name), '') INTO v_name FROM profiles WHERE id = v_uid;

  INSERT INTO club_join_requests (club_id, user_id, name, email, message)
  VALUES (p_club_id, v_uid, COALESCE(v_name, split_part(v_email, '@', 1)), v_email, v_message)
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

-- Accepter (p_accept = true) ou refuser une demande : président ou admin.
CREATE OR REPLACE FUNCTION public.respond_club_join(p_request_id UUID, p_accept BOOLEAN)
RETURNS public.club_join_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request club_join_requests%ROWTYPE;
  v_club clubs%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM club_join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
  IF NOT (is_club_president(v_request.club_id) OR is_bde_admin()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'request_already_handled';
  END IF;

  IF p_accept THEN
    SELECT * INTO v_club FROM clubs WHERE id = v_request.club_id FOR UPDATE;
    IF v_club.max_capacity IS NOT NULL AND v_club.members_count >= v_club.max_capacity THEN
      RAISE EXCEPTION 'club_full';
    END IF;
    INSERT INTO club_members (club_id, user_id)
    VALUES (v_request.club_id, v_request.user_id)
    ON CONFLICT (club_id, user_id) DO NOTHING;
  END IF;

  UPDATE club_join_requests
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      handled_by = auth.uid(),
      handled_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

-- Réponse d'un membre à une session. user_id est toujours auth.uid().
CREATE OR REPLACE FUNCTION public.respond_club_session(
  p_session_id UUID,
  p_response TEXT
)
RETURNS public.club_session_responses
LANGUAGE plpgsql SECURITY DEFINER
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

  SELECT club_id INTO v_club_id
  FROM public.club_sessions
  WHERE id = p_session_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF NOT public.is_club_member(v_club_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.club_session_responses (session_id, user_id, response)
  VALUES (p_session_id, v_uid, p_response)
  ON CONFLICT (session_id, user_id)
  DO UPDATE SET response = EXCLUDED.response, updated_at = NOW()
  RETURNING * INTO v_response;

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_club_session(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_club_session(UUID, TEXT)
  TO authenticated;

-- Quitter un club (le président doit d'abord transmettre la présidence).
CREATE OR REPLACE FUNCTION public.leave_club(p_club_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF is_club_president(p_club_id) THEN
    RAISE EXCEPTION 'president_cannot_leave';
  END IF;

  DELETE FROM club_members WHERE club_id = p_club_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_member';
  END IF;
END;
$$;

-- Retirer un membre : président ou admin (pas le président lui-même).
CREATE OR REPLACE FUNCTION public.remove_club_member(p_club_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_club_president(p_club_id) OR is_bde_admin()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id AND president_id = p_user_id) THEN
    RAISE EXCEPTION 'cannot_remove_president';
  END IF;

  DELETE FROM club_members WHERE club_id = p_club_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_member';
  END IF;
END;
$$;

-- Passer un membre au bureau (avec un intitulé facultatif) ou le repasser membre.
CREATE OR REPLACE FUNCTION public.set_club_member_role(
  p_club_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_title TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_club_president(p_club_id) OR is_bde_admin()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF p_role NOT IN ('member', 'bureau') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  UPDATE club_members
  SET role = p_role,
      title = CASE WHEN p_role = 'bureau' THEN left(NULLIF(btrim(p_title), ''), 40) END
  WHERE club_id = p_club_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_member';
  END IF;
END;
$$;

-- Transmettre la présidence à un membre du club : président actuel ou admin.
-- L'ancien président redevient simple membre. L'email de contact public suit
-- s'il s'agissait de celui de l'ancien président.
CREATE OR REPLACE FUNCTION public.transfer_club_presidency(p_club_id UUID, p_new_president UUID)
RETURNS public.clubs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club clubs%ROWTYPE;
  v_old_email TEXT;
  v_new_email TEXT;
  v_new_name TEXT;
BEGIN
  IF NOT (is_club_president(p_club_id) OR is_bde_admin()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = p_new_president) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  SELECT * INTO v_club FROM clubs WHERE id = p_club_id FOR UPDATE;
  SELECT email INTO v_old_email FROM auth.users WHERE id = v_club.president_id;
  SELECT email INTO v_new_email FROM auth.users WHERE id = p_new_president;
  SELECT NULLIF(btrim(name), '') INTO v_new_name FROM profiles WHERE id = p_new_president;

  UPDATE club_members SET role = 'member', title = NULL
  WHERE club_id = p_club_id AND user_id = v_club.president_id;
  UPDATE club_members SET role = 'bureau', title = NULL
  WHERE club_id = p_club_id AND user_id = p_new_president;

  UPDATE clubs
  SET president_id = p_new_president,
      president = COALESCE(v_new_name, president),
      contact = CASE
        WHEN contact IS NULL OR lower(contact) = lower(v_old_email) THEN v_new_email
        ELSE contact
      END
  WHERE id = p_club_id
  RETURNING * INTO v_club;

  RETURN v_club;
END;
$$;

-- Admin : désigner le président d'un club par l'email de son compte (clubs
-- créés à la main, président parti…). Le compte devient membre si besoin.
CREATE OR REPLACE FUNCTION public.admin_set_club_president(p_club_id UUID, p_email TEXT)
RETURNS public.clubs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_club clubs%ROWTYPE;
BEGIN
  IF NOT is_bde_admin() THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club_not_found';
  END IF;

  INSERT INTO club_members (club_id, user_id, role)
  VALUES (p_club_id, v_uid, 'bureau')
  ON CONFLICT (club_id, user_id) DO NOTHING;

  SELECT * INTO v_club FROM transfer_club_presidency(p_club_id, v_uid);
  RETURN v_club;
END;
$$;

-- Président : modifier les infos publiques de son club (le nom reste du
-- ressort du BDE). Capacité : 10 minimum (charte) et pas sous l'effectif.
CREATE OR REPLACE FUNCTION public.update_club_info(
  p_club_id UUID,
  p_description TEXT,
  p_contact TEXT,
  p_category TEXT,
  p_image TEXT,
  p_max_capacity INTEGER,
  p_recruiting BOOLEAN
)
RETURNS public.clubs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club clubs%ROWTYPE;
BEGIN
  IF NOT (is_club_president(p_club_id) OR is_bde_admin()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF NULLIF(btrim(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'description_required';
  END IF;

  SELECT * INTO v_club FROM clubs WHERE id = p_club_id FOR UPDATE;
  IF p_max_capacity IS NOT NULL AND p_max_capacity < 10 THEN
    RAISE EXCEPTION 'capacity_too_low';
  END IF;
  IF p_max_capacity IS NOT NULL AND p_max_capacity < v_club.members_count THEN
    RAISE EXCEPTION 'capacity_below_members';
  END IF;

  UPDATE clubs
  SET description = btrim(p_description),
      contact = NULLIF(btrim(p_contact), ''),
      category = COALESCE(NULLIF(btrim(p_category), ''), category),
      image = p_image,
      max_capacity = p_max_capacity,
      recruiting = COALESCE(p_recruiting, recruiting)
  WHERE id = p_club_id
  RETURNING * INTO v_club;

  RETURN v_club;
END;
$$;

-- Liste des membres d'un club (membres du club et admins). L'email n'est
-- renvoyé qu'au président et aux admins.
CREATE OR REPLACE FUNCTION public.club_member_list(p_club_id UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  title TEXT,
  is_president BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    COALESCE(NULLIF(btrim(p.name), ''), split_part(u.email::TEXT, '@', 1)),
    CASE WHEN is_club_president(p_club_id) OR is_bde_admin() THEN u.email::TEXT END,
    m.role,
    m.title,
    m.user_id IS NOT DISTINCT FROM c.president_id,
    m.joined_at
  FROM club_members m
  JOIN clubs c ON c.id = m.club_id
  LEFT JOIN profiles p ON p.id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.club_id = p_club_id
    AND (is_club_member(p_club_id) OR is_bde_admin())
  ORDER BY (m.user_id IS NOT DISTINCT FROM c.president_id) DESC, (m.role = 'bureau') DESC, m.joined_at;
$$;

-- ============================================
-- 7. REPRISE DE L'EXISTANT
-- ============================================

-- Relier les clubs déjà créés à leur proposition approuvée (même nom) : son
-- auteur devient président, sa capacité devient celle du club.
UPDATE public.clubs c
SET proposal_id = p.id,
    president_id = COALESCE(c.president_id, p.user_id),
    max_capacity = COALESCE(c.max_capacity, p.max_capacity)
FROM public.club_proposals p
WHERE c.proposal_id IS NULL
  AND p.status = 'approved'
  AND lower(btrim(p.club_name)) = lower(btrim(c.name));

-- Chaque président est membre de son club.
INSERT INTO public.club_members (club_id, user_id, role)
SELECT id, president_id, 'bureau'
FROM public.clubs
WHERE president_id IS NOT NULL
ON CONFLICT (club_id, user_id) DO NOTHING;

-- Le compteur de membres devient le nombre réel d'inscrits dans l'app
-- (remplace les valeurs saisies à la main dans l'admin).
UPDATE public.clubs c
SET members_count = (SELECT count(*) FROM public.club_members m WHERE m.club_id = c.id);
