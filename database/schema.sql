-- ============================================
-- NØVYX — SCHÉMA COMPLET DE LA BASE SUPABASE
-- ============================================
--
-- Fichier unique et rejouable :
-- - sur un projet neuf, il crée toute la base ;
-- - sur la prod, il la remet à niveau sans toucher aux données existantes.
-- À coller en entier dans Supabase > SQL Editor. Tout s'exécute dans une
-- transaction : en cas d'erreur, rien n'est appliqué.
--
-- Les politiques RLS du schéma public sont toutes supprimées puis recréées :
-- celles de ce fichier sont les seules en vigueur.
--
-- Donner le rôle admin à un compte (créé depuis l'app), dans le SQL Editor :
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid du compte>';
-- Contrôle des comptes et des données : database/audit.sql.
--
-- Banc de test local (PGlite) : database/tests/schema.test.mjs.

BEGIN;

-- ============================================
-- 1. TABLES
-- ============================================

-- Profil public d'un compte, créé automatiquement à l'inscription.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  image TEXT, -- URL, ou tableau JSON d'URL
  max_participants INTEGER DEFAULT 100, -- 0 ou NULL : pas de limite
  current_participants INTEGER DEFAULT 0, -- tenu à jour par trigger
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- tableau de chaînes
  end_date DATE, -- dernier jour de vote inclus ; NULL : sans fin
  total_votes INTEGER DEFAULT 0, -- tenu à jour par trigger
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL, -- position de l'option dans polls.options
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  category TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.club_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  club_name TEXT NOT NULL,
  objective TEXT NOT NULL,
  president_name TEXT NOT NULL,
  president_email TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 10, -- 10 minimum (charte)
  event_ideas TEXT NOT NULL,
  category TEXT,
  additional_info TEXT,
  charte_accepted BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Le président est un compte (president_id), posé quand un admin valide la
-- proposition du club ou désigné par un admin. president est son nom affiché.
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  contact TEXT,
  president TEXT,
  category TEXT,
  image TEXT,
  members_count INTEGER DEFAULT 0, -- tenu à jour par trigger
  president_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.club_proposals(id) ON DELETE SET NULL,
  max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity >= 1),
  recruiting BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT, -- 'ios', 'android', 'web'
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membres d'un club. Le président y figure aussi (il compte comme membre).
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'bureau')),
  title TEXT CHECK (char_length(title) <= 40), -- intitulé libre du bureau (Trésorier…)
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, user_id)
);

-- Demandes d'adhésion. Nom et email sont copiés par la RPC à l'envoi : c'est
-- ce que voit le président.
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

