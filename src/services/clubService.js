import { supabase } from '../config/supabase';

/**
 * Accès aux données des clubs : liste publique, adhésions, espace privé
 * (annonces, projets, membres, demandes) et réglages du président.
 *
 * Les écritures sensibles passent par les RPC de database/clubs_espace.sql,
 * qui vérifient les droits de l'appelant. Les erreurs métier y sont levées
 * avec un code court (ex. 'club_full'), traduit par clubErrorMessage.
 * Chaque fonction lève l'erreur Supabase en cas d'échec.
 */

const RPC_ERROR_CODES = [
  'not_authenticated',
  'not_allowed',
  'club_not_found',
  'already_member',
  'request_pending',
  'recruiting_closed',
  'club_full',
  'message_too_long',
  'request_not_found',
  'request_already_handled',
  'president_cannot_leave',
  'not_member',
  'cannot_remove_president',
  'invalid_role',
  'user_not_found',
  'description_required',
  'capacity_too_low',
  'capacity_below_members',
  'invalid_response',
  'session_not_found',
];

// Table, colonne, relation ou fonction absente : la migration
// database/clubs_espace.sql n'a pas encore été exécutée sur Supabase.
const MISSING_SCHEMA_CODES = ['PGRST200', 'PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'];

export const MAX_JOIN_MESSAGE = 500;
export const MIN_CLUB_CAPACITY = 10;

/**
 * Message lisible pour une erreur renvoyée par Supabase.
 */
export function clubErrorMessage(error, t) {
  const message = error?.message ?? '';
  if (RPC_ERROR_CODES.includes(message)) return t(`clubSpace.errors.${message}`);
  if (MISSING_SCHEMA_CODES.includes(error?.code)) return t('clubSpace.errors.setupMissing');
  return t('errors.generic');
}

/**
 * Nombre de membres à atteindre le premier mois selon la charte (3/4 de la
 * capacité maximale).
 */
export const charterGoal = (maxCapacity) => (maxCapacity ? Math.ceil(maxCapacity * 0.75) : null);

/**
 * Liste des images d'un champ image (URL simple ou tableau JSON d'URLs).
 */
export function parseClubImages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // pas du JSON : URL simple
  }
  return [value];
}

/**
 * Ligne de la table clubs -> objet club utilisé par les écrans.
 */
export function formatClub(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contact: row.contact,
    president: row.president,
    presidentId: row.president_id ?? null,
    category: row.category || 'Autre',
    image: row.image,
    members: row.members_count || 0,
    maxCapacity: row.max_capacity ?? null,
    recruiting: row.recruiting !== false,
  };
}

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

export async function fetchClubs() {
  const { data, error } = await supabase.from('clubs').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(formatClub);
}

export async function fetchClub(clubId) {
  const { data, error } = await supabase.from('clubs').select('*').eq('id', clubId).maybeSingle();
  if (error) throw error;
  return data ? formatClub(data) : null;
}

/**
 * Président : met à jour les infos publiques de son club (le nom reste géré
 * par le BDE). Renvoie le club à jour.
 */
export async function updateClubInfo(clubId, { description, contact, category, images, maxCapacity, recruiting }) {
  const { data, error } = await supabase.rpc('update_club_info', {
    p_club_id: clubId,
    p_description: description,
    p_contact: contact,
    p_category: category,
    p_image: JSON.stringify(images || []),
    p_max_capacity: maxCapacity,
    p_recruiting: recruiting,
  });
  if (error) throw error;
  return formatClub(data);
}

/**
 * Admin : désigne le président d'un club par l'email de son compte.
 */
export async function adminSetPresident(clubId, email) {
  const { data, error } = await supabase.rpc('admin_set_club_president', {
    p_club_id: clubId,
    p_email: email,
  });
  if (error) throw error;
  return formatClub(data);
}

// ---------------------------------------------------------------------------
// Adhésions de l'utilisateur connecté
// ---------------------------------------------------------------------------

export const EMPTY_CLUB_STATE = {
  myClubs: [], // clubs dont on est membre (président en premier), avec role/title/isPresident
  pendingRequests: {}, // club_id -> demande envoyée en attente
  pendingForPresident: {}, // club_id -> nombre de demandes à traiter (clubs présidés)
};

