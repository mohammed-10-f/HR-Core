import {body,fail,json,setSessionCookie,clearSessionCookie,hashPassword,id,requireAuth,createSession,deleteSession,audit,verifyPassword} from './_core.js';

export async function onRequestPost({request,env}){
  const b=await body(request);
  const username=String(b.username||'').trim();
  const password=String(b.password||b.pin||'');
  if(!username||!password)return fail('اسم المستخدم وكلمة المرور مطلوبان.');
  const u=await env.DB.prepare(`SELECT u.*, r.name_ar AS role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.username=? LIMIT 1`).bind(username).first();
  if(!u||!u.active||!(await verifyPassword(password,u.password_hash)))return fail('بيانات الدخول غير صحيحة.',401,'INVALID_CREDENTIALS');
  if(/^[a-f0-9]{64}$/i.test(u.password_hash)){const ph=await hashPassword(password);await env.DB.prepare('UPDATE users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(ph,u.id).run().catch(()=>{});}
  const token=id('sess');
  const expires=new Date(Date.now()+8*60*60*1000).toISOString();
  await createSession(env, token, u.id, expires);
  await env.DB.prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?').bind(u.id).run().catch(()=>{});
  await audit(env,u,'login','session',token);
  return new Response(JSON.stringify({ok:true,user:{id:u.id,username:u.username,name:u.display_name,roleId:u.role_id,roleName:u.role_name||String(u.role_id),employeeId:u.employee_id,companyId:u.company_id}}),{headers:{'Content-Type':'application/json','Set-Cookie':setSessionCookie(token,28800)}});
}

export async function onRequestGet({request,env}){
  const a=await requireAuth(request,env);
  if(a.error)return a.error;
  return json({ok:true,user:{id:a.user.id,username:a.user.username,name:a.user.display_name,roleId:a.user.role_id,roleName:a.user.role_name||String(a.user.role_id),employeeId:a.user.employee_id,companyId:a.user.company_id}});
}

export async function onRequestDelete({request,env}){
  const a=await requireAuth(request,env);
  if(!a.error){await deleteSession(env,a.token).catch(()=>{});await audit(env,a.user,'logout','session',a.token);}
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':clearSessionCookie()}});
}