CREATE TABLE IF NOT EXISTS public.club_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT CHECK (char_length(description) <= 2000),
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  location TEXT NOT NULL CHECK (char_length(btrim(location)) BETWEEN 1 AND 200),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.club_session_responses (
  session_id UUID NOT NULL REFERENCES public.club_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('going', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

-- ============================================
-- 2. REMISE À NIVEAU D'UNE BASE EXISTANTE
-- ============================================

-- Clés étrangères des premières versions, qui bloquaient la suppression d'un
-- compte. Sans effet si elles sont déjà correctes.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_author_id_fkey;
ALTER TABLE public.news
  ADD CONSTRAINT news_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.club_sessions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.club_sessions DROP CONSTRAINT IF EXISTS club_sessions_created_by_fkey;
ALTER TABLE public.club_sessions
  ADD CONSTRAINT club_sessions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Nom affiché : 80 caractères au plus. NOT VALID : seules les nouvelles
-- écritures sont vérifiées.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_name_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_length CHECK (char_length(name) <= 80) NOT VALID;

-- Galerie : jamais branchée dans l'app, tables restées vides.
DROP TABLE IF EXISTS public.gallery_images;
DROP TABLE IF EXISTS public.gallery_albums;

-- ============================================
-- 3. INDEX
-- ============================================
-- Les colonnes qui pointent vers auth.users sont indexées : la suppression
-- d'un compte les parcourt toutes.

CREATE INDEX IF NOT EXISTS event_registrations_user_id_idx ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS votes_user_id_idx ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS news_author_id_idx ON public.news(author_id);
CREATE INDEX IF NOT EXISTS club_proposals_user_id_idx ON public.club_proposals(user_id);
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS clubs_president_id_idx ON public.clubs(president_id);
CREATE INDEX IF NOT EXISTS clubs_proposal_id_idx ON public.clubs(proposal_id);
CREATE INDEX IF NOT EXISTS club_members_user_id_idx ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS club_join_requests_user_id_idx ON public.club_join_requests(user_id);
CREATE INDEX IF NOT EXISTS club_join_requests_handled_by_idx ON public.club_join_requests(handled_by);
CREATE INDEX IF NOT EXISTS club_join_requests_club_status_idx ON public.club_join_requests(club_id, status);
-- Une seule demande en attente par personne et par club.
CREATE UNIQUE INDEX IF NOT EXISTS club_join_requests_one_pending_idx
  ON public.club_join_requests(club_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS club_projects_club_id_idx ON public.club_projects(club_id);
CREATE INDEX IF NOT EXISTS club_projects_author_id_idx ON public.club_projects(author_id);
CREATE INDEX IF NOT EXISTS club_posts_club_id_idx ON public.club_posts(club_id);
CREATE INDEX IF NOT EXISTS club_posts_author_id_idx ON public.club_posts(author_id);
CREATE INDEX IF NOT EXISTS club_sessions_club_date_idx
  ON public.club_sessions(club_id, session_date, session_time);
CREATE INDEX IF NOT EXISTS club_sessions_created_by_idx ON public.club_sessions(created_by);
CREATE INDEX IF NOT EXISTS club_session_responses_user_idx ON public.club_session_responses(user_id);

-- ============================================
-- 4. FONCTIONS DE DROITS
-- ============================================
-- SECURITY DEFINER : elles lisent les tables sans passer par la RLS, ce qui
-- évite la récursion quand une politique interroge sa propre table.

CREATE OR REPLACE FUNCTION public.is_bde_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Ancien doublon de is_bde_admin().
DROP FUNCTION IF EXISTS public.is_profile_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_club_president(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = p_club_id AND president_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members WHERE club_id = p_club_id AND user_id = auth.uid()
  ) OR public.is_club_president(p_club_id);
$$;

-- Bureau au sens large : président, membres du bureau, admins BDE.
CREATE OR REPLACE FUNCTION public.is_club_manager(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_bde_admin()
      OR public.is_club_president(p_club_id)
      OR EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_id = p_club_id AND user_id = auth.uid() AND role = 'bureau'
      );
$$;

-- Adresses autorisées à créer un compte (même liste que RegisterScreen).
CREATE OR REPLACE FUNCTION public.is_allowed_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(btrim(p_email)) ~ '@(aivancity\.education|aivancity\.ai)$';
$$;

-- ============================================
-- 5. COMPTES
-- ============================================

-- Inscription réservée aux adresses de l'école, y compris pour qui appelle
-- l'API Supabase sans passer par l'app (la clé anon est dans l'APK). Un
-- changement d'email vers une autre adresse est refusé de la même façon ; les
-- comptes existants ne sont pas revérifiés. L'API répond alors « Database
-- error saving new user ».
CREATE OR REPLACE FUNCTION public.enforce_school_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NOT NULL AND NOT public.is_allowed_email(NEW.email) THEN
    RAISE EXCEPTION 'email_domain_not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_school_email ON auth.users;
CREATE TRIGGER enforce_school_email
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_email();

-- Profil créé à l'inscription. Le rôle est toujours 'user' : les métadonnées
-- envoyées par le client ne sont jamais crues. Nom vide : partie locale de
-- l'email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    left(
      COALESCE(
        NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(split_part(NEW.email, '@', 1), ''),
        'Utilisateur'
      ),
      80
    ),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comptes créés avant le trigger, ou dont le profil a disparu.
INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  left(
    COALESCE(
      NULLIF(btrim(u.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(u.email, '@', 1), ''),
      'Utilisateur'
    ),
    80
  ),
  'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Dernière barrière, indépendante des politiques : un compte connecté non
-- admin ne change jamais un rôle. Le SQL Editor et service_role
-- (auth.uid() IS NULL) restent autorisés.
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_bde_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier le rôle d''un profil'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_role_change ON public.profiles;
CREATE TRIGGER guard_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_change();

-- ============================================
-- 6. TRIGGERS MÉTIER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_polls_updated_at ON public.polls;
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_updated_at ON public.news;
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clubs_updated_at ON public.clubs;
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_club_proposals_updated_at ON public.club_proposals;
CREATE TRIGGER update_club_proposals_updated_at BEFORE UPDATE ON public.club_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --- Événements : inscriptions ---
-- Événement passé ou complet : refusé côté serveur (dates à l'heure de
-- Paris). Le verrou sur l'événement évite de dépasser la capacité quand deux
-- inscriptions arrivent en même temps.
CREATE OR REPLACE FUNCTION public.check_event_registration()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event public.events%ROWTYPE;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;
  IF v_event.date < (NOW() AT TIME ZONE 'Europe/Paris')::DATE THEN
    RAISE EXCEPTION 'event_past';
  END IF;
  IF COALESCE(v_event.max_participants, 0) > 0
     AND (SELECT count(*) FROM public.event_registrations WHERE event_id = NEW.event_id)
         >= v_event.max_participants THEN
    RAISE EXCEPTION 'event_full';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_registrations_check ON public.event_registrations;
CREATE TRIGGER event_registrations_check
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.check_event_registration();

-- current_participants = nombre réel d'inscriptions. L'app ne l'écrit plus ;
-- toute écriture sur events (admin compris) le ramène à la vraie valeur.
CREATE OR REPLACE FUNCTION public.sync_event_participants()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
BEGIN
  UPDATE public.events
  SET current_participants = (
    SELECT count(*) FROM public.event_registrations WHERE event_id = v_event_id
  )
  WHERE id = v_event_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS event_registrations_count_sync ON public.event_registrations;
CREATE TRIGGER event_registrations_count_sync
  AFTER INSERT OR DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_participants();

CREATE OR REPLACE FUNCTION public.enforce_event_participants()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.current_participants := (
    SELECT count(*) FROM public.event_registrations WHERE event_id = NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_participants_enforce ON public.events;
CREATE TRIGGER events_participants_enforce
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_participants();

-- --- Sondages : votes ---
-- Sondage clos (end_date passée, heure de Paris) ou option inexistante :
-- vote refusé.
CREATE OR REPLACE FUNCTION public.check_vote()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_poll public.polls%ROWTYPE;
BEGIN
  SELECT * INTO v_poll FROM public.polls WHERE id = NEW.poll_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poll_not_found';
  END IF;
  IF v_poll.end_date IS NOT NULL
     AND v_poll.end_date < (NOW() AT TIME ZONE 'Europe/Paris')::DATE THEN
    RAISE EXCEPTION 'poll_closed';
  END IF;
  IF jsonb_typeof(v_poll.options) <> 'array'
     OR NEW.option_index < 0
     OR NEW.option_index >= jsonb_array_length(v_poll.options) THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_check ON public.votes;
CREATE TRIGGER votes_check
  BEFORE INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.check_vote();

-- total_votes = nombre réel de votes, comme current_participants.
CREATE OR REPLACE FUNCTION public.sync_poll_total_votes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_poll_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.poll_id ELSE NEW.poll_id END;
BEGIN
  UPDATE public.polls
  SET total_votes = (SELECT count(*) FROM public.votes WHERE poll_id = v_poll_id)
  WHERE id = v_poll_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS votes_count_sync ON public.votes;
CREATE TRIGGER votes_count_sync
  AFTER INSERT OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_poll_total_votes();

CREATE OR REPLACE FUNCTION public.enforce_poll_total_votes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.total_votes := (SELECT count(*) FROM public.votes WHERE poll_id = NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS polls_total_votes_enforce ON public.polls;
CREATE TRIGGER polls_total_votes_enforce
  BEFORE INSERT OR UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.enforce_poll_total_votes();

-- --- Clubs : membres ---
-- members_count = nombre réel de lignes dans club_members.
CREATE OR REPLACE FUNCTION public.sync_club_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_club_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.club_id ELSE NEW.club_id END;
BEGIN
  UPDATE public.clubs
  SET members_count = (SELECT count(*) FROM public.club_members WHERE club_id = v_club_id)
  WHERE id = v_club_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS club_members_count_sync ON public.club_members;
CREATE TRIGGER club_members_count_sync
  AFTER INSERT OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_club_members_count();

CREATE OR REPLACE FUNCTION public.enforce_club_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.members_count := (SELECT count(*) FROM public.club_members WHERE club_id = NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clubs_members_count_enforce ON public.clubs;
CREATE TRIGGER clubs_members_count_enforce
  BEFORE INSERT OR UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_club_members_count();

-- --- Clubs : validation d'une proposition ---
-- L'écran admin crée le club puis passe la proposition à 'approved' (ou
-- l'inverse). Dans les deux ordres, le club est relié à la proposition de
-- même nom : son auteur devient président et premier membre, sa capacité
-- devient celle du club.
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

-- --- Clubs : contenus ---
-- Auteur des annonces et projets fixé côté serveur à l'insertion, puis figé
-- (ainsi que le club et la date de création), sauf sa remise à NULL par la
-- base quand le compte auteur est supprimé (ON DELETE SET NULL).
CREATE OR REPLACE FUNCTION public.set_club_content_author()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.author_id := auth.uid();
      NEW.author_name := (SELECT name FROM public.profiles WHERE id = auth.uid());
    END IF;
  ELSE
    NEW.club_id := OLD.club_id;
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

DROP TRIGGER IF EXISTS club_projects_author ON public.club_projects;
CREATE TRIGGER club_projects_author
  BEFORE INSERT OR UPDATE ON public.club_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_club_content_author();

DROP TRIGGER IF EXISTS club_posts_author ON public.club_posts;
CREATE TRIGGER club_posts_author
  BEFORE INSERT OR UPDATE ON public.club_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_club_content_author();

-- Sessions : même principe pour created_by.
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
    IF NEW.created_by IS NOT NULL THEN
      NEW.created_by := OLD.created_by;
    END IF;
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
SET search_path = ''
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
-- 7. POLITIQUES RLS
-- ============================================
-- Règle générale : le contenu publié par le BDE (événements, sondages,
-- actualités, clubs) est lisible par tous ; les données personnelles ne sont
-- lisibles que par leur propriétaire et les admins. auth.uid() et
-- is_bde_admin() sont écrits en sous-requête pour n'être évalués qu'une fois
-- par requête.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_session_responses ENABLE ROW LEVEL SECURITY;

-- Table rase : aucune politique ancienne ou créée à la main ne subsiste.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- --- Profils : chacun le sien, les admins tous ---
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_bde_admin()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Le rôle reste protégé par le trigger guard_profile_role_change.
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_bde_admin()))
  WITH CHECK (true);

-- --- Contenu du BDE : lecture pour tous, écriture par les admins ---
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert events" ON public.events
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE TO authenticated USING ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE TO authenticated USING ((SELECT public.is_bde_admin()));

CREATE POLICY "Polls are viewable by everyone" ON public.polls
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert polls" ON public.polls
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can update polls" ON public.polls
  FOR UPDATE TO authenticated USING ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can delete polls" ON public.polls
  FOR DELETE TO authenticated USING ((SELECT public.is_bde_admin()));

CREATE POLICY "News are viewable by everyone" ON public.news
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert news" ON public.news
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can update news" ON public.news
  FOR UPDATE TO authenticated USING ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can delete news" ON public.news
  FOR DELETE TO authenticated USING ((SELECT public.is_bde_admin()));

CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert clubs" ON public.clubs
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can update clubs" ON public.clubs
  FOR UPDATE TO authenticated USING ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can delete clubs" ON public.clubs
  FOR DELETE TO authenticated USING ((SELECT public.is_bde_admin()));

-- --- Inscriptions aux événements : chacun les siennes ---
-- Le nombre d'inscrits public est events.current_participants.
CREATE POLICY "Users can view own registrations" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_bde_admin()));
CREATE POLICY "Users can register to events" ON public.event_registrations
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can unregister from events" ON public.event_registrations
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- --- Votes ---
-- Les résultats passent par la RPC poll_results. La lecture de tous les votes
-- reste ouverte aux comptes connectés pour la version 1.1.0 de l'app, qui
-- compte les voix elle-même. Quand elle ne sera plus en circulation,
-- remplacer USING (true) par :
--   USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_bde_admin()))
CREATE POLICY "Votes are viewable by signed-in users" ON public.votes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote" ON public.votes
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- --- Propositions de clubs : l'auteur et les admins ---
CREATE POLICY "Users can view own proposals" ON public.club_proposals
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_bde_admin()));
-- Une proposition arrive toujours « en attente », sans note d'admin.
CREATE POLICY "Users can create proposals" ON public.club_proposals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending' AND admin_notes IS NULL);
CREATE POLICY "Admins can update proposals" ON public.club_proposals
  FOR UPDATE TO authenticated USING ((SELECT public.is_bde_admin()));
