import {json,fail,requireAuth,permission} from './_core.js';
export async function onRequestGet({request,env}){const a=await requireAuth(request,env);if(a.error)return a.error;const u=a.user;const [employees,departments,roles,perms,txs,defs,notifications,payroll] = await Promise.all([
 env.DB.prepare('SELECT * FROM employees WHERE company_id=? ORDER BY name').bind(u.company_id).all(),
 env.DB.prepare('SELECT * FROM departments WHERE company_id=? ORDER BY name_ar').bind(u.company_id).all(),
 env.DB.prepare('SELECT r.*,COUNT(DISTINCT u.id) user_count FROM roles r LEFT JOIN users u ON u.role_id=r.id GROUP BY r.id').all(),
 env.DB.prepare('SELECT p.id,p.name,p.description,pc.module,pc.resource,pc.action,pc.label_ar FROM permissions p LEFT JOIN permission_catalog pc ON pc.id=p.id JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=? ORDER BY COALESCE(pc.module,p.id),p.id').bind(u.role_id).all(),
 env.DB.prepare('SELECT t.*,u.display_name requester_name FROM transactions t LEFT JOIN users u ON u.id=t.requester_user_id WHERE t.company_id=? ORDER BY t.created_at DESC LIMIT 100').bind(u.company_id).all(),
 env.DB.prepare('SELECT * FROM transaction_definitions WHERE company_id=? AND active=1 ORDER BY name').bind(u.company_id).all(),
 env.DB.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(u.id).all(),
 env.DB.prepare(`SELECT pr.*,pp.period_code,pp.start_date,pp.end_date FROM payroll_runs pr JOIN payroll_periods pp ON pp.id=pr.period_id WHERE pp.company_id=? ORDER BY pr.updated_at DESC LIMIT 20`).bind(u.company_id).all()
 ]);return json({ok:true,user:{id:u.id,username:u.username,name:u.display_name,roleId:u.role_id,roleName:u.role_name,employeeId:u.employee_id,companyId:u.company_id},employees:employees.results||[],departments:departments.results||[],roles:roleRows,permissions:perms.results||[],transactions:txs.results||[],transactionDefinitions:defs.results||[],notifications:notifications.results||[],payrollRuns:payroll.results||[]})}