export async function fetchMyClubState(userId) {
  const [members, requests] = await Promise.all([
    supabase.from('club_members').select('role, title, joined_at, club:clubs(*)').eq('user_id', userId),
    supabase.from('club_join_requests').select('id, club_id, created_at').eq('user_id', userId).eq('status', 'pending'),
  ]);
  if (members.error) throw members.error;
  if (requests.error) throw requests.error;

  const myClubs = (members.data || [])
    .filter((m) => m.club)
    .map((m) => ({
      ...formatClub(m.club),
      role: m.role,
      title: m.title,
      joinedAt: m.joined_at,
      isPresident: m.club.president_id === userId,
    }))
    .sort((a, b) => Number(b.isPresident) - Number(a.isPresident) || a.name.localeCompare(b.name));

  const pendingForPresident = {};
  const presidentClubIds = myClubs.filter((c) => c.isPresident).map((c) => c.id);
  if (presidentClubIds.length > 0) {
    const { data, error } = await supabase
      .from('club_join_requests')
      .select('club_id')
      .eq('status', 'pending')
      .in('club_id', presidentClubIds);
    if (error) throw error;
    (data || []).forEach((r) => {
      pendingForPresident[r.club_id] = (pendingForPresident[r.club_id] || 0) + 1;
    });
  }

  const pendingRequests = {};
  (requests.data || []).forEach((r) => {
    pendingRequests[r.club_id] = r;
  });

  return { myClubs, pendingRequests, pendingForPresident };
}

