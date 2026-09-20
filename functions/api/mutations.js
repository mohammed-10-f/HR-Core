import { getAuthUser, can, json } from './auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.DB) return json({error:'D1 binding DB is missing'},500);
  const user = await getAuthUser(request,env);
  if (!user) return json({error:'غير مصرح — سجل الدخول أولاً'},401);
  const company = await env.DB.prepare('SELECT id FROM companies WHERE id=? LIMIT 1').bind(user.companyId).first();
  if (!company) return json({error:'No company configured'},404);

  const body=await request.json().catch(()=>({}));
  try {
    if(body.type==='definition.create'){
      if(!(await can(env,user,'transactions.builder'))) return json({error:'لا تملك صلاحية منشئ المعاملات'},403);
      const d=body.payload;
      await env.DB.prepare(`INSERT INTO transaction_definitions(id,company_id,name,category,description,active,public,version,definition_json)
        VALUES(?,?,?,?,?,?,?,?,?)`).bind(d.id,company.id,d.name,d.category,d.description||'',d.active?1:0,d.public?1:0,d.version||1,JSON.stringify(d)).run();
      await audit(env,user,'إنشاء','transaction_definition',d.id,d.name);
    } else if(body.type==='transaction.create'){
      if(!(await can(env,user,'transactions.create'))) return json({error:'لا تملك صلاحية إنشاء المعاملة'},403);
      const t=body.payload;
      if(user.roleId==='employee' && t.employeeId && t.employeeId!==user.employeeId) return json({error:'لا يمكنك إنشاء معاملة لموظف آخر'},403);
      const createdAt=t.createdAt||new Date().toISOString();
      await env.DB.prepare(`INSERT INTO transactions(id,company_id,definition_id,definition_name,employee_id,requester_user_id,status,current_step_id,values_json,requester_role,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(t.id,company.id,t.definitionId,t.definitionName,t.employeeId||user.employeeId||null,user.id,t.status||'قيد المعالجة',t.currentStepId||null,JSON.stringify(t.values||{}),user.roleId,createdAt,new Date().toISOString()).run();
      for(const h of t.history||[]) await env.DB.prepare(`INSERT INTO transaction_history(transaction_id,action,actor_user_id,actor_name,step,created_at) VALUES(?,?,?,?,?,?)`)
        .bind(t.id,h.action,user.id,user.displayName,h.step||'',h.at||createdAt).run();
      await audit(env,user,'إنشاء','transaction',t.id,t.definitionName);
    } else if(body.type==='transaction.action'){
      if(!(await can(env,user,'transactions.act'))) return json({error:'لا تملك صلاحية تنفيذ الإجراء'},403);
      const {id,actionId}=body.payload||{};
      const t=await env.DB.prepare('SELECT * FROM transactions WHERE id=? AND company_id=?').bind(id,company.id).first();
      if(!t) return json({error:'Transaction not found'},404);

      if(user.roleId==='employee') return json({error:'الموظف لا يملك اعتماد المعاملة'},403);
      if(user.roleId==='manager'){
        const managed=await env.DB.prepare('SELECT 1 FROM employees WHERE id=? AND manager_id=?').bind(t.employee_id,user.employeeId||'').first();
        if(!managed) return json({error:'المعاملة خارج نطاقك'},403);
      }

      const drow=await env.DB.prepare('SELECT definition_json FROM transaction_definitions WHERE id=? AND company_id=?').bind(t.definition_id,company.id).first();
      if(!drow) return json({error:'تعريف المعاملة غير موجود'},404);
      const d=JSON.parse(drow.definition_json);
      const step=d.steps?.find(s=>s.id===t.current_step_id);
      if(!step) return json({error:'لا توجد خطوة حالية صالحة'},400);

      const action=step.actions?.find(a=>a.id===actionId);
      if(!action) return json({error:'Action not found'},400);

      const assignee=step.assignee||{};
      if(user.roleId==='manager' && assignee.type!=='manager') return json({error:'هذه الخطوة ليست موجهة للمدير المباشر'},403);
      if(user.roleId==='hr' && assignee.type==='role' && assignee.role!=='hr') return json({error:'هذه الخطوة ليست موجهة للموارد البشرية'},403);

      let status='قيد المعالجة',next=action.next;
      if(next==='END_APPROVED') status='مكتملة';
      if(next==='END_REJECTED') status='مرفوضة';
      if(next==='START') next=d.steps?.[0]?.id||null;
      const now=new Date().toISOString();

      await env.DB.prepare('UPDATE transactions SET status=?,current_step_id=?,updated_at=? WHERE id=? AND company_id=?')
        .bind(status,next,now,id,company.id).run();
      await env.DB.prepare('INSERT INTO transaction_history(transaction_id,action,actor_user_id,actor_name,step,created_at) VALUES(?,?,?,?,?,?)')
        .bind(id,action.label,user.id,user.displayName,step.name,now).run();
      await audit(env,user,action.label,'transaction',id,step.name);
    } else {
      return json({error:'Unknown mutation'},400);
    }

    const url=new URL(request.url);
    const r=await fetch(new URL('/api/state',url),{headers:{'Cookie':request.headers.get('Cookie')||''}});
    return new Response(await r.text(),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  } catch(e) {
    return json({error:e?.message||String(e)},500);
  }
}

async function audit(env,user,action,entityType,entityId,details){
  await env.DB.prepare(`INSERT INTO audit_logs(company_id,actor_user_id,actor_name,action,entity_type,entity_id,details)
    VALUES(?,?,?,?,?,?,?)`).bind(user.companyId,user.id,user.displayName,action,entityType,entityId,details||'').run();
}
