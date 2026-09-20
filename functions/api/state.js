export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ error: 'D1 binding DB is missing' }, 500);
  const company = await env.DB.prepare('SELECT id,name,code,timezone,currency FROM companies ORDER BY rowid LIMIT 1').first();
  if (!company) return json({ error: 'No company found. Run the D1 migration first.' }, 404);
  const employees = await env.DB.prepare('SELECT id,name,job,dept,branch,nationality,salary,join_date AS joinDate,status,manager_id AS managerId FROM employees WHERE company_id=? ORDER BY name').bind(company.id).all();
  const defs = await env.DB.prepare('SELECT id,name,category,description,active,public,version,definition_json FROM transaction_definitions WHERE company_id=? ORDER BY created_at DESC').bind(company.id).all();
  const tx = await env.DB.prepare('SELECT id,definition_id AS definitionId,definition_name AS definitionName,employee_id AS employeeId,status,current_step_id AS currentStepId,values_json AS valuesJson,requester_role AS requesterRole,created_at AS createdAt FROM transactions WHERE company_id=? ORDER BY created_at DESC').bind(company.id).all();
  const history = await env.DB.prepare('SELECT transaction_id AS transactionId,action,actor_name AS by,step,created_at AS at FROM transaction_history WHERE transaction_id IN (SELECT id FROM transactions WHERE company_id=?) ORDER BY id').bind(company.id).all();
  const audit = await env.DB.prepare('SELECT id,actor_name AS user,action,entity_type AS entity,entity_id AS entityId,details,created_at AS at FROM audit_logs WHERE company_id=? ORDER BY id DESC LIMIT 500').bind(company.id).all();
  const definitions = defs.results.map(d=>({...JSON.parse(d.definition_json),id:d.id,name:d.name,category:d.category,description:d.description,active:!!d.active,public:!!d.public,version:d.version}));
  const transactions = tx.results.map(t=>({...t,values:JSON.parse(t.valuesJson||'{}'),history:history.results.filter(h=>h.transactionId===t.id).map(({transactionId,...h})=>h),comments:[],attachments:[]}));
  return json({company,employees,definitions,transactions,leaves:[],audit,notifications:[],source:'d1'});
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
