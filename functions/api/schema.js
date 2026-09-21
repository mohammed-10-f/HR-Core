const CREATE_STATEMENTS = [
`CREATE TABLE IF NOT EXISTS role_scopes (role_id INTEGER NOT NULL, permission_id TEXT NOT NULL, scope_type TEXT NOT NULL, scope_value TEXT, PRIMARY KEY(role_id,permission_id,scope_type,scope_value))`,
`CREATE TABLE IF NOT EXISTS role_departments (role_id INTEGER NOT NULL, department_id TEXT NOT NULL, PRIMARY KEY(role_id,department_id))`,
`CREATE TABLE IF NOT EXISTS role_employees (role_id INTEGER NOT NULL, employee_id TEXT NOT NULL, PRIMARY KEY(role_id,employee_id))`,
`CREATE TABLE IF NOT EXISTS permission_catalog (id TEXT PRIMARY KEY,module TEXT NOT NULL,resource TEXT NOT NULL,action TEXT NOT NULL,label_ar TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,UNIQUE(resource,action))`,
`CREATE TABLE IF NOT EXISTS transaction_definition_versions (id TEXT PRIMARY KEY,definition_id TEXT NOT NULL,version INTEGER NOT NULL,schema_json TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(definition_id,version))`,
`CREATE TABLE IF NOT EXISTS transaction_fields (id TEXT PRIMARY KEY,definition_id TEXT NOT NULL,field_key TEXT NOT NULL,label_ar TEXT NOT NULL,label_en TEXT,field_type TEXT NOT NULL,required INTEGER NOT NULL DEFAULT 0,options_json TEXT,default_value TEXT,visible_scope TEXT,editable_scope TEXT,stage_key TEXT,sort_order INTEGER NOT NULL DEFAULT 0,UNIQUE(definition_id,field_key))`,
`CREATE TABLE IF NOT EXISTS workflow_definitions (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,definition_id TEXT,name_ar TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS workflow_steps (id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL,step_key TEXT NOT NULL,name_ar TEXT NOT NULL,sort_order INTEGER NOT NULL,assignee_type TEXT NOT NULL,role_id INTEGER,permission_id TEXT,scope_type TEXT,sla_hours INTEGER,actions_json TEXT NOT NULL DEFAULT '[]',conditions_json TEXT NOT NULL DEFAULT '[]',UNIQUE(workflow_id,step_key))`,
`CREATE TABLE IF NOT EXISTS workflow_transitions (id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL,from_step_id TEXT NOT NULL,action_key TEXT NOT NULL,to_step_id TEXT,terminal_status TEXT,UNIQUE(from_step_id,action_key))`,
`CREATE TABLE IF NOT EXISTS transaction_values (transaction_id TEXT NOT NULL,field_id TEXT NOT NULL,value_text TEXT,value_number REAL,value_date TEXT,value_json TEXT,PRIMARY KEY(transaction_id,field_id))`,
`CREATE TABLE IF NOT EXISTS transaction_steps (id TEXT PRIMARY KEY,transaction_id TEXT NOT NULL,workflow_step_id TEXT NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,assigned_user_id INTEGER)`,
`CREATE TABLE IF NOT EXISTS transaction_actions (id INTEGER PRIMARY KEY AUTOINCREMENT,transaction_id TEXT NOT NULL,step_id TEXT,action_key TEXT NOT NULL,actor_user_id INTEGER,comment TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS payroll_components (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,code TEXT NOT NULL,name_ar TEXT NOT NULL,component_type TEXT NOT NULL,calculation_type TEXT NOT NULL DEFAULT 'fixed',gosi_base INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,UNIQUE(company_id,code))`,
`CREATE TABLE IF NOT EXISTS employee_compensation (id TEXT PRIMARY KEY,employee_id TEXT NOT NULL,component_id TEXT NOT NULL,amount REAL NOT NULL DEFAULT 0,effective_from TEXT NOT NULL,effective_to TEXT,active INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS payroll_rules (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,rule_code TEXT NOT NULL,name_ar TEXT NOT NULL,rule_type TEXT NOT NULL,value_number REAL,value_json TEXT,effective_from TEXT NOT NULL,effective_to TEXT,active INTEGER NOT NULL DEFAULT 1,UNIQUE(company_id,rule_code,effective_from))`,
`CREATE TABLE IF NOT EXISTS payroll_periods (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,period_code TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',locked_at TEXT,locked_by INTEGER,UNIQUE(company_id,period_code))`,
`CREATE TABLE IF NOT EXISTS payroll_runs (id TEXT PRIMARY KEY,period_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',gross_total REAL NOT NULL DEFAULT 0,deductions_total REAL NOT NULL DEFAULT 0,gosi_total REAL NOT NULL DEFAULT 0,net_total REAL NOT NULL DEFAULT 0,calculated_at TEXT,reviewed_at TEXT,approved_at TEXT,locked_at TEXT,created_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS payroll_items (id TEXT PRIMARY KEY,run_id TEXT NOT NULL,employee_id TEXT NOT NULL,basic REAL NOT NULL DEFAULT 0,earnings REAL NOT NULL DEFAULT 0,deductions REAL NOT NULL DEFAULT 0,gosi REAL NOT NULL DEFAULT 0,net REAL NOT NULL DEFAULT 0,breakdown_json TEXT NOT NULL DEFAULT '{}',validation_json TEXT NOT NULL DEFAULT '{}',UNIQUE(run_id,employee_id))`,
`CREATE TABLE IF NOT EXISTS payroll_adjustments (id TEXT PRIMARY KEY,run_id TEXT,employee_id TEXT NOT NULL,adjustment_type TEXT NOT NULL,amount REAL NOT NULL,reason TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,user_id INTEGER NOT NULL,type TEXT NOT NULL,title_ar TEXT NOT NULL,body_ar TEXT,resource_type TEXT,resource_id TEXT,read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS system_settings (company_id INTEGER NOT NULL,setting_key TEXT NOT NULL,setting_value TEXT,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(company_id,setting_key))`,
`CREATE TABLE IF NOT EXISTS system_schema_versions (version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER, actor_user_id INTEGER, actor_name TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE INDEX IF NOT EXISTS idx_audit_company_time ON audit_logs(company_id,created_at DESC)`,
`CREATE TABLE IF NOT EXISTS org_units (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,parent_id TEXT,name_ar TEXT NOT NULL,name_en TEXT,code TEXT,unit_type TEXT NOT NULL DEFAULT 'department',manager_employee_id TEXT,active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS org_positions (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,unit_id TEXT NOT NULL,title_ar TEXT NOT NULL,title_en TEXT,code TEXT,level_name TEXT,approved_headcount INTEGER NOT NULL DEFAULT 1,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS org_position_slots (id TEXT PRIMARY KEY,position_id TEXT NOT NULL,slot_code TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'vacant',employee_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(position_id,slot_code))`,
`CREATE TABLE IF NOT EXISTS employee_org_assignments (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,employee_id TEXT NOT NULL,unit_id TEXT NOT NULL,position_id TEXT NOT NULL,slot_id TEXT NOT NULL,effective_from TEXT NOT NULL, effective_to TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_org_active ON employee_org_assignments(employee_id) WHERE active=1`,
`CREATE UNIQUE INDEX IF NOT EXISTS ux_slot_active_assignment ON employee_org_assignments(slot_id) WHERE active=1`,
`CREATE INDEX IF NOT EXISTS idx_org_units_company_parent ON org_units(company_id,parent_id)`,
`CREATE INDEX IF NOT EXISTS idx_org_positions_unit ON org_positions(unit_id,active)`,
`CREATE INDEX IF NOT EXISTS idx_org_slots_position ON org_position_slots(position_id,status)`,
`CREATE INDEX IF NOT EXISTS idx_employee_org_company ON employee_org_assignments(company_id,active)`,
];