export async function requestJoin(clubId, message) {
  const { data, error } = await supabase.rpc('request_club_join', {
    p_club_id: clubId,
    p_message: message?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function cancelJoinRequest(requestId) {
  const { error } = await supabase.from('club_join_requests').delete().eq('id', requestId);
  if (error) throw error;
}

export async function leaveClub(clubId) {
  const { error } = await supabase.rpc('leave_club', { p_club_id: clubId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Demandes d'adhésion (président)
// ---------------------------------------------------------------------------

/**
 * @param {'pending'|'handled'} which - demandes en attente (les plus anciennes
 * d'abord) ou déjà traitées (les plus récentes d'abord)
 */
export async function fetchJoinRequests(clubId, which = 'pending') {
  let query = supabase.from('club_join_requests').select('*').eq('club_id', clubId);
  query =
    which === 'pending'
      ? query.eq('status', 'pending').order('created_at', { ascending: true })
      : query.neq('status', 'pending').order('handled_at', { ascending: false }).limit(50);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function respondJoinRequest(requestId, accept) {
  const { data, error } = await supabase.rpc('respond_club_join', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Membres
// ---------------------------------------------------------------------------

/**
 * Membres du club (président, puis bureau, puis par ancienneté). L'email
 * n'est renseigné que pour le président et les admins.
 */
export async function fetchMembers(clubId) {
  const { data, error } = await supabase.rpc('club_member_list', { p_club_id: clubId });
  if (error) throw error;
  return (data || []).map((m) => ({
    userId: m.user_id,
    name: m.name,
    email: m.email,
    role: m.role,
    title: m.title,
    isPresident: m.is_president,
    joinedAt: m.joined_at,
  }));
}

export async function setMemberRole(clubId, userId, role, title = null) {
  const { error } = await supabase.rpc('set_club_member_role', {
    p_club_id: clubId,
    p_user_id: userId,
    p_role: role,
    p_title: title,
  });
  if (error) throw error;
}

export async function removeMember(clubId, userId) {
  const { error } = await supabase.rpc('remove_club_member', { p_club_id: clubId, p_user_id: userId });
  if (error) throw error;
}

export async function transferPresidency(clubId, userId) {
  const { data, error } = await supabase.rpc('transfer_club_presidency', {
    p_club_id: clubId,
    p_new_president: userId,
  });
  if (error) throw error;
  return formatClub(data);
}

// ---------------------------------------------------------------------------
// Annonces
// ---------------------------------------------------------------------------

export async function fetchPosts(clubId) {
  const { data, error } = await supabase
    .from('club_posts')
    .select('*')
    .eq('club_id', clubId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function createPost(clubId, content) {
  const { data, error } = await supabase
    .from('club_posts')
    .insert({ club_id: clubId, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setPostPinned(postId, pinned) {
  const { error } = await supabase.from('club_posts').update({ pinned }).eq('id', postId);
  if (error) throw error;
}

export async function deletePost(postId) {
  const { error } = await supabase.from('club_posts').delete().eq('id', postId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Projets et idées
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = ['idea', 'in_progress', 'done'];

export async function fetchProjects(clubId) {
  const { data, error } = await supabase
    .from('club_projects')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createProject(clubId, { title, description, status = 'idea' }) {
  const { data, error } = await supabase
    .from('club_projects')
    .insert({ club_id: clubId, title: title.trim(), description: description?.trim() || null, status })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(projectId, { title, description, status }) {
  const { error } = await supabase
    .from('club_projects')
    .update({ title: title.trim(), description: description?.trim() || null, status })
    .eq('id', projectId);
  if (error) throw error;
}

export async function deleteProject(projectId) {
  const { error } = await supabase.from('club_projects').delete().eq('id', projectId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Sessions du club
// ---------------------------------------------------------------------------

export async function fetchClubSessions(clubId) {
  const { data, error } = await supabase
    .from('club_sessions')
    .select('*, responses:club_session_responses(user_id, response)')
    .eq('club_id', clubId)
    .order('session_date', { ascending: true })
    .order('session_time', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createClubSession(clubId, fields) {
  const { data, error } = await supabase
    .from('club_sessions')
    .insert({
      club_id: clubId,
      title: fields.title.trim(),
      description: fields.description?.trim() || null,
      session_date: fields.date,
      session_time: fields.time,
      location: fields.location.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClubSession(sessionId, fields) {
  const { error } = await supabase
    .from('club_sessions')
    .update({
      title: fields.title.trim(),
      description: fields.description?.trim() || null,
      session_date: fields.date,
      session_time: fields.time,
      location: fields.location.trim(),
    })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function deleteClubSession(sessionId) {
  const { error } = await supabase.from('club_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function respondClubSession(sessionId, response) {
  const { data, error } = await supabase.rpc('respond_club_session', {
    p_session_id: sessionId,
    p_response: response,
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Rapport mensuel (charte : effectif, liste des membres, activités du mois)
// ---------------------------------------------------------------------------

/**
 * Prépare le rapport mensuel à envoyer au BDE, sous forme de texte.
 * @returns {{ subject: string, body: string }}
 */
export function buildMonthlyReport({
  club,
  members,
  projects,
  posts,
  sessions = [],
  t,
  language,
  now = new Date(),
}) {
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = (value) => value && new Date(value) >= monthStart;
  const monthLabel = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const president = members.find((m) => m.isPresident);
  const roleLabel = (m) => {
    if (m.isPresident) return t('clubSpace.members.roles.president');
    if (m.role === 'bureau') return m.title || t('clubSpace.members.roles.bureau');
    return null;
  };
  const list = (items) => (items.length > 0 ? items.map((line) => `• ${line}`) : [t('clubSpace.report.none')]);

  const done = projects.filter((p) => p.status === 'done' && thisMonth(p.completed_at));
  const ongoing = projects.filter((p) => p.status === 'in_progress');
  const ideas = projects.filter((p) => p.status === 'idea');

  const lines = [
    t('clubSpace.report.title', { club: club.name }),
    t('clubSpace.report.month', { month: monthLabel }),
    t('clubSpace.report.president', { name: president?.name || club.president || '—' }),
    '',
    t('clubSpace.report.members', { count: members.length }),
    ...(club.maxCapacity
      ? [t('clubSpace.report.capacity', { max: club.maxCapacity, goal: charterGoal(club.maxCapacity) })]
      : []),
    t('clubSpace.report.newMembers', { count: members.filter((m) => thisMonth(m.joinedAt)).length }),
    '',
    t('clubSpace.report.memberList'),
    ...list(members.map((m) => (roleLabel(m) ? `${m.name} (${roleLabel(m)})` : m.name))),
    '',
    t('clubSpace.report.done'),
    ...list(done.map((p) => p.title)),
    '',
    t('clubSpace.report.ongoing'),
    ...list(ongoing.map((p) => p.title)),
    '',
    t('clubSpace.report.ideas', { count: ideas.length }),
    t('clubSpace.report.posts', { count: posts.filter((p) => thisMonth(p.created_at)).length }),
    t('clubSpace.report.sessions', {
      count: sessions.filter((session) => thisMonth(session.session_date)).length,
    }),
    '',
    t('clubSpace.report.footer'),
  ];

  return {
    subject: t('clubSpace.settings.reportSubject', { club: club.name, month: monthLabel }),
    body: lines.join('\n'),
  };
}
