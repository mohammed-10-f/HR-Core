PRAGMA foreign_keys=ON;

-- Enterprise extension. Non-destructive: existing legacy tables remain intact.

CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, name_ar TEXT NOT NULL, name_en TEXT, code TEXT, manager_id TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS positions (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, department_id TEXT REFERENCES departments(id) ON DELETE SET NULL, name_ar TEXT NOT NULL, name_en TEXT, code TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS organizational_units (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 parent_id TEXT REFERENCES organizational_units(id) ON DELETE SET NULL, name_ar TEXT NOT NULL,
 name_en TEXT, code TEXT, unit_type TEXT NOT NULL DEFAULT 'department', manager_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_org_company_parent ON organizational_units(company_id,parent_id);

CREATE TABLE IF NOT EXISTS role_scopes (
 role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
 scope_type TEXT NOT NULL, scope_value TEXT, PRIMARY KEY(role_id,permission_id,scope_type,scope_value)
);
CREATE TABLE IF NOT EXISTS role_departments (
 role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
 PRIMARY KEY(role_id,department_id)
);
CREATE TABLE IF NOT EXISTS role_employees (
 role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
 PRIMARY KEY(role_id,employee_id)
);

CREATE TABLE IF NOT EXISTS permission_catalog (
 id TEXT PRIMARY KEY, module TEXT NOT NULL, resource TEXT NOT NULL, action TEXT NOT NULL, label_ar TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1, UNIQUE(resource,action)
);

CREATE TABLE IF NOT EXISTS transaction_definition_versions (
 id TEXT PRIMARY KEY, definition_id TEXT NOT NULL REFERENCES transaction_definitions(id) ON DELETE CASCADE,
 version INTEGER NOT NULL, schema_json TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(definition_id,version)
);
CREATE TABLE IF NOT EXISTS transaction_fields (
 id TEXT PRIMARY KEY, definition_id TEXT NOT NULL REFERENCES transaction_definitions(id) ON DELETE CASCADE,
 field_key TEXT NOT NULL, label_ar TEXT NOT NULL, label_en TEXT, field_type TEXT NOT NULL, required INTEGER NOT NULL DEFAULT 0,
 options_json TEXT, default_value TEXT, visible_scope TEXT, editable_scope TEXT, stage_key TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
 UNIQUE(definition_id,field_key)
);
CREATE TABLE IF NOT EXISTS workflow_definitions (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 definition_id TEXT REFERENCES transaction_definitions(id) ON DELETE CASCADE, name_ar TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workflow_steps (
 id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
 step_key TEXT NOT NULL, name_ar TEXT NOT NULL, sort_order INTEGER NOT NULL, assignee_type TEXT NOT NULL,
 role_id TEXT REFERENCES roles(id) ON DELETE SET NULL, permission_id TEXT REFERENCES permissions(id) ON DELETE SET NULL,
 scope_type TEXT, sla_hours INTEGER, actions_json TEXT NOT NULL DEFAULT '[]', conditions_json TEXT NOT NULL DEFAULT '[]',
 UNIQUE(workflow_id,step_key)
);
CREATE TABLE IF NOT EXISTS workflow_transitions (
 id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
 from_step_id TEXT NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE, action_key TEXT NOT NULL,
 to_step_id TEXT REFERENCES workflow_steps(id) ON DELETE SET NULL, terminal_status TEXT,
 UNIQUE(from_step_id,action_key)
);
CREATE TABLE IF NOT EXISTS transaction_values (
 transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, field_id TEXT NOT NULL REFERENCES transaction_fields(id) ON DELETE CASCADE,
 value_text TEXT, value_number REAL, value_date TEXT, value_json TEXT, PRIMARY KEY(transaction_id,field_id)
);
CREATE TABLE IF NOT EXISTS transaction_steps (
 id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
 workflow_step_id TEXT NOT NULL REFERENCES workflow_steps(id), status TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 completed_at TEXT, assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS transaction_actions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
 step_id TEXT REFERENCES transaction_steps(id) ON DELETE SET NULL, action_key TEXT NOT NULL, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 comment TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_components (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, code TEXT NOT NULL,
 name_ar TEXT NOT NULL, component_type TEXT NOT NULL, calculation_type TEXT NOT NULL DEFAULT 'fixed',
 gosi_base INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS employee_compensation (
 id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE, component_id TEXT NOT NULL REFERENCES payroll_components(id),
 amount REAL NOT NULL DEFAULT 0, effective_from TEXT NOT NULL, effective_to TEXT, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS payroll_rules (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, rule_code TEXT NOT NULL,
 name_ar TEXT NOT NULL, rule_type TEXT NOT NULL, value_number REAL, value_json TEXT, effective_from TEXT NOT NULL,
 effective_to TEXT, active INTEGER NOT NULL DEFAULT 1, UNIQUE(company_id,rule_code,effective_from)
);
CREATE TABLE IF NOT EXISTS payroll_periods (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, period_code TEXT NOT NULL,
 start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', locked_at TEXT, locked_by TEXT REFERENCES users(id), UNIQUE(company_id,period_code)
);
CREATE TABLE IF NOT EXISTS payroll_runs (
 id TEXT PRIMARY KEY, period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'draft',
 gross_total REAL NOT NULL DEFAULT 0, deductions_total REAL NOT NULL DEFAULT 0, gosi_total REAL NOT NULL DEFAULT 0, net_total REAL NOT NULL DEFAULT 0,
 calculated_at TEXT, reviewed_at TEXT, approved_at TEXT, locked_at TEXT, created_by TEXT REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payroll_items (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE, employee_id TEXT NOT NULL REFERENCES employees(id),
 basic REAL NOT NULL DEFAULT 0, earnings REAL NOT NULL DEFAULT 0, deductions REAL NOT NULL DEFAULT 0, gosi REAL NOT NULL DEFAULT 0, net REAL NOT NULL DEFAULT 0,
 breakdown_json TEXT NOT NULL DEFAULT '{}', validation_json TEXT NOT NULL DEFAULT '{}', UNIQUE(run_id,employee_id)
);
CREATE TABLE IF NOT EXISTS payroll_adjustments (
 id TEXT PRIMARY KEY, run_id TEXT REFERENCES payroll_runs(id) ON DELETE CASCADE, employee_id TEXT NOT NULL REFERENCES employees(id),
 adjustment_type TEXT NOT NULL, amount REAL NOT NULL, reason TEXT, created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 type TEXT NOT NULL, title_ar TEXT NOT NULL, body_ar TEXT, resource_type TEXT, resource_id TEXT, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read_at,created_at DESC);
CREATE TABLE IF NOT EXISTS system_settings (
 company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, setting_key TEXT NOT NULL, setting_value TEXT,
 updated_by TEXT REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(company_id,setting_key)
);

-- Modern permission catalog. Legacy permission rows remain for compatibility.
INSERT OR IGNORE INTO permission_catalog(id,module,resource,action,label_ar) VALUES
('dashboard.view','dashboard','dashboard','view','عرض لوحة التحكم'),
('employees.view','employees','employees','view','عرض الموظفين'),('employees.create','employees','employees','create','إضافة موظف'),('employees.edit','employees','employees','edit','تعديل موظف'),('employees.delete','employees','employees','delete','حذف موظف'),
('transactions.view','transactions','transactions','view','عرض المعاملات'),('transactions.create','transactions','transactions','create','إنشاء معاملة'),('transactions.edit','transactions','transactions','edit','تعديل معاملة'),('transactions.approve','transactions','transactions','approve','اعتماد معاملة'),('transactions.return','transactions','transactions','return','إرجاع معاملة'),('transactions.reject','transactions','transactions','reject','رفض معاملة'),('transactions.complete','transactions','transactions','complete','إكمال معاملة'),
('payroll.view','payroll','payroll','view','عرض الرواتب'),('payroll.calculate','payroll','payroll','calculate','احتساب الرواتب'),('payroll.review','payroll','payroll','review','مراجعة الرواتب'),('payroll.approve','payroll','payroll','approve','اعتماد الرواتب'),('payroll.lock','payroll','payroll','lock','إغلاق فترة الرواتب'),('payroll.export','payroll','payroll','export','تصدير الرواتب'),
('reports.view','reports','reports','view','عرض التقارير'),('reports.export','reports','reports','export','تصدير التقارير'),
('users.view','users','users','view','عرض المستخدمين'),('users.create','users','users','create','إنشاء مستخدم'),('users.edit','users','users','edit','تعديل مستخدم'),('users.disable','users','users','disable','تعطيل مستخدم'),
('roles.view','roles','roles','view','عرض الأدوار'),('roles.create','roles','roles','create','إنشاء دور'),('roles.edit','roles','roles','edit','تعديل دور'),('roles.delete','roles','roles','delete','حذف دور'),
('settings.view','settings','settings','view','عرض الإعدادات'),('settings.manage','settings','settings','manage','إدارة الإعدادات'),('audit.view','audit','audit','view','عرض سجل العمليات');

-- Ensure legacy permissions referenced by the original application exist in the catalog.
INSERT OR IGNORE INTO permissions(id,name,description) SELECT id,label_ar,'Enterprise permission' FROM permission_catalog;
INSERT OR IGNORE INTO role_permissions(role_id,permission_id,scope) SELECT 'super_admin',id,'company' FROM permissions WHERE NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id='super_admin' AND rp.permission_id=permissions.id);
