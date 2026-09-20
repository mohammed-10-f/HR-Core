import { hashPin, sessionCookie, clearSessionCookie, getAuthUser, permissionsFor, json, getCookie, COOKIE } from './auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return json({error:'D1 binding DB is missing'},500);

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const pin = String(body.pin || '');
  if (!username || !pin) return json({error:'أدخل اسم المستخدم والرمز السري'},400);

  const user = await env.DB.prepare(`
    SELECT
      u.id,
      u.company_id AS companyId,
      u.username,
      u.display_name AS displayName,
      u.password_hash AS passwordHash,
      u.role_id AS roleDbId,
      u.employee_id AS employeeId,
      r.code AS roleId,
      r.name_ar AS roleName
    FROM users u
    JOIN roles r ON r.id=u.role_id
    WHERE u.username=? AND u.active=1
    LIMIT 1
  `).bind(username).first();

  if (!user || (await hashPin(pin)) !== user.passwordHash) {
    return json({error:'بيانات الدخول غير صحيحة'},401);
  }

  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map(b=>b.toString(16).padStart(2,'0')).join('');
  const expires = new Date(Date.now()+SESSION_DAYS*86400000).toISOString();

  await env.DB.prepare(
    'INSERT INTO sessions(session_token,user_id,expires_at) VALUES(?,?,?)'
  ).bind(token,user.id,expires).run();

  await env.DB.prepare(
    'DELETE FROM sessions WHERE expires_at<=?'
  ).bind(new Date().toISOString()).run();

  await env.DB.prepare(
    'UPDATE users SET last_login_at=?, updated_at=? WHERE id=?'
  ).bind(new Date().toISOString(),new Date().toISOString(),user.id).run().catch(()=>{});

  const safeUser = {
    id:user.id,
    username:user.username,
    displayName:user.displayName,
    roleId:user.roleId,
    roleDbId:user.roleDbId,
    roleName:user.roleName,
    employeeId:user.employeeId,
    companyId:user.companyId
  };

  const permissions = await permissionsFor(env,safeUser);
  return json({ok:true,user:safeUser,permissions},200,{'Set-Cookie':sessionCookie(token)});
}

export async function onRequestGet(context) {
  const user = await getAuthUser(context.request, context.env);
  if (!user) return json({authenticated:false},401);
  return json({authenticated:true,user,permissions:await permissionsFor(context.env,user)});
}

export async function onRequestDelete(context) {
  const token = getCookie(context.request, COOKIE);
  if (token) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE session_token=?')
      .bind(token).run();
  }
  return json({ok:true},200,{'Set-Cookie':clearSessionCookie()});
}

const SESSION_DAYS = 7;