const SEED_PERMISSIONS = [
['organization.view','organization','organization','view','عرض الهيكل التنظيمي'],['organization.manage','organization','organization','manage','إدارة الهيكل التنظيمي'],['organization.assign','organization','organization','assign','تسكين الموظفين'],['transactions.builder','transactions','transaction_builder','manage','منشئ المعاملات'],['system.maintenance','system','system','maintenance','صيانة قاعدة البيانات']
];

let schemaPromise;
export async function ensureSchema(env){
  if(!schemaPromise){
    schemaPromise=(async()=>{
      for(const sql of CREATE_STATEMENTS) await env.DB.prepare(sql).run();
      for(const p of SEED_PERMISSIONS) await env.DB.prepare('INSERT OR IGNORE INTO permission_catalog(id,module,resource,action,label_ar) VALUES(?,?,?,?,?)').bind(...p).run();
      // permissions exists in multiple legacy schemas. Never assume a `name` column.
      const permInfo=await env.DB.prepare('PRAGMA table_info(permissions)').all();
      const permCols=new Set((permInfo.results||[]).map(r=>r.name));
      for(const p of SEED_PERMISSIONS){
        const values={id:p[0],code:p[0],name:p[4],name_ar:p[4],description:p[4],label_ar:p[4],active:1};
        const cols=['id',...['code','name','name_ar','description','label_ar','active'].filter(c=>permCols.has(c))];
        const placeholders=cols.map(()=>'?').join(',');
        const vals=cols.map(c=>values[c]);
        await env.DB.prepare(`INSERT OR IGNORE INTO permissions(${cols.join(',')}) VALUES(${placeholders})`).bind(...vals).run();
      }
      await env.DB.prepare('INSERT OR IGNORE INTO system_schema_versions(version) VALUES(1)').run();
      return true;
    })().catch(e=>{schemaPromise=null;throw e});
  }
  return schemaPromise;
}

export async function cleanupKnownOrphans(env){
  await ensureSchema(env);
  const statements=[
    `DELETE FROM role_scopes WHERE role_id NOT IN (SELECT id FROM roles) OR permission_id NOT IN (SELECT id FROM permissions)`,
    `DELETE FROM role_departments WHERE role_id NOT IN (SELECT id FROM roles) OR department_id NOT IN (SELECT id FROM departments)`,
    `DELETE FROM role_employees WHERE role_id NOT IN (SELECT id FROM roles) OR employee_id NOT IN (SELECT id FROM employees)`,
    `DELETE FROM employee_compensation WHERE employee_id NOT IN (SELECT id FROM employees) OR component_id NOT IN (SELECT id FROM payroll_components)`,
    `DELETE FROM payroll_items WHERE run_id NOT IN (SELECT id FROM payroll_runs) OR employee_id NOT IN (SELECT id FROM employees)`,
    `DELETE FROM payroll_adjustments WHERE employee_id NOT IN (SELECT id FROM employees)`,
    `DELETE FROM employee_org_assignments WHERE employee_id NOT IN (SELECT id FROM employees) OR unit_id NOT IN (SELECT id FROM org_units) OR position_id NOT IN (SELECT id FROM org_positions) OR slot_id NOT IN (SELECT id FROM org_position_slots)`,
    `DELETE FROM org_position_slots WHERE position_id NOT IN (SELECT id FROM org_positions)`,
    `DELETE FROM org_positions WHERE unit_id NOT IN (SELECT id FROM org_units)`,
    `DELETE FROM org_units WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM org_units)`
  ];
  for(const sql of statements) await env.DB.prepare(sql).run();
  return {ok:true};
}
