-- ============================================
-- SÉCURISATION DU RÔLE ADMINISTRATEUR
-- À exécuter dans Supabase > SQL Editor, après database/schema.sql.
-- Idempotent : peut être relancé sans modifier les rôles existants.
-- ============================================

BEGIN;

-- Ne jamais faire confiance aux métadonnées fournies par le client à
-- l'inscription : tout nouveau profil commence avec le rôle "user".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Utilisateur'),
    'user'
  );
  RETURN NEW;
END;
$$;

-- Cette fonction SECURITY DEFINER évite une récursion RLS lorsqu'une politique
-- de profiles doit vérifier le rôle du compte connecté.
CREATE OR REPLACE FUNCTION public.is_profile_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;

-- La politique existante permet toujours à chacun de modifier les champs de
-- son propre profil. Celle-ci permet en plus à un admin de promouvoir ou
-- rétrograder un autre compte.
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (true);

-- Dernière barrière, indépendante de la politique ayant autorisé l'UPDATE :
-- un appel authentifié non admin ne peut jamais changer un rôle. Les appels
-- privilégiés du SQL Editor / service_role ont auth.uid() IS NULL.
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_profile_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier le rôle d''un profil'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_role_change ON public.profiles;
CREATE TRIGGER guard_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_change();

COMMIT;
