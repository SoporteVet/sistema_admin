const { GERENCIA_CORREOS } = require('./constants');

function usersArrayFromMap(usersMap) {
  return Object.entries(usersMap || {}).map(([id, u]) => ({ id, ...u }));
}

function encargadoGestionaDepartamento(user, depId) {
  if (!user || !depId) return false;
  if (user.departamento === depId) return true;
  const extra = user.departamentosEncargado;
  return extra && extra[depId] === true;
}

function getEncargadosDepartamento(users, depId) {
  return users.filter(
    (u) =>
      usuarioActivo(u) &&
      (u.rol === 'encargado' || u.rol === 'admin') &&
      encargadoGestionaDepartamento(u, depId)
  );
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function usuarioActivo(u) {
  return Boolean(u) && u.activo !== false;
}

function isSharedMailbox(email) {
  const local = normalizeEmail(email).split('@')[0] || '';
  const shared = new Set([
    'rrhh',
    'info',
    'noreply',
    'no-reply',
    'soporte',
    'admin',
    'contacto',
    'recepcion',
    'gerencia'
  ]);
  return shared.has(local);
}

function pickDeliveryEmail(uid, profile, authEmailByUid) {
  const authEmail = authEmailByUid.get(uid);
  const rtdbEmail = String(profile?.email || '').trim();
  if (authEmail && isValidEmail(authEmail)) {
    if (!rtdbEmail || !isValidEmail(rtdbEmail) || isSharedMailbox(rtdbEmail)) {
      return { email: authEmail.trim(), source: 'auth' };
    }
    if (normalizeEmail(authEmail) !== normalizeEmail(rtdbEmail)) {
      return { email: authEmail.trim(), source: 'auth' };
    }
    return { email: rtdbEmail, source: 'rtdb' };
  }
  if (rtdbEmail && isValidEmail(rtdbEmail)) {
    return { email: rtdbEmail, source: 'rtdb' };
  }
  return { email: null, source: null };
}

async function loadAuthEmails(auth, uids) {
  const map = new Map();
  const unique = [...new Set(uids.filter(Boolean))];
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const rec = await auth.getUser(uid);
        if (rec.email && isValidEmail(rec.email)) {
          map.set(uid, rec.email.trim());
        }
      } catch (err) {
        console.warn(`requestEmail: sin Auth para uid ${uid}`, err.code || err.message);
      }
    })
  );
  return map;
}

function gerenciaAllowlistEntries() {
  return GERENCIA_CORREOS.filter(isValidEmail).map((email) => ({
    id: `gerencia:${normalizeEmail(email)}`,
    email: email.trim(),
    nombre: 'Gerencia General',
    rol: 'gerencia',
    _grupo: 'gerencia',
    _fixedGerencia: true
  }));
}

/**
 * 1) Solicitante  2) Encargado(s) del área  3) Gerencia (lista fija GERENCIA_CORREOS)
 */
async function resolveRequestEmailRecipients(request, usersMap, auth) {
  const users = usersArrayFromMap(usersMap).filter(usuarioActivo);
  const solicitanteId = request.solicitante;
  const dept = request.departamento;

  const solicitante = users.find((u) => u.id === solicitanteId);
  const encargadosArea = dept
    ? getEncargadosDepartamento(users, dept).filter((u) => u.id !== solicitanteId)
    : [];

  const raw = [];
  if (solicitante) raw.push({ ...solicitante, _grupo: 'solicitante' });
  encargadosArea.forEach((u) => raw.push({ ...u, _grupo: 'encargado_area' }));
  gerenciaAllowlistEntries().forEach((e) => raw.push(e));

  const profileIds = raw.filter((u) => !u._fixedGerencia).map((u) => u.id);
  const authEmailByUid = auth ? await loadAuthEmails(auth, profileIds) : new Map();

  const byEmail = new Map();
  for (const u of raw) {
    const picked = u._fixedGerencia
      ? { email: u.email, source: 'gerencia_allowlist' }
      : pickDeliveryEmail(u.id, u, authEmailByUid);
    if (!picked.email) continue;
    const key = normalizeEmail(picked.email);
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        id: u.id,
        email: picked.email,
        emailSource: picked.source,
        nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim() || picked.email,
        rol: u.rol,
        grupo: u._grupo
      });
    }
  }
  return [...byEmail.values()];
}

module.exports = {
  resolveRequestEmailRecipients,
  getEncargadosDepartamento,
  usersArrayFromMap,
  pickDeliveryEmail,
  isSharedMailbox
};
