import {ensureSchema} from './schema.js';
export const json = (data,status=200,extra={}) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...extra}});
export function fail(message,status=400,code='BAD_REQUEST'){return json({ok:false,error:{code,message}},status)}
export async function body(request){try{return await request.json()}catch{return {}}}
export function id(prefix='id'){return `${prefix}_${crypto.randomUUID()}`}
export function cookieToken(request){const h=request.headers.get('Cookie')||''; const m=h.match(/hr_session=([^;]+)/); return m?.[1]||null}
export function setSessionCookie(token,maxAge){return `hr_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`}
export function clearSessionCookie(){return 'hr_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax'}
export async function hashPassword(value){const enc=new TextEncoder();const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',enc.encode(value),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);return `pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`}
export async function verifyPassword(value,stored){if(!stored)return false;if(stored.startsWith('pbkdf2$')){const [,it,saltS,digest]=stored.split('$');const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(value),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:ub64(saltS),iterations:Number(it),hash:'SHA-256'},key,256);return timingSafe(new Uint8Array(bits),ub64(digest));}const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return timingSafe(new Uint8Array(digest),hex(stored));}
function timingSafe(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0}
function b64(a){let s='';for(const c of a)s+=String.fromCharCode(c);return btoa(s).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function ub64(s){s=s.replaceAll('-','+').replaceAll('_','/');while(s.length%4)s+='=';const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0))}
function hex(s){if(!/^[0-9a-f]+$/i.test(s))return new Uint8Array();const a=new Uint8Array(s.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(s.slice(i*2,i*2+2),16);return a}
async function sessionSchema(env){
  const rows=await env.DB.prepare('PRAGMA table_info(sessions)').all();
  const meta=rows.results||[];
  const cols=meta.map(r=>r.name);
  const tokenCandidates=['session_token','token','session_id'];
  const userCandidates=['user_id','userid','user'];
  const expiryCandidates=['expires_at','expires','expiry_at','expiresAt'];
  // Prefer the real legacy/canonical column when it is NOT NULL. This is
  // important when the self-healing layer has added a nullable compatibility
  // column such as `token` beside an existing required `session_token`.
  const pick=(candidates)=>candidates.find(c=>cols.includes(c)&&meta.find(r=>r.name===c)?.notnull)
    || candidates.find(c=>cols.includes(c));
  const tokenCol=pick(tokenCandidates);
  const userCol=pick(userCandidates);
  const expiryCol=pick(expiryCandidates);
  if(!tokenCol||!userCol||!expiryCol) throw new Error('sessions table is missing a supported token/user/expiry column');
  return {tokenCol,userCol,expiryCol,cols,meta,
    tokenCols:tokenCandidates.filter(c=>cols.includes(c)),
    userCols:userCandidates.filter(c=>cols.includes(c)),
    expiryCols:expiryCandidates.filter(c=>cols.includes(c))};
}
export async function createSession(env,token,userId,expiresAt){
  const s=await sessionSchema(env);
  const cols=[]; const vals=[];
  const add=(c,v)=>{if(c&& !cols.includes(c)){cols.push(c);vals.push(v)}};
  // Populate every recognized session identity column. This keeps old and new
  // schemas compatible and, crucially, satisfies NOT NULL legacy columns.
  for(const c of s.tokenCols) add(c,token);
  for(const c of s.userCols) add(c,userId);
  for(const c of s.expiryCols) add(c,expiresAt);
  for(const c of s.meta){
    if(cols.includes(c.name)||c.name==='created_at') continue;
    if(c.notnull && c.dflt_value===null && c.pk===0){
      if(/(^|_)id$/i.test(c.name)) add(c,id('sessrow'));
      else if(/created/i.test(c.name)) add(c,new Date().toISOString());
      else if(/active|enabled/i.test(c.name)) add(c,1);
    }
  }
  const placeholders=cols.map(()=>'?').join(',');
  await env.DB.prepare(`INSERT INTO sessions(${cols.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(',')}) VALUES(${placeholders})`).bind(...vals).run();
}

export async function requireAuth(request,env){
  await ensureSchema(env);
  const token=cookieToken(request);
  if(!token)return {error:fail('غير مصرح. يرجى تسجيل الدخول.',401,'UNAUTHORIZED')};
  const s=await sessionSchema(env);
  const row=await env.DB.prepare(`SELECT s.${s.tokenCol} AS session_token,s.${s.expiryCol} AS session_expires_at,u.*,r.name_ar AS role_name FROM sessions s JOIN users u ON u.id=s.${s.userCol} LEFT JOIN roles r ON r.id=u.role_id WHERE s.${s.tokenCol}=? AND u.active=1`).bind(token).first();
  if(!row||new Date(row.session_expires_at)<=new Date())return {error:fail('انتهت الجلسة.',401,'SESSION_EXPIRED')};
  return {user:row,token};
}
export async function deleteSession(env,token){
  const s=await sessionSchema(env);
  await env.DB.prepare(`DELETE FROM sessions WHERE ${s.tokenCol}=?`).bind(token).run();
}

export async function permission(env,user,perm){await ensureSchema(env);
  let row=await env.DB.prepare(`SELECT rp.scope FROM role_permissions rp WHERE rp.role_id=? AND rp.permission_id=? LIMIT 1`).bind(user.role_id,perm).first().catch(()=>null);
  if(row?.scope)return row.scope;
  const map=await env.DB.prepare(`SELECT legacy_permission_id FROM permission_map WHERE catalog_id=?`).bind(perm).first().catch(()=>null);
  if(map?.legacy_permission_id){ row=await env.DB.prepare(`SELECT rp.scope FROM role_permissions rp WHERE rp.role_id=? AND CAST(rp.permission_id AS TEXT)=? LIMIT 1`).bind(user.role_id,String(map.legacy_permission_id)).first().catch(()=>null); if(row?.scope)return row.scope; }
  row=await env.DB.prepare(`SELECT 'company' AS scope FROM role_scopes rs WHERE rs.role_id=? AND rs.permission_id=? LIMIT 1`).bind(user.role_id,perm).first().catch(()=>null);
  return row?.scope||null;
}
export async function audit(env,user,action,entityType,entityId,details={}){await env.DB.prepare(`INSERT INTO audit_logs(company_id,actor_user_id,actor_name,action,entity_type,entity_id,details) VALUES(?,?,?,?,?,?,?)`).bind(user.company_id,user.id,user.display_name,action,entityType,entityId,JSON.stringify(details)).run()}
export async function notify(env,userId,companyId,title,body,resourceType=null,resourceId=null){await env.DB.prepare(`INSERT INTO notifications(id,company_id,user_id,type,title_ar,body_ar,resource_type,resource_id) VALUES(?,?,?,?,?,?,?,?)`).bind(id('ntf'),companyId,userId,'system',title,body,resourceType,resourceId).run()}
export async function requirePermission(request,env,perm){const a=await requireAuth(request,env);if(a.error)return a;const role=await env.DB.prepare('SELECT code,name_ar FROM roles WHERE id=?').bind(a.user.role_id).first();if(role?.code==='super_admin'||role?.name_ar==='مدير النظام')return {...a,scope:'company'};const scope=await permission(env,a.user,perm);if(!scope)return {error:fail('ليس لديك الصلاحية المطلوبة.',403,'FORBIDDEN')};return {...a,scope}}
