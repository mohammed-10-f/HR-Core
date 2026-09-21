import {json,fail,requireAuth,permission} from './_core.js';
export async function onRequestGet({request,env}){const a=await requireAuth(request,env);if(a.error)return a.error;const u=a.user;const [employees,departments,roles,perms,txs,defs,notifications,payroll] = await Promise.all([
 env.DB.prepare('SELECT * FROM employees WHERE company_id=? ORDER BY name').bind(u.company_id).all(),
 env.DB.prepare('SELECT * FROM departments WHERE company_id=? ORDER BY name_ar').bind(u.company_id).all(),
 env.DB.prepare('SELECT r.*,COUNT(DISTINCT u.id) user_count FROM roles r LEFT JOIN users u ON u.role_id=r.id GROUP BY r.id').all(),
 env.DB.prepare(`SELECT DISTINCT COALESCE(pc.id, CAST(p.id AS TEXT)) AS id, COALESCE(pc.label_ar, p.name_ar, p.description, CAST(p.id AS TEXT)) AS label_ar, COALESCE(pc.module,'') AS module, COALESCE(pc.resource,'') AS resource, COALESCE(pc.action,'') AS action, p.description FROM permissions p LEFT JOIN permission_catalog pc ON pc.id=CAST(p.id AS TEXT) JOIN role_permissions rp ON CAST(rp.permission_id AS TEXT)=CAST(p.id AS TEXT) WHERE rp.role_id=? ORDER BY COALESCE(pc.module,'zzz'), id`).bind(u.role_id).all(),
 env.DB.prepare('SELECT t.*,u.display_name requester_name FROM transactions t LEFT JOIN users u ON u.id=t.requester_user_id WHERE t.company_id=? ORDER BY t.created_at DESC LIMIT 100').bind(u.company_id).all(),
 env.DB.prepare('SELECT * FROM transaction_definitions WHERE company_id=? AND active=1 ORDER BY name_ar').bind(u.company_id).all(),
 env.DB.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(u.id).all(),
 env.DB.prepare(`SELECT pr.*,pp.period_code,pp.start_date,pp.end_date FROM payroll_runs pr JOIN payroll_periods pp ON pp.id=pr.period_id WHERE pp.company_id=? ORDER BY pr.updated_at DESC LIMIT 20`).bind(u.company_id).all()
 ]);
 const role=await env.DB.prepare('SELECT code,name_ar FROM roles WHERE id=?').bind(u.role_id).first().catch(()=>null);
 const isAdmin=Number(u.role_id)===1||role?.code==='super_admin'||role?.name_ar==='مدير النظام';
 const allCatalog=isAdmin ? await env.DB.prepare('SELECT id,label_ar,module,resource,action FROM permission_catalog ORDER BY module,id').all().catch(()=>({results:[]})) : null;
 return json({ok:true,user:{id:u.id,username:u.username,name:u.display_name,roleId:u.role_id,roleName:role?.name_ar||u.role_name,roleCode:role?.code||'',employeeId:u.employee_id,companyId:u.company_id},employees:employees.results||[],departments:departments.results||[],roles:(roles.results||[]).map(r=>({...r,name:r.name_ar||r.code||String(r.id)})),permissions:(isAdmin ? (allCatalog.results||[]) : (perms.results||[])),transactions:txs.results||[],transactionDefinitions:defs.results||[],notifications:notifications.results||[],payrollRuns:payroll.results||[]})}
