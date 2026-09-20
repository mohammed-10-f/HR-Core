const COOKIE = 'hr_session';
const SESSION_DAYS = 7;

export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export async function getAuthUser(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token || !env.DB) return null;
  const now = new Date().toISOString();
  return await env.DB.prepare(`
    SELECT
      u.id,
      u.username,
      u.display_name AS displayName,
      u.role_id AS roleDbId,
      r.code AS roleId,
      r.name_ar AS roleName,
      u.employee_id AS employeeId,
      u.company_id AS companyId
    FROM sessions s
    JOIN users u ON u.id=s.user_id
    JOIN roles r ON r.id=u.role_id
    WHERE s.session_token=? AND s.expires_at>? AND u.active=1
    LIMIT 1
  `).bind(token, now).first();
}

export function sessionCookie(token, maxAge=SESSION_DAYS*86400) {
  return `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export async function permissionsFor(env, user) {
  if (!user) return [];
  const rows = await env.DB.prepare(`
    SELECT
      p.id,
      p.code,
      rp.scope
    FROM role_permissions rp
    JOIN permissions p ON p.id=rp.permission_id
    WHERE rp.role_id=?
    ORDER BY p.id
  `).bind(user.roleDbId ?? user.roleId).all();
  return rows.results || [];
}

export async function can(env, user, permission) {
  if (!user) return false;
  if (user.roleId === 'super_admin') return true;
  const rows = await permissionsFor(env, user);
  return rows.some(x => x.code === permission);
}

export function json(data,status=200,extra={}) {
  const headers = new Headers({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    ...extra
  });
  return new Response(JSON.stringify(data),{status,headers});
}
export { COOKIE };
