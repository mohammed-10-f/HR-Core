import { hashPin, sessionCookie, clearSessionCookie, getAuthUser, permissionsFor, json } from './auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const pin = String(body.pin || '');
  if (!username || !pin) return json({error:'أدخل اسم المستخدم والرمز السري'},400);

  const user = await env.DB.prepare(`
    SELECT id,company_id,username,display_name AS displayName,role_id AS roleId,employee_id AS employeeId
    FROM users WHERE username=? AND active=1 LIMIT 1
  `).bind(username).first();
  if (!user || (await hashPin(pin)) !== (await env.DB.prepare('SELECT pin_hash FROM users WHERE id=?').bind(user.id).first())?.pin_hash) {
    return json({error:'بيانات الدخول غير صحيحة'},401);
  }

  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const expires = new Date(Date.now()+7*86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').bind(token,user.id,expires).run();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(new Date().toISOString()).run();

  const role = await env.DB.prepare('SELECT name FROM roles WHERE id=?').bind(user.roleId).first();
  const permissions = await permissionsFor(env,{...user,roleName:role?.name});
  return json({ok:true,user:{...user,roleName:role?.name},permissions},200,{'Set-Cookie':sessionCookie(token)});
}

export async function onRequestGet(context) {
  const user = await getAuthUser(context.request, context.env);
  if (!user) return json({authenticated:false},401);
  return json({authenticated:true,user,permissions:await permissionsFor(context.env,user)});
}

export async function onRequestDelete(context) {
  const token = context.request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('hr_session='))?.split('=')[1];
  if (token) await context.env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(decodeURIComponent(token)).run();
  return json({ok:true},200,{'Set-Cookie':clearSessionCookie()});
}
