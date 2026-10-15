// Banc de test de database/schema.sql dans PGlite (Postgres en WASM), avec
// des imitations minimales de Supabase : rôles anon / authenticated,
// auth.users, auth.uid(), storage.
//
// À lancer HORS du projet (installer un paquet dans le projet ferait planter
// les Metro en cours) :
//   mkdir %TEMP%\pglite-bench && cd %TEMP%\pglite-bench
//   npm init -y && npm install @electric-sql/pglite@0.3
//   node "<chemin du projet>\database\tests\schema.test.mjs"
//
// Trois scénarios :
// 1. installation neuve, schéma joué deux fois (il doit être rejouable) ;
// 2. remise à niveau d'une base 1.1.0 (anciens scripts récupérés par git au
//    commit 6fbadfe), avec des compteurs faux et un compte hors domaine ;
// 3. database/nettoyage_lancement.sql sur la base du scénario 2.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(join(process.cwd(), 'bench.js'));
const { PGlite } = require('@electric-sql/pglite');

const DB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const readSql = (file) => readFileSync(join(DB_DIR, file), 'utf8');
const sqlFromGit = (rev, file) =>
  execFileSync('git', ['show', `${rev}:database/${file}`], { cwd: DB_DIR, encoding: 'utf8' });

// Version 1.1.0 : base telle qu'elle était en production.
const V110 = '6fbadfe';
const V110_SCRIPTS = [
  'schema.sql',
  'delete_user.sql',
  'fix_admin_role.sql',
  'clubs_espace.sql',
  'club_sessions.sql',
  'fix_club_authors.sql',
];

const SUPABASE_STUBS = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    email_confirmed_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
    $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;

  CREATE SCHEMA storage;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN);
  CREATE TABLE storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT,
    name TEXT,
    owner UUID
  );
  GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS
    $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`;

// ---------- Outils ----------

const q = async (db, sql, params = []) => (await db.query(sql, params)).rows;

// Requête jouée comme un compte connecté (uid) ou un visiteur (uid = null),
// avec la RLS active comme sur Supabase.
const as = (db, uid, sql, params = []) =>
  db.transaction(async (tx) => {
    if (uid) {
      await tx.exec('SET LOCAL ROLE authenticated');
      await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    } else {
      await tx.exec('SET LOCAL ROLE anon');
    }
    return (await tx.query(sql, params)).rows;
  });

const rejects = (promise, pattern) =>
  assert.rejects(promise, (error) => {
    assert.match(error.message, pattern);
    return true;
  });

const signup = async (db, email, meta = {}) =>
  (await q(db, 'INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, $2) RETURNING id', [email, meta]))[0].id;

const makeAdmin = (db, uid) => q(db, `UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [uid]);

let checks = 0;
const ok = (label) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const newDb = async () => {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  return db;
};

// ---------- Comportements attendus du schéma ----------

