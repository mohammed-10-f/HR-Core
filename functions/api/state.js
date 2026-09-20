import { getAuthUser, permissionsFor, json } from './auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({error:'D1 binding DB is missing'},500);
  const user = await getAuthUser(request,env);
  if (!user) return json({error:'غير مصرح — سجل الدخول أولاً'},401);

  const company = await env.DB.prepare('SELECT id,name,code,timezone,currency FROM companies WHERE id=? LIMIT 1').bind(user.companyId).first();
  if (!company) return json({error:'No company found'},404);

  let employeesSql = `SELECT id,name,job,dept,branch,nationality,salary,join_date AS joinDate,status,manager_id AS managerId
                      FROM employees WHERE company_id=?`;
  const empParams=[company.id];
  if (user.roleId==='employee') { employeesSql += ' AND id=?'; empParams.push(user.employeeId || ''); }
  else if (user.roleId==='manager') { employeesSql += ' AND (manager_id=? OR id=?)'; empParams.push(user.employeeId || '', user.employeeId || ''); }
  employeesSql += ' ORDER BY name';
  const employees = await env.DB.prepare(employeesSql).bind(...empParams).all();

  const defs = await env.DB.prepare('SELECT id,name,category,description,active,public,version,definition_json FROM transaction_definitions WHERE company_id=? ORDER BY created_at DESC').bind(company.id).all();
  const definitions = defs.results.map(d=>({...JSON.parse(d.definition_json),id:d.id,name:d.name,category:d.category,description:d.description,active:!!d.active,public:!!d.public,version:d.version}));

  let txSql = `SELECT id,definition_id AS definitionId,definition_name AS definitionName,employee_id AS employeeId,
    status,current_step_id AS currentStepId,values_json AS valuesJson,requester_role AS requesterRole,
    created_at AS createdAt,updated_at AS updatedAt
    FROM transactions WHERE company_id=?`;
  const txParams=[company.id];
  if (user.roleId==='employee') { txSql += ' AND (requester_user_id=? OR employee_id=?)'; txParams.push(user.id,user.employeeId||''); }
  else if (user.roleId==='manager') { txSql += ' AND (requester_user_id=? OR employee_id IN (SELECT id FROM employees WHERE manager_id=?))'; txParams.push(user.id,user.employeeId||''); }
  txSql += ' ORDER BY created_at DESC';
  const tx = await env.DB.prepare(txSql).bind(...txParams).all();

  const txIds = tx.results.map(x=>x.id);
  let history=[];
  if(txIds.length){
    const placeholders=txIds.map(()=>'?').join(',');
    history=(await env.DB.prepare(`SELECT transaction_id AS transactionId,action,actor_name AS by,step,created_at AS at FROM transaction_history WHERE transaction_id IN (${placeholders}) ORDER BY id`).bind(...txIds)).results;
  }
  let audit=[];
  if(user.roleId==='super_admin'||user.roleId==='hr'){
    audit=(await env.DB.prepare('SELECT id,actor_name AS user,action,entity_type AS entity,entity_id AS entityId,details,created_at AS at FROM audit_logs WHERE company_id=? ORDER BY id DESC LIMIT 500').bind(company.id)).results;
  }

  const transactions=tx.results.map(t=>({...t,values:JSON.parse(t.valuesJson||'{}'),history:history.filter(h=>h.transactionId===t.id).map(({transactionId,...h})=>h),comments:[],attachments:[]}));
  return json({
    company, user, permissions:await permissionsFor(env,user), employees:employees.results,
    definitions,transactions,leaves:[],audit,notifications:[],source:'d1'
  });
}
