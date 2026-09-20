export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({ error: 'D1 binding DB is missing' }, 500);
  const body = await request.json();
  const company = await env.DB.prepare('SELECT id FROM companies ORDER BY rowid LIMIT 1').first();
  if (!company) return json({error:'No company configured'},404);
  try {
    if (body.type === 'definition.create') {
      const d = body.payload;
      await env.DB.prepare(`INSERT INTO transaction_definitions(id,company_id,name,category,description,active,public,version,definition_json) VALUES(?,?,?,?,?,?,?,?,?)`)
        .bind(d.id,company.id,d.name,d.category,d.description||'',d.active?1:0,d.public?1:0,d.version||1,JSON.stringify(d)).run();
      await audit(env,company.id,'إنشاء','transaction_definition',d.id,d.name);
    } else if (body.type === 'transaction.create') {
      const t = body.payload;
      await env.DB.prepare(`INSERT INTO transactions(id,company_id,definition_id,definition_name,employee_id,status,current_step_id,values_json,requester_role,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(t.id,company.id,t.definitionId,t.definitionName,t.employeeId,t.status,t.currentStepId,JSON.stringify(t.values||{}),t.requesterRole||'',t.createdAt,new Date().toISOString()).run();
      for (const h of t.history||[]) await env.DB.prepare('INSERT INTO transaction_history(transaction_id,action,actor_name,step,created_at) VALUES(?,?,?,?,?)').bind(t.id,h.action,h.by||'',h.step||'',h.at||new Date().toISOString()).run();
      await audit(env,company.id,'إنشاء','transaction',t.id,t.definitionName);
    } else if (body.type === 'transaction.action') {
      const {id,actionId,role} = body.payload;
      const t = await env.DB.prepare('SELECT * FROM transactions WHERE id=? AND company_id=?').bind(id,company.id).first();
      if (!t) return json({error:'Transaction not found'},404);
      const drow = await env.DB.prepare('SELECT definition_json FROM transaction_definitions WHERE id=? AND company_id=?').bind(t.definition_id,company.id).first();
      const d = JSON.parse(drow.definition_json); const step=d.steps.find(s=>s.id===t.current_step_id); const action=step?.actions?.find(a=>a.id===actionId);
      if(!action)return json({error:'Action not found'},400);
      let status='قيد المعالجة',next=action.next;if(next==='END_APPROVED')status='مكتملة';if(next==='END_REJECTED')status='مرفوضة';if(next==='START')next=d.steps[0]?.id||null;
      const actor=role==='super_admin'?'مدير النظام':role==='hr'?'مدير الموارد البشرية':role==='manager'?'مدير مباشر':'موظف';
      const now=new Date().toISOString();
      await env.DB.prepare('UPDATE transactions SET status=?,current_step_id=?,updated_at=? WHERE id=? AND company_id=?').bind(status,next,now,id,company.id).run();
      await env.DB.prepare('INSERT INTO transaction_history(transaction_id,action,actor_name,step,created_at) VALUES(?,?,?,?,?)').bind(id,action.label,actor,step?.name||'',now).run();
      await audit(env,company.id,action.label,'transaction',id,step?.name||'');
    } else return json({error:'Unknown mutation'},400);
    const r=await fetch(new URL('/api/state',request.url),{headers:{'Accept':'application/json'}});return new Response(await r.text(),{status:200,headers:{'Content-Type':'application/json'}});
  } catch(e){return json({error:e?.message||String(e)},500)}
}
async function audit(env,companyId,action,entityType,entityId,details){await env.DB.prepare('INSERT INTO audit_logs(company_id,actor_name,action,entity_type,entity_id,details) VALUES(?,?,?,?,?,?)').bind(companyId,'واجهة HR Core',action,entityType,entityId,details||'').run()}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8'}})}