CREATE POLICY "Admins can delete proposals" ON public.club_proposals
  FOR DELETE TO authenticated USING ((SELECT public.is_bde_admin()));

-- --- Jetons push : chacun les siens, les admins les lisent tous (envoi) ---
CREATE POLICY "Users can view own push tokens" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_bde_admin()));
CREATE POLICY "Users can insert own push tokens" ON public.push_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own push tokens" ON public.push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own push tokens" ON public.push_tokens
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- --- Espace club ---
-- Écriture des membres et des demandes uniquement via les RPC.
CREATE POLICY "Club members are viewable by club members" ON public.club_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_club_member(club_id)
    OR (SELECT public.is_bde_admin())
  );

-- Un membre admis ne relit plus sa demande ; le président voit celles de son club.
CREATE POLICY "Join requests are viewable by requester and president" ON public.club_join_requests
  FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()) AND NOT public.is_club_member(club_id))
    OR public.is_club_president(club_id)
    OR (SELECT public.is_bde_admin())
  );
CREATE POLICY "Requesters can cancel pending requests" ON public.club_join_requests
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND NOT public.is_club_member(club_id)
  );

-- Projets, annonces, sessions : lus par les membres, écrits par le bureau.
CREATE POLICY "Club projects are viewable by club members" ON public.club_projects
  FOR SELECT TO authenticated
  USING (public.is_club_member(club_id) OR (SELECT public.is_bde_admin()));
