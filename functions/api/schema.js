/*
 * HR Core D1 Schema Manager
 *
 * Design rules:
 * 1) The application owns a versioned schema manifest.
 * 2) Missing tables/columns/indexes are added automatically and idempotently.
 * 3) Existing business data is never dropped automatically.
 * 4) Legacy schemas are adapted through compatibility metadata instead of being
 *    force-converted at runtime.
 * 5) Destructive migrations must be explicit and versioned; they are never
 *    inferred from a missing column or failed query.
 */

const PERMISSIONS = [
 ['dashboard.view','dashboard','dashboard','view','عرض لوحة التحكم'],
 ['employees.view','employees','employees','view','عرض الموظفين'],['employees.create','employees','employees','create','إضافة موظف'],['employees.edit','employees','employees','edit','تعديل موظف'],['employees.delete','employees','employees','delete','حذف موظف'],
 ['departments.view','organization','departments','view','عرض الإدارات'],['departments.create','organization','departments','create','إضافة إدارة'],['departments.edit','organization','departments','edit','تعديل إدارة'],['departments.delete','organization','departments','delete','حذف إدارة'],
 ['positions.view','organization','positions','view','عرض الوظائف'],['positions.create','organization','positions','create','إضافة وظيفة'],['positions.edit','organization','positions','edit','تعديل وظيفة'],['positions.delete','organization','positions','delete','حذف وظيفة'],
 ['organization.view','organization','organization','view','عرض الهيكل التنظيمي'],['organization.manage','organization','organization','manage','إدارة الهيكل التنظيمي'],['organization.assign','organization','organization','assign','تسكين الموظفين'],
 ['transactions.view','transactions','transactions','view','عرض المعاملات'],['transactions.create','transactions','transactions','create','إنشاء معاملة'],['transactions.edit','transactions','transactions','edit','تعديل معاملة'],['transactions.approve','transactions','transactions','approve','اعتماد معاملة'],['transactions.return','transactions','transactions','return','إرجاع معاملة'],['transactions.reject','transactions','transactions','reject','رفض معاملة'],['transactions.complete','transactions','transactions','complete','إكمال معاملة'],['transactions.builder','transactions','transaction_builder','manage','منشئ المعاملات'],
 ['payroll.view','payroll','payroll','view','عرض الرواتب'],['payroll.calculate','payroll','payroll','calculate','احتساب الرواتب'],['payroll.review','payroll','payroll','review','مراجعة الرواتب'],['payroll.approve','payroll','payroll','approve','اعتماد الرواتب'],['payroll.lock','payroll','payroll','lock','إغلاق فترة الرواتب'],['payroll.export','payroll','payroll','export','تصدير الرواتب'],
 ['reports.view','reports','reports','view','عرض التقارير'],['reports.export','reports','reports','export','تصدير التقارير'],
 ['users.view','users','users','view','عرض المستخدمين'],['users.create','users','users','create','إنشاء مستخدم'],['users.edit','users','users','edit','تعديل مستخدم'],['users.disable','users','users','disable','تعطيل مستخدم'],
 ['roles.view','roles','roles','view','عرض الأدوار'],['roles.create','roles','roles','create','إنشاء دور'],['roles.edit','roles','roles','edit','تعديل دور'],['roles.delete','roles','roles','delete','حذف دور'],
 ['settings.view','settings','settings','view','عرض الإعدادات'],['settings.manage','settings','settings','manage','إدارة الإعدادات'],['audit.view','audit','audit','view','عرض سجل العمليات'],['system.maintenance','system','system','maintenance','صيانة قاعدة البيانات']
];