async function checkSchema(db, prefix) {
  const mail = (name) => `${prefix}.${name}@aivancity.education`;

  // Inscription
  const alice = await signup(db, mail('alice'), { name: '  Alice Martin  ', role: 'admin' });
  assert.deepEqual(
    (await q(db, 'SELECT name, role FROM public.profiles WHERE id = $1', [alice]))[0],
    { name: 'Alice Martin', role: 'user' },
  );
  ok('inscription : profil créé, nom nettoyé, rôle « admin » des métadonnées ignoré');

  const bob = await signup(db, `${prefix}.Bob@AIVANCITY.AI`);
  assert.equal((await q(db, 'SELECT name FROM public.profiles WHERE id = $1', [bob]))[0].name, `${prefix}.Bob`);
  ok('inscription sans nom : partie locale de l’email, domaine en majuscules accepté');

  const long = await signup(db, mail('long'), { name: 'x'.repeat(200) });
  assert.equal((await q(db, 'SELECT char_length(name) AS n FROM public.profiles WHERE id = $1', [long]))[0].n, 80);
  ok('nom tronqué à 80 caractères');

  await rejects(signup(db, `${prefix}.eve@gmail.com`), /email_domain_not_allowed/);
  await rejects(q(db, `UPDATE auth.users SET email = 'x@gmail.com' WHERE id = $1`, [alice]), /email_domain_not_allowed/);
  ok('adresse hors domaine refusée à l’inscription et au changement d’email');

  const admin = await signup(db, mail('admin'));
  await makeAdmin(db, admin);

  // Profils et rôles
  await rejects(as(db, alice, `UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [alice]), /Seul un administrateur/);
  await as(db, admin, `UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [long]);
  await as(db, admin, `UPDATE public.profiles SET role = 'user' WHERE id = $1`, [long]);
  ok('rôle : refusé à un utilisateur, permis à un admin');

  assert.equal((await as(db, alice, 'SELECT id FROM public.profiles')).length, 1);
  assert.equal((await as(db, null, 'SELECT id FROM public.profiles')).length, 0);
  assert.ok((await as(db, admin, 'SELECT id FROM public.profiles')).length >= 4);
  ok('profils : chacun le sien, rien pour un visiteur, tous pour un admin');

  // Événements
  const insertEvent = (offsetDays, max) =>
    as(
      db,
      admin,
      `INSERT INTO public.events (title, description, date, time, location, max_participants, current_participants)
       VALUES ('Soirée', 'd', CURRENT_DATE + $1::INT, '20:00', 'Paris', $2, 42) RETURNING id, current_participants`,
      [offsetDays, max],
    ).then((rows) => rows[0]);

  const small = await insertEvent(7, 1);
  assert.equal(small.current_participants, 0);
  const big = await insertEvent(7, 0);
  const past = await insertEvent(-3, 0);
  ok('événement : compteur saisi ignoré (0 à la création)');

  const register = (uid, eventId, userId = uid) =>
    as(db, uid, 'INSERT INTO public.event_registrations (event_id, user_id) VALUES ($1, $2)', [eventId, userId]);
  const participants = async (id) =>
    (await q(db, 'SELECT current_participants AS n FROM public.events WHERE id = $1', [id]))[0].n;

  await register(alice, small.id);
  assert.equal(await participants(small.id), 1);
  await rejects(register(bob, small.id), /event_full/);
  await rejects(register(bob, past.id), /event_past/);
  await rejects(register(bob, big.id, alice), /row-level security/);
  await register(bob, big.id);
  await register(alice, big.id);
  assert.equal(await participants(big.id), 2);
  ok('inscriptions : compteur tenu par la base, complet / passé / pour autrui refusés');

  assert.equal((await as(db, null, 'SELECT id FROM public.event_registrations')).length, 0);
  assert.equal((await as(db, bob, 'SELECT id FROM public.event_registrations')).length, 1);
  assert.equal(
    (await as(db, admin, 'SELECT id FROM public.event_registrations')).length,
    (await q(db, 'SELECT id FROM public.event_registrations')).length,
  );
  ok('inscriptions : visibles seulement par leur auteur et les admins');

  await as(db, admin, 'UPDATE public.events SET current_participants = 99, title = $2 WHERE id = $1', [big.id, 'Soirée !']);
  assert.equal(await participants(big.id), 2);
  await as(db, alice, 'DELETE FROM public.event_registrations WHERE event_id = $1', [big.id]);
  assert.equal(await participants(big.id), 1);
  ok('événements : modification admin et désinscription gardent le vrai compte');

  // Sondages
  const insertPoll = (endDate) =>
    as(
      db,
      admin,
      `INSERT INTO public.polls (question, options, end_date, total_votes)
       VALUES ('Content ?', '["Oui", "Non", "Un peu"]', $1, 5) RETURNING id, total_votes`,
      [endDate],
    ).then((rows) => rows[0]);

  const poll = await insertPoll(null);
  const closed = await insertPoll('2020-01-01');
  assert.equal(poll.total_votes, 0);

  const vote = (uid, pollId, index) =>
    as(db, uid, 'INSERT INTO public.votes (poll_id, user_id, option_index) VALUES ($1, $2, $3)', [pollId, uid, index]);
  await vote(alice, poll.id, 2);
  await vote(bob, poll.id, 0);
  await rejects(vote(admin, poll.id, 3), /invalid_option/);
  await rejects(vote(admin, closed.id, 0), /poll_closed/);
  await rejects(vote(alice, poll.id, 1), /duplicate key/);
  assert.equal((await q(db, 'SELECT total_votes FROM public.polls WHERE id = $1', [poll.id]))[0].total_votes, 2);
  ok('votes : total tenu par la base, option invalide / sondage clos / double vote refusés');

  const results = await as(
    db,
    bob,
    'SELECT option_index, votes FROM public.poll_results() WHERE poll_id = $1 ORDER BY option_index',
    [poll.id],
  );
  assert.deepEqual(
    results.map((r) => [r.option_index, Number(r.votes)]),
    [[0, 1], [2, 1]],
  );
  await rejects(as(db, null, 'SELECT * FROM public.poll_results()'), /permission denied/);
  assert.equal((await as(db, null, 'SELECT id FROM public.votes')).length, 0);
  ok('résultats : poll_results pour les comptes connectés, votes invisibles aux visiteurs');

  // Jetons push
  const token = `ExponentPushToken[${prefix}]`;
  await as(db, alice, 'SELECT public.register_push_token($1, $2)', [token, 'android']);
  await as(db, bob, 'SELECT public.register_push_token($1, $2)', [token, 'android']);
  assert.equal((await as(db, alice, 'SELECT id FROM public.push_tokens')).length, 0);
  assert.equal((await as(db, bob, 'SELECT user_id FROM public.push_tokens'))[0].user_id, bob);
  ok('jeton push : repris par le compte qui se connecte sur le même téléphone');

  // Propositions et clubs
  const propose = (status) =>
    as(
      db,
      alice,
      `INSERT INTO public.club_proposals
         (user_id, club_name, objective, president_name, president_email, max_capacity, event_ideas, status)
       VALUES ($1, $2, 'o', 'Alice', 'a@x', 12, 'e', $3) RETURNING id`,
      [alice, `Club ${prefix}`, status],
    );
  await rejects(propose('approved'), /row-level security/);
  const [proposal] = await propose('pending');
  ok('proposition : impossible de s’auto-approuver');

  await as(db, admin, `UPDATE public.club_proposals SET status = 'approved' WHERE id = $1`, [proposal.id]);
  const [club] = await as(
    db,
    admin,
    `INSERT INTO public.clubs (name, description, members_count) VALUES ($1, 'd', 50) RETURNING id`,
    [`club ${prefix}`],
  );
  let clubRow = (await q(db, 'SELECT president_id, members_count, max_capacity FROM public.clubs WHERE id = $1', [club.id]))[0];
  assert.deepEqual(clubRow, { president_id: alice, members_count: 1, max_capacity: 12 });
  ok('validation : le club est relié à la proposition, l’auteur devient président');

  const [request] = await as(db, bob, 'SELECT id FROM public.request_club_join($1, $2)', [club.id, 'Salut']);
  await rejects(as(db, bob, 'SELECT public.respond_club_join($1, true)', [request.id]), /not_allowed/);
  await as(db, alice, 'SELECT public.respond_club_join($1, true)', [request.id]);
  assert.equal((await q(db, 'SELECT members_count FROM public.clubs WHERE id = $1', [club.id]))[0].members_count, 2);
  ok('adhésion : acceptée par le président, compteur à jour');

  const [session] = await as(
    db,
    alice,
    `INSERT INTO public.club_sessions (club_id, title, session_date, session_time, location)
     VALUES ($1, 'Atelier', CURRENT_DATE + 2, '18:00', 'B12') RETURNING id, created_by`,
    [club.id],
  );
  assert.equal(session.created_by, alice);
  await as(db, bob, 'SELECT public.respond_club_session($1, $2)', [session.id, 'going']);
  await as(db, alice, 'INSERT INTO public.club_posts (club_id, content) VALUES ($1, $2)', [club.id, 'Bienvenue']);
  await rejects(as(db, bob, 'INSERT INTO public.club_posts (club_id, content) VALUES ($1, $2)', [club.id, 'x']), /row-level security/);
  assert.equal((await as(db, bob, 'SELECT id FROM public.club_posts WHERE club_id = $1', [club.id])).length, 1);
  assert.equal((await as(db, admin, 'SELECT id FROM public.club_posts WHERE club_id = $1', [club.id])).length, 1);
  assert.equal((await as(db, long, 'SELECT id FROM public.club_posts WHERE club_id = $1', [club.id])).length, 0);
  ok('espace club : bureau publie, membres lisent, non-membres ne voient rien');

  const members = await as(db, bob, 'SELECT name, email FROM public.club_member_list($1)', [club.id]);
  assert.equal(members.length, 2);
  assert.ok(members.every((m) => m.email === null));
  assert.ok((await as(db, alice, 'SELECT email FROM public.club_member_list($1)', [club.id])).every((m) => m.email));
  ok('liste des membres : emails réservés au président');

  // Stockage
  const upload = (uid, name) =>
    as(db, uid, `INSERT INTO storage.objects (bucket_id, name) VALUES ('images', $1)`, [name]);
  await upload(admin, 'events/a.jpg');
  await upload(alice, 'clubs/b.jpg');
  await rejects(upload(alice, 'events/c.jpg'), /row-level security/);
  await rejects(upload(bob, 'clubs/d.jpg'), /row-level security/);
  ok('stockage : admins partout, présidents dans clubs/, les autres nulle part');

  // Suppression de compte
  await rejects(as(db, null, 'SELECT public.delete_user()'), /permission denied/);
  await as(db, alice, 'SELECT public.delete_user()');
  clubRow = (await q(db, 'SELECT president_id, members_count FROM public.clubs WHERE id = $1', [club.id]))[0];
  assert.deepEqual(clubRow, { president_id: null, members_count: 1 });
  assert.equal((await q(db, 'SELECT created_by FROM public.club_sessions WHERE id = $1', [session.id]))[0].created_by, null);
  assert.equal((await q(db, 'SELECT count(*)::INT AS n FROM public.club_posts WHERE club_id = $1 AND author_id IS NULL', [club.id]))[0].n, 1);
  assert.equal((await q(db, 'SELECT count(*)::INT AS n FROM public.profiles WHERE id = $1', [alice]))[0].n, 0);
  assert.equal(await participants(small.id), 0);
  assert.equal((await q(db, 'SELECT total_votes FROM public.polls WHERE id = $1', [poll.id]))[0].total_votes, 1);
  await as(db, bob, 'SELECT public.delete_user()');
  ok('suppression de compte (présidente de club, autrice de contenus) : compteurs et liens à jour');
}

async function checkStructure(db) {
  const policies = await q(db, `SELECT count(*)::INT AS n FROM pg_policies WHERE schemaname = 'public'`);
  assert.equal(policies[0].n, 48);
  const leftovers = await q(
    db,
    `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'is_profile_admin'
     UNION ALL SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'gallery%'`,
  );
  assert.deepEqual(leftovers, []);
  ok('structure : 48 politiques, ni is_profile_admin ni tables de galerie');
}

// ---------- Scénarios ----------

async function freshInstall() {
  console.log('\n1. Installation neuve');
  const db = await newDb();
  await db.exec(readSql('schema.sql'));
  await db.exec(readSql('schema.sql'));
  ok('schema.sql joué deux fois sans erreur');
  await checkStructure(db);
  await checkSchema(db, 'neuf');
  await db.close();
}

async function upgradeFromV110() {
  console.log(`\n2. Remise à niveau d'une base 1.1.0 (${V110})`);
  const db = await newDb();
  for (const file of V110_SCRIPTS) await db.exec(sqlFromGit(V110, file));

  // Données comme en prod : compteurs faux, compte hors domaine, compte sans profil.
  const gmail = await signup(db, 'ancien.admin@gmail.com', { name: 'Ancien' });
  const user = await signup(db, 'etudiant@aivancity.education');
  const orphan = await signup(db, 'sans.profil@aivancity.ai');
  await q(db, 'DELETE FROM public.profiles WHERE id = $1', [orphan]);
  const [event] = await q(
    db,
    `INSERT INTO public.events (title, description, date, time, location) VALUES ('Test', 'd', '2002-02-01', '10:00', 'x') RETURNING id`,
  );
  await q(db, 'INSERT INTO public.event_registrations (event_id, user_id) VALUES ($1, $2), ($1, $3)', [event.id, gmail, user]);
  const [poll] = await q(db, `INSERT INTO public.polls (question, options) VALUES ('q', '["a", "b"]') RETURNING id`);
  await q(db, 'INSERT INTO public.votes (poll_id, user_id, option_index) VALUES ($1, $2, 0), ($1, $3, 1)', [poll.id, gmail, user]);
  await q(db, `UPDATE public.polls SET total_votes = 1`);
  await q(db, 'INSERT INTO public.push_tokens (user_id, token) VALUES ($1, $2)', [user, 'ExponentPushToken[prod]']);

  await db.exec(readSql('schema.sql'));
  await db.exec(readSql('schema.sql'));
  ok('schema.sql appliqué deux fois sur la base 1.1.0');

  assert.equal((await q(db, 'SELECT current_participants AS n FROM public.events'))[0].n, 2);
  assert.equal((await q(db, 'SELECT total_votes AS n FROM public.polls'))[0].n, 2);
  ok('compteurs faux recalculés');
  assert.equal((await q(db, 'SELECT count(*)::INT AS n FROM public.profiles WHERE id = $1', [orphan]))[0].n, 1);
  ok('profil recréé pour le compte qui n’en avait pas');
  await q(db, 'UPDATE auth.users SET last_sign_in_at = NOW(), email = email WHERE id = $1', [gmail]);
  ok('compte existant hors domaine : la connexion n’est pas bloquée');

  await checkStructure(db);
  await checkSchema(db, 'maj');
  return db;
}

async function launchCleanup(db) {
  console.log('\n3. Nettoyage de lancement');
  const profilesBefore = (await q(db, 'SELECT count(*)::INT AS n FROM public.profiles'))[0].n;
  const tokensBefore = (await q(db, 'SELECT count(*)::INT AS n FROM public.push_tokens'))[0].n;
  await db.exec(readSql('nettoyage_lancement.sql'));

  const count = async (table) => (await q(db, `SELECT count(*)::INT AS n FROM public.${table}`))[0].n;
  for (const table of ['events', 'event_registrations', 'votes', 'clubs', 'club_members', 'club_proposals', 'club_sessions']) {
    assert.equal(await count(table), 0, table);
  }
  assert.equal(await count('profiles'), profilesBefore);
  assert.equal(await count('push_tokens'), tokensBefore);
  ok('contenu de test supprimé, profils et jetons push conservés');

  const [poll] = await q(db, 'SELECT question, options, total_votes FROM public.polls');
  assert.deepEqual(poll, {
    question: "Est-ce que vous êtes content de l'application ?",
    options: ['Oui', 'Non', 'Un peu'],
    total_votes: 0,
  });
  const news = await q(db, 'SELECT title, category FROM public.news');
  assert.deepEqual(news, [{ title: "Retour sur le Week-end d'intégration", category: 'Événement' }]);
  ok('sondage et actualité publiés');
  await db.close();
}

await freshInstall();
await launchCleanup(await upgradeFromV110());
console.log(`\n${checks} vérifications réussies.`);