CREATE POLICY "Club managers can insert projects" ON public.club_projects
  FOR INSERT TO authenticated WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY "Club managers can update projects" ON public.club_projects
  FOR UPDATE TO authenticated
  USING (public.is_club_manager(club_id))
  WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY "Club managers can delete projects" ON public.club_projects
  FOR DELETE TO authenticated USING (public.is_club_manager(club_id));

CREATE POLICY "Club posts are viewable by club members" ON public.club_posts
  FOR SELECT TO authenticated
  USING (public.is_club_member(club_id) OR (SELECT public.is_bde_admin()));
CREATE POLICY "Club managers can insert posts" ON public.club_posts
  FOR INSERT TO authenticated WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY "Club managers can update posts" ON public.club_posts
  FOR UPDATE TO authenticated
  USING (public.is_club_manager(club_id))
  WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY "Club managers can delete posts" ON public.club_posts
  FOR DELETE TO authenticated USING (public.is_club_manager(club_id));

CREATE POLICY "Club sessions are viewable by club members" ON public.club_sessions
  FOR SELECT TO authenticated
  USING (public.is_club_member(club_id) OR (SELECT public.is_bde_admin()));
CREATE POLICY "Club managers can insert sessions" ON public.club_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY "Club managers can update sessions" ON public.club_sessions
  FOR UPDATE TO authenticated
  USING (public.is_club_manager(club_id))
  WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY "Club managers can delete sessions" ON public.club_sessions
  FOR DELETE TO authenticated USING (public.is_club_manager(club_id));