const TABLES = {
 schema_migrations: `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 schema_issues: `CREATE TABLE IF NOT EXISTS schema_issues (id INTEGER PRIMARY KEY AUTOINCREMENT, object_type TEXT NOT NULL, object_name TEXT NOT NULL, issue TEXT NOT NULL, details TEXT, first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at TEXT)`,
 schema_lock: `CREATE TABLE IF NOT EXISTS schema_lock (id INTEGER PRIMARY KEY CHECK(id=1), lock_token TEXT, locked_at TEXT)`,
 permission_catalog: `CREATE TABLE IF NOT EXISTS permission_catalog (id TEXT PRIMARY KEY,module TEXT NOT NULL,resource TEXT NOT NULL,action TEXT NOT NULL,label_ar TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1, UNIQUE(resource,action))`,
 permission_map: `CREATE TABLE IF NOT EXISTS permission_map (catalog_id TEXT PRIMARY KEY, legacy_permission_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 role_scopes: `CREATE TABLE IF NOT EXISTS role_scopes (role_id INTEGER NOT NULL, permission_id TEXT NOT NULL, scope_type TEXT NOT NULL, scope_value TEXT, PRIMARY KEY(role_id,permission_id,scope_type,scope_value))`,
 role_departments: `CREATE TABLE IF NOT EXISTS role_departments (role_id INTEGER NOT NULL, department_id TEXT NOT NULL, PRIMARY KEY(role_id,department_id))`,
 role_employees: `CREATE TABLE IF NOT EXISTS role_employees (role_id INTEGER NOT NULL, employee_id TEXT NOT NULL, PRIMARY KEY(role_id,employee_id))`,
 transaction_definition_versions: `CREATE TABLE IF NOT EXISTS transaction_definition_versions (id TEXT PRIMARY KEY,definition_id TEXT NOT NULL,version INTEGER NOT NULL,schema_json TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(definition_id,version))`,
 transaction_fields: `CREATE TABLE IF NOT EXISTS transaction_fields (id TEXT PRIMARY KEY,definition_id TEXT NOT NULL,field_key TEXT NOT NULL,label_ar TEXT NOT NULL,label_en TEXT,field_type TEXT NOT NULL,required INTEGER NOT NULL DEFAULT 0,options_json TEXT,default_value TEXT,visible_scope TEXT,editable_scope TEXT,stage_key TEXT,sort_order INTEGER NOT NULL DEFAULT 0,UNIQUE(definition_id,field_key))`,
 workflow_definitions: `CREATE TABLE IF NOT EXISTS workflow_definitions (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,definition_id TEXT,name_ar TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 workflow_steps: `CREATE TABLE IF NOT EXISTS workflow_steps (id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL,step_key TEXT NOT NULL,name_ar TEXT NOT NULL,sort_order INTEGER NOT NULL,assignee_type TEXT NOT NULL,role_id INTEGER,permission_id TEXT,scope_type TEXT,sla_hours INTEGER,actions_json TEXT NOT NULL DEFAULT '[]',conditions_json TEXT NOT NULL DEFAULT '[]',UNIQUE(workflow_id,step_key))`,
 workflow_transitions: `CREATE TABLE IF NOT EXISTS workflow_transitions (id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL,from_step_id TEXT NOT NULL,action_key TEXT NOT NULL,to_step_id TEXT,terminal_status TEXT,UNIQUE(from_step_id,action_key))`,
 transaction_values: `CREATE TABLE IF NOT EXISTS transaction_values (transaction_id TEXT NOT NULL,field_id TEXT NOT NULL,value_text TEXT,value_number REAL,value_date TEXT,value_json TEXT,PRIMARY KEY(transaction_id,field_id))`,
 transaction_steps: `CREATE TABLE IF NOT EXISTS transaction_steps (id TEXT PRIMARY KEY,transaction_id TEXT NOT NULL,workflow_step_id TEXT NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,assigned_user_id INTEGER)`,
 transaction_actions: `CREATE TABLE IF NOT EXISTS transaction_actions (id INTEGER PRIMARY KEY AUTOINCREMENT,transaction_id TEXT NOT NULL,step_id TEXT,action_key TEXT NOT NULL,actor_user_id INTEGER,comment TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 payroll_components: `CREATE TABLE IF NOT EXISTS payroll_components (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,code TEXT NOT NULL,name_ar TEXT NOT NULL,component_type TEXT NOT NULL,calculation_type TEXT NOT NULL DEFAULT 'fixed',gosi_base INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,UNIQUE(company_id,code))`,
 employee_compensation: `CREATE TABLE IF NOT EXISTS employee_compensation (id TEXT PRIMARY KEY,employee_id TEXT NOT NULL,component_id TEXT NOT NULL,amount REAL NOT NULL DEFAULT 0,effective_from TEXT NOT NULL,effective_to TEXT,active INTEGER NOT NULL DEFAULT 1)`,
 payroll_rules: `CREATE TABLE IF NOT EXISTS payroll_rules (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,rule_code TEXT NOT NULL,name_ar TEXT NOT NULL,rule_type TEXT NOT NULL,value_number REAL,value_json TEXT,effective_from TEXT NOT NULL,effective_to TEXT,active INTEGER NOT NULL DEFAULT 1,UNIQUE(company_id,rule_code,effective_from))`,
 payroll_periods: `CREATE TABLE IF NOT EXISTS payroll_periods (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,period_code TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',locked_at TEXT,locked_by INTEGER,UNIQUE(company_id,period_code))`,
 payroll_runs: `CREATE TABLE IF NOT EXISTS payroll_runs (id TEXT PRIMARY KEY,period_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',gross_total REAL NOT NULL DEFAULT 0,deductions_total REAL NOT NULL DEFAULT 0,gosi_total REAL NOT NULL DEFAULT 0,net_total REAL NOT NULL DEFAULT 0,calculated_at TEXT,reviewed_at TEXT,approved_at TEXT,locked_at TEXT,created_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 payroll_items: `CREATE TABLE IF NOT EXISTS payroll_items (id TEXT PRIMARY KEY,run_id TEXT NOT NULL,employee_id TEXT NOT NULL,basic REAL NOT NULL DEFAULT 0,earnings REAL NOT NULL DEFAULT 0,deductions REAL NOT NULL DEFAULT 0,gosi REAL NOT NULL DEFAULT 0,net REAL NOT NULL DEFAULT 0,breakdown_json TEXT NOT NULL DEFAULT '{}',validation_json TEXT NOT NULL DEFAULT '{}',UNIQUE(run_id,employee_id))`,
 payroll_adjustments: `CREATE TABLE IF NOT EXISTS payroll_adjustments (id TEXT PRIMARY KEY,run_id TEXT,employee_id TEXT NOT NULL,adjustment_type TEXT NOT NULL,amount REAL NOT NULL,reason TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 notifications: `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,user_id INTEGER NOT NULL,type TEXT NOT NULL,title_ar TEXT NOT NULL,body_ar TEXT,resource_type TEXT,resource_id TEXT,read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 system_settings: `CREATE TABLE IF NOT EXISTS system_settings (company_id INTEGER NOT NULL,setting_key TEXT NOT NULL,setting_value TEXT,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(company_id,setting_key))`,
 org_units: `CREATE TABLE IF NOT EXISTS org_units (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,parent_id TEXT,name_ar TEXT NOT NULL,name_en TEXT,code TEXT,unit_type TEXT NOT NULL DEFAULT 'department',manager_employee_id TEXT,active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 org_positions: `CREATE TABLE IF NOT EXISTS org_positions (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,unit_id TEXT NOT NULL,title_ar TEXT NOT NULL,title_en TEXT,code TEXT,level_name TEXT,approved_headcount INTEGER NOT NULL DEFAULT 1,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 org_position_slots: `CREATE TABLE IF NOT EXISTS org_position_slots (id TEXT PRIMARY KEY,position_id TEXT NOT NULL,slot_code TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'vacant',employee_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(position_id,slot_code))`,
 employee_org_assignments: `CREATE TABLE IF NOT EXISTS employee_org_assignments (id TEXT PRIMARY KEY,company_id INTEGER NOT NULL,employee_id TEXT NOT NULL,unit_id TEXT NOT NULL,position_id TEXT NOT NULL,slot_id TEXT NOT NULL,effective_from TEXT NOT NULL,effective_to TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 audit_logs: `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,company_id INTEGER,actor_user_id INTEGER,actor_name TEXT,action TEXT NOT NULL,entity_type TEXT,entity_id TEXT,details TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 system_schema_versions: `CREATE TABLE IF NOT EXISTS system_schema_versions (version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
};

// Columns the runtime actually relies on in legacy tables. Existing tables are
// altered only by adding nullable/defaulted columns. No type changes or drops.
const APP_SCHEMA_VERSION = 2;

const COLUMNS = {
 users: {password_hash:'TEXT',display_name:'TEXT',email:'TEXT',employee_id:'INTEGER',role_id:'INTEGER',company_id:'INTEGER',active:'INTEGER NOT NULL DEFAULT 1',last_login_at:'TEXT',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP',updated_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 roles: {code:'TEXT',name_ar:'TEXT',name_en:'TEXT',description:'TEXT',is_system:'INTEGER NOT NULL DEFAULT 0',active:'INTEGER NOT NULL DEFAULT 1',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 companies: {name_ar:'TEXT',name_en:'TEXT',commercial_name:'TEXT',commercial_registration:'TEXT',tax_number:'TEXT',phone:'TEXT',email:'TEXT',address:'TEXT',city:'TEXT',country:"TEXT DEFAULT 'Saudi Arabia'",active:'INTEGER NOT NULL DEFAULT 1',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP',updated_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 employees: {employee_no:'TEXT',name_ar:'TEXT',name_en:'TEXT',full_name:'TEXT',status:"TEXT DEFAULT 'على رأس العمل'",company_id:'INTEGER',department_id:'INTEGER',position_id:'INTEGER',basic_salary:'REAL DEFAULT 0',housing_allowance:'REAL DEFAULT 0',transport_allowance:'REAL DEFAULT 0',gosi_enabled:'INTEGER NOT NULL DEFAULT 0',gosi_rate:'REAL DEFAULT 0',email:'TEXT',phone:'TEXT',active:'INTEGER NOT NULL DEFAULT 1'},
 sessions: {token:'TEXT',user_id:'INTEGER',expires_at:'TEXT',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 permissions: {code:'TEXT',name_ar:'TEXT',label_ar:'TEXT',description:'TEXT',active:'INTEGER NOT NULL DEFAULT 1'},
 role_permissions: {scope:'TEXT DEFAULT company'},
 transaction_definitions: {name:'TEXT',name_ar:'TEXT',name_en:'TEXT',code:'TEXT',category:"TEXT DEFAULT 'عام'",description:'TEXT',active:'INTEGER NOT NULL DEFAULT 1',public:'INTEGER NOT NULL DEFAULT 1',version:'INTEGER NOT NULL DEFAULT 1',definition_json:"TEXT DEFAULT '{}'",company_id:'INTEGER'},
 transactions: {company_id:'INTEGER',definition_id:'TEXT',definition_name:'TEXT',employee_id:'TEXT',requester_user_id:'INTEGER',requester_role:'TEXT',status:'TEXT',current_step_id:'TEXT',values_json:"TEXT DEFAULT '{}'",created_by:'INTEGER',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP',updated_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 transaction_history: {transaction_id:'TEXT',action:'TEXT',actor_user_id:'INTEGER',actor_name:'TEXT',step:'TEXT',comment:'TEXT',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 transaction_comments: {transaction_id:'TEXT',user_id:'INTEGER',comment:'TEXT',created_at:'TEXT DEFAULT CURRENT_TIMESTAMP'},
 departments: {company_id:'INTEGER',name_ar:'TEXT',name_en:'TEXT',code:'TEXT',active:'INTEGER NOT NULL DEFAULT 1'},
 positions: {company_id:'INTEGER',department_id:'INTEGER',title_ar:'TEXT',title_en:'TEXT',code:'TEXT',active:'INTEGER NOT NULL DEFAULT 1'},
 leave_types: {company_id:'INTEGER',name_ar:'TEXT',active:'INTEGER NOT NULL DEFAULT 1'},
 leave_balances: {employee_id:'INTEGER',leave_type_id:'INTEGER',balance:'REAL DEFAULT 0'}
};

let schemaPromise;
const quote = s => '"' + String(s).replaceAll('"','""') + '"';

async function tableInfo(env, table){
  try { const r=await env.DB.prepare(`PRAGMA table_info(${quote(table)})`).all(); return r.results||[]; }
  catch { return []; }
}
async function hasTable(env, table){
  const r=await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(table).first();
  return !!r;
}
async function recordIssue(env,type,name,issue,details=''){
  try { await env.DB.prepare(`INSERT INTO schema_issues(object_type,object_name,issue,details) VALUES(?,?,?,?)`).bind(type,name,issue,details).run(); } catch {}
}
async function addColumn(env, table, column, definition){
  const cols=await tableInfo(env,table); if(cols.some(c=>c.name===column)) return false;
  try { await env.DB.prepare(`ALTER TABLE ${quote(table)} ADD COLUMN ${quote(column)} ${definition}`).run(); return true; }
  catch(e){ await recordIssue(env,'column',`${table}.${column}`,'ADD_COLUMN_FAILED',e.message); return false; }
}
async function ensureTable(env,name,sql){
  try { await env.DB.prepare(sql).run(); return true; }
  catch(e){ await recordIssue(env,'table',name,'CREATE_TABLE_FAILED',e.message); return false; }
}
async function ensureIndex(env,sql,name){
  try { await env.DB.prepare(sql).run(); return true; }
  catch(e){ await recordIssue(env,'index',name,'CREATE_INDEX_FAILED',e.message); return false; }
}

async function reconcileLegacyColumns(env){
  for(const [table,cols] of Object.entries(COLUMNS)){
    if(!await hasTable(env,table)) continue;
    for(const [column,definition] of Object.entries(cols)) await addColumn(env,table,column,definition);
  }
}

async function syncDataAliases(env){
  // Keep legacy and canonical names synchronized without destructive changes.
  if(await hasTable(env,'transaction_definitions')){
    const cols=new Set((await tableInfo(env,'transaction_definitions')).map(c=>c.name));
    if(cols.has('name') && cols.has('name_ar')){
      await env.DB.prepare(`UPDATE transaction_definitions SET name=name_ar WHERE (name IS NULL OR name='') AND name_ar IS NOT NULL`).run().catch(()=>{});
      await env.DB.prepare(`UPDATE transaction_definitions SET name_ar=name WHERE (name_ar IS NULL OR name_ar='') AND name IS NOT NULL`).run().catch(()=>{});
    }
    if(cols.has('definition_json')) await env.DB.prepare(`UPDATE transaction_definitions SET definition_json='{}' WHERE definition_json IS NULL OR definition_json=''`).run().catch(()=>{});
  }
}

async function syncPermissionCatalog(env){
  const info=await tableInfo(env,'permissions');
  const names=new Set(info.map(x=>x.name));
  const findLegacy=async(p)=>{
    if(!info.length)return null;
    const candidates=[];
    if(names.has('code')) candidates.push(['code',p[0]]);
    if(names.has('name')) candidates.push(['name',p[0]],['name',p[4]]);
    if(names.has('name_ar')) candidates.push(['name_ar',p[4]],['name_ar',p[0]]);
    if(names.has('label_ar')) candidates.push(['label_ar',p[4]],['label_ar',p[0]]);
    if(!candidates.length)return null;
    const where=candidates.map(x=>`${quote(x[0])}=?`).join(' OR ');
    const row=await env.DB.prepare(`SELECT * FROM permissions WHERE ${where} LIMIT 1`).bind(...candidates.map(x=>x[1])).first().catch(()=>null);
    return row||null;
  };
  for(const p of PERMISSIONS){
    await env.DB.prepare(`INSERT OR IGNORE INTO permission_catalog(id,module,resource,action,label_ar) VALUES(?,?,?,?,?)`).bind(...p).run();
    let existing=await findLegacy(p);
    if(existing){ await env.DB.prepare(`INSERT OR IGNORE INTO permission_map(catalog_id,legacy_permission_id) VALUES(?,?)`).bind(p[0],String(existing.id)).run(); continue; }
    if(!info.length) continue;
    try{
      const cols=[]; const vals=[];
      const idCol=info.find(x=>x.pk===1)?.name;
      if(idCol && !names.has('code') && !names.has('name') && !names.has('name_ar') && !names.has('label_ar')){
        const numeric=String(info.find(x=>x.name===idCol)?.type||'').toUpperCase().includes('INT');
        cols.push(idCol); vals.push(numeric ? Number((await env.DB.prepare(`SELECT COALESCE(MAX(${quote(idCol)}),0)+1 n FROM permissions`).first())?.n||1) : p[0]);
      } else if(idCol && info.find(x=>x.name===idCol)?.notnull && !info.find(x=>x.name===idCol)?.dflt_value){
        const numeric=String(info.find(x=>x.name===idCol)?.type||'').toUpperCase().includes('INT');
        cols.push(idCol); vals.push(numeric ? Number((await env.DB.prepare(`SELECT COALESCE(MAX(${quote(idCol)}),0)+1 n FROM permissions`).first())?.n||1) : p[0]);
      }
      if(names.has('code')){cols.push('code');vals.push(p[0]);}
      if(names.has('name')){cols.push('name');vals.push(p[4]);}
      if(names.has('name_ar')){cols.push('name_ar');vals.push(p[4]);}
      if(names.has('label_ar')){cols.push('label_ar');vals.push(p[4]);}
      if(names.has('description')){cols.push('description');vals.push(p[4]);}
      if(names.has('active')){cols.push('active');vals.push(1);}
      if(cols.length){
        await env.DB.prepare(`INSERT INTO permissions(${cols.map(quote).join(',')}) VALUES(${cols.map(()=>'?').join(',')})`).bind(...vals).run();
        existing=await findLegacy(p);
        if(existing) await env.DB.prepare(`INSERT OR IGNORE INTO permission_map(catalog_id,legacy_permission_id) VALUES(?,?)`).bind(p[0],String(existing.id)).run();
      }
    }catch(e){ await recordIssue(env,'permission',p[0],'SEED_PERMISSION_FAILED',e.message); }
  }
}
async function migrateRolePermissionKeys(env){
  // If role_permissions.permission_id is numeric, application code can still use
  // catalog ids through permission_map. Do not rewrite legacy rows automatically.
  const info=await tableInfo(env,'role_permissions');
  const pinfo=await tableInfo(env,'permissions');
  if(!info.length||!pinfo.length) return;
  const pcol=info.find(x=>x.name==='permission_id');
  const idcol=pinfo.find(x=>x.pk===1)?.name;
  if(!pcol||!idcol) return;
  // If the legacy column is text, catalog ids can be used directly.
  if(String(pcol.type||'').toUpperCase().includes('TEXT')){
    for(const p of PERMISSIONS){
      const map=await env.DB.prepare('SELECT legacy_permission_id FROM permission_map WHERE catalog_id=?').bind(p[0]).first();
      if(map?.legacy_permission_id && map.legacy_permission_id!==p[0]){
        // Only add a canonical row; never delete the old one.
        const roleRows=await env.DB.prepare(`SELECT DISTINCT role_id,scope FROM role_permissions WHERE permission_id=?`).bind(map.legacy_permission_id).all().catch(()=>({results:[]}));
        for(const r of roleRows.results||[]) await env.DB.prepare(`INSERT OR IGNORE INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,?)`).bind(r.role_id,p[0],r.scope||'company').run().catch(()=>{});
      }
    }
  }
}

export async function ensureSchema(env){
  if(!schemaPromise){
    schemaPromise=(async()=>{
      // Fast path: once the deployed schema version is reconciled, normal requests
      // do not run dozens of PRAGMA/ALTER/seed operations.
      try {
        const current=await env.DB.prepare('SELECT MAX(version) AS version FROM system_schema_versions').first();
        if(Number(current?.version||0) >= APP_SCHEMA_VERSION) return true;
      } catch {}

      // Slow path runs only on first deployment or after a schema-version bump.
      for(const [name,sql] of Object.entries(TABLES)) await ensureTable(env,name,sql);
      await reconcileLegacyColumns(env);
      await syncDataAliases(env);
      await syncPermissionCatalog(env);
      await migrateRolePermissionKeys(env);
      await ensureIndex(env,`CREATE INDEX IF NOT EXISTS idx_schema_issues_open ON schema_issues(resolved_at,last_seen_at)`,`idx_schema_issues_open`);
      await ensureIndex(env,`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read_at,created_at DESC)`,`idx_notifications_user`);
      await ensureIndex(env,`CREATE INDEX IF NOT EXISTS idx_org_units_company_parent ON org_units(company_id,parent_id)`,`idx_org_units_company_parent`);
      await ensureIndex(env,`CREATE INDEX IF NOT EXISTS idx_org_positions_unit ON org_positions(unit_id,active)`,`idx_org_positions_unit`);
      await ensureIndex(env,`CREATE INDEX IF NOT EXISTS idx_org_slots_position ON org_position_slots(position_id,status)`,`idx_org_slots_position`);
      await ensureIndex(env,`CREATE INDEX IF NOT EXISTS idx_employee_org_company ON employee_org_assignments(company_id,active)`,`idx_employee_org_company`);
      await ensureIndex(env,`CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_org_active ON employee_org_assignments(employee_id) WHERE active=1`,`ux_employee_org_active`);
      await ensureIndex(env,`CREATE UNIQUE INDEX IF NOT EXISTS ux_slot_active_assignment ON employee_org_assignments(slot_id) WHERE active=1`,`ux_slot_active_assignment`);

      await env.DB.prepare(`INSERT OR IGNORE INTO schema_migrations(version,name) VALUES(1,'baseline-enterprise-schema')`).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO schema_migrations(version,name) VALUES(2,'runtime-compatibility-and-fast-schema-gate')`).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO system_schema_versions(version) VALUES(?)`).bind(APP_SCHEMA_VERSION).run();
      return true;
    })().catch(e=>{schemaPromise=null;throw e});
  }
  return schemaPromise;
}

export async function resolvePermissionId(env, catalogId){
  await ensureSchema(env);
  const row=await env.DB.prepare('SELECT legacy_permission_id FROM permission_map WHERE catalog_id=?').bind(catalogId).first().catch(()=>null);
  return row?.legacy_permission_id ?? catalogId;
}

export async function schemaHealth(env){
  await ensureSchema(env);
  const version=await env.DB.prepare('SELECT COALESCE(MAX(version),0) version FROM schema_migrations').first().catch(()=>({version:0}));
  const issues=await env.DB.prepare(`SELECT object_type,object_name,issue,details,first_seen_at,last_seen_at FROM schema_issues WHERE resolved_at IS NULL ORDER BY last_seen_at DESC LIMIT 100`).all().catch(()=>({results:[]}));
  const tables=await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
  return {version:Number(version?.version||0),issues:issues.results||[],tables:(tables.results||[]).map(x=>x.name)};
}

export async function cleanupKnownOrphans(env){
  await ensureSchema(env);
  const statements=[
    [`role_scopes`,`DELETE FROM role_scopes WHERE role_id NOT IN (SELECT id FROM roles)`],
    [`role_departments`,`DELETE FROM role_departments WHERE role_id NOT IN (SELECT id FROM roles)`],
    [`role_employees`,`DELETE FROM role_employees WHERE role_id NOT IN (SELECT id FROM roles)`],
    [`employee_compensation`,`DELETE FROM employee_compensation WHERE employee_id NOT IN (SELECT id FROM employees) OR component_id NOT IN (SELECT id FROM payroll_components)`],
    [`payroll_items`,`DELETE FROM payroll_items WHERE run_id NOT IN (SELECT id FROM payroll_runs) OR employee_id NOT IN (SELECT id FROM employees)`],
    [`payroll_adjustments`,`DELETE FROM payroll_adjustments WHERE employee_id NOT IN (SELECT id FROM employees)`],
    [`employee_org_assignments`,`DELETE FROM employee_org_assignments WHERE employee_id NOT IN (SELECT id FROM employees) OR unit_id NOT IN (SELECT id FROM org_units) OR position_id NOT IN (SELECT id FROM org_positions) OR slot_id NOT IN (SELECT id FROM org_position_slots)`]
  ];
  let cleaned=0;
  for(const [name,sql] of statements){try{const r=await env.DB.prepare(sql).run();cleaned+=Number(r.meta?.changes||0)}catch(e){await recordIssue(env,'cleanup',name,'CLEANUP_FAILED',e.message)}}
  return {cleaned};
}
