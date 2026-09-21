import {
  body,
  fail,
  json,
  setSessionCookie,
  clearSessionCookie,
  hashPassword,
  id,
  requireAuth,
  audit
} from './_core.js';

async function verifyLegacyOrModernPassword(password, storedHash) {
  if (!storedHash) return false;

  // النظام القديم: SHA-256
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(password)
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hash.toLowerCase() === storedHash.toLowerCase();
  }

  // النظام الحديث: PBKDF2
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');

    if (parts.length !== 4) return false;

    const [, iterations, saltBase64, hashBase64] = parts;

    const salt = Uint8Array.from(
      atob(saltBase64),
      c => c.charCodeAt(0)
    );

    const expectedHash = Uint8Array.from(
      atob(hashBase64),
      c => c.charCodeAt(0)
    );

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: Number(iterations),
        hash: 'SHA-256'
      },
      key,
      expectedHash.length * 8
    );

    const derivedHash = new Uint8Array(derivedBits);

    if (derivedHash.length !== expectedHash.length) return false;

    let result = 0;

    for (let i = 0; i < expectedHash.length; i++) {
      result |= derivedHash[i] ^ expectedHash[i];
    }

    return result === 0;
  }

  return false;
}

export async function onRequestPost({ request, env }) {
  const b = await body(request);

  const username = String(b.username || '').trim();
  const password = String(b.password || b.pin || '');

  if (!username || !password) {
    return fail('اسم المستخدم وكلمة المرور مطلوبان.');
  }

  const u = await env.DB
    .prepare(`
      SELECT
        u.*,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.username = ?
      LIMIT 1
    `)
    .bind(username)
    .first();

  if (!u || !u.active) {
    return fail('بيانات الدخول غير صحيحة.', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await verifyLegacyOrModernPassword(
    password,
    u.password_hash
  );

  if (!valid) {
    return fail('بيانات الدخول غير صحيحة.', 401, 'INVALID_CREDENTIALS');
  }

  // ترقية SHA-256 القديم إلى PBKDF2 بعد نجاح تسجيل الدخول
  if (/^[a-f0-9]{64}$/i.test(u.password_hash)) {
    const upgradedHash = await hashPassword(password);

    await env.DB
      .prepare(`
        UPDATE users
        SET password_hash = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(upgradedHash, u.id)
      .run()
      .catch(() => {});
  }

  const token = id('sess');

  const expires = new Date(
    Date.now() + 8 * 60 * 60 * 1000
  ).toISOString();

  await env.DB
    .prepare(`
      INSERT INTO sessions(token, user_id, expires_at)
      VALUES(?,?,?)
    `)
    .bind(token, u.id, expires)
    .run();

  await env.DB
    .prepare(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(u.id)
    .run()
    .catch(() => {});

  await audit(
    env,
    u,
    'login',
    'session',
    token
  );

  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        id: u.id,
        username: u.username,
        name: u.display_name,
        roleId: u.role_id,
        roleName: u.role_name || String(u.role_id),
        employeeId: u.employee_id,
        companyId: u.company_id
      }
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setSessionCookie(token, 28800)
      }
    }
  );
}

export async function onRequestGet({ request, env }) {
  const a = await requireAuth(request, env);

  if (a.error) return a.error;

  return json({
    ok: true,
    user: {
      id: a.user.id,
      username: a.user.username,
      name: a.user.display_name,
      roleId: a.user.role_id,
      roleName: a.user.role_name || String(a.user.role_id),
      employeeId: a.user.employee_id,
      companyId: a.user.company_id
    }
  });
}

export async function onRequestDelete({ request, env }) {
  const a = await requireAuth(request, env);

  if (!a.error) {
    await env.DB
      .prepare('DELETE FROM sessions WHERE token = ?')
      .bind(a.token)
      .run();

    await audit(
      env,
      a.user,
      'logout',
      'session',
      a.token
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie()
      }
    }
  );
}