-- Réponses aux sessions : lues par les membres, écrites via respond_club_session.
CREATE POLICY "Club session responses are viewable by club members" ON public.club_session_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_sessions s
      WHERE s.id = session_id
        AND (public.is_club_member(s.club_id) OR (SELECT public.is_bde_admin()))
    )
  );

-- ============================================
-- 8. STOCKAGE DES IMAGES (bucket public « images »)
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
CREATE POLICY "Admin upload access" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND (SELECT public.is_bde_admin()));

DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;
CREATE POLICY "Admin delete access" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images' AND (SELECT public.is_bde_admin()));

-- Un président envoie les photos de son club dans le dossier clubs/.
DROP POLICY IF EXISTS "Club presidents upload club images" ON storage.objects;
CREATE POLICY "Club presidents upload club images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'clubs'
    AND EXISTS (SELECT 1 FROM public.clubs WHERE president_id = (SELECT auth.uid()))
  );

-- ============================================
-- 9. RPC (appelées par l'app via supabase.rpc)
-- ============================================
-- Les erreurs métier sont levées avec un code court (ex. 'club_full') que
-- l'app traduit (src/services/clubService.js pour les clubs).

-- Suppression du compte connecté (Profil > Supprimer mon compte). Les
-- données liées suivent les clés étrangères : supprimées (profil,
-- inscriptions, votes, propositions, jetons, adhésions) ou détachées du
-- compte (actualités, contenus et sessions de club, présidence).
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

-- Résultats de tous les sondages : nombre de voix par option, sans dire qui
-- a voté quoi.
CREATE OR REPLACE FUNCTION public.poll_results()
RETURNS TABLE (poll_id UUID, option_index INTEGER, votes BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT v.poll_id, v.option_index, count(*)
  FROM public.votes v
  GROUP BY v.poll_id, v.option_index;
$$;

-- Enregistre le jeton push de l'appareil pour le compte connecté. Un jeton
-- déjà connu (autre compte sur le même téléphone) change de propriétaire :
-- la RLS empêcherait sinon de le reprendre.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_device_type TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NULLIF(btrim(p_token), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  INSERT INTO public.push_tokens (user_id, token, device_type, enabled)
  VALUES (auth.uid(), p_token, p_device_type, true)
  ON CONFLICT (token) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      device_type = EXCLUDED.device_type,
      enabled = true;
END;
$$;

-- --- Espace club ---

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
CREATE OR REPLACE FUNCTION public.respond_club_session(p_session_id UUID, p_response TEXT)
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

  SELECT club_id INTO v_club_id FROM public.club_sessions WHERE id = p_session_id;
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
-- 10. DROITS D'EXÉCUTION
-- ============================================
-- Une fonction est exécutable par tous par défaut, et Supabase l'ouvre en
-- plus à anon. On ferme tout, puis on ouvre aux comptes connectés ce que
-- l'app appelle et ce que les politiques utilisent. Les fonctions de trigger
-- n'ont pas besoin de ce droit.

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'is_allowed_email(text)',
    'enforce_school_email()',
    'handle_new_user()',
    'guard_profile_role_change()',
    'update_updated_at_column()',
    'check_event_registration()',
    'sync_event_participants()',
    'enforce_event_participants()',
    'check_vote()',
    'sync_poll_total_votes()',
    'enforce_poll_total_votes()',
    'sync_club_members_count()',
    'enforce_club_members_count()',
    'link_club_to_proposal(uuid, uuid)',
    'link_approved_proposal()',
    'set_club_content_author()',
    'set_club_session_metadata()',
    'set_club_project_completed_at()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;

  FOREACH fn IN ARRAY ARRAY[
    'is_bde_admin()',
    'is_club_president(uuid)',
    'is_club_member(uuid)',
    'is_club_manager(uuid)',
    'delete_user()',
    'poll_results()',
    'register_push_token(text, text)',
    'request_club_join(uuid, text)',
    'respond_club_join(uuid, boolean)',
    'respond_club_session(uuid, text)',
    'leave_club(uuid)',
    'remove_club_member(uuid, uuid)',
    'set_club_member_role(uuid, uuid, text, text)',
    'transfer_club_presidency(uuid, uuid)',
    'admin_set_club_president(uuid, text)',
    'update_club_info(uuid, text, text, text, text, integer, boolean)',
    'club_member_list(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END;
$$;

-- ============================================
-- 11. COMPTEURS RECALCULÉS
-- ============================================
-- Les triggers BEFORE UPDATE posent la vraie valeur ; seules les lignes
-- fausses sont touchées.

UPDATE public.events e
SET current_participants = sub.n
FROM (
  SELECT ev.id, (SELECT count(*) FROM public.event_registrations r WHERE r.event_id = ev.id) AS n
  FROM public.events ev
) sub
WHERE e.id = sub.id AND e.current_participants IS DISTINCT FROM sub.n;

UPDATE public.polls p
SET total_votes = sub.n
FROM (
  SELECT po.id, (SELECT count(*) FROM public.votes v WHERE v.poll_id = po.id) AS n
  FROM public.polls po
) sub
WHERE p.id = sub.id AND p.total_votes IS DISTINCT FROM sub.n;

UPDATE public.clubs c
SET members_count = sub.n
FROM (
  SELECT cl.id, (SELECT count(*) FROM public.club_members m WHERE m.club_id = cl.id) AS n
  FROM public.clubs cl
) sub
WHERE c.id = sub.id AND c.members_count IS DISTINCT FROM sub.n;

COMMIT;
