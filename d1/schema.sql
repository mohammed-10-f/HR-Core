PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  currency TEXT NOT NULL DEFAULT 'SAR',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job TEXT NOT NULL,
  dept TEXT NOT NULL,
  branch TEXT NOT NULL,
  nationality TEXT,
  salary REAL NOT NULL DEFAULT 0,
  join_date TEXT,
  status TEXT NOT NULL DEFAULT 'على رأس العمل',
  manager_id TEXT REFERENCES employees(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'company',
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_employee ON users(employee_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS transaction_definitions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  public INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  definition_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_definitions_company ON transaction_definitions(company_id);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES transaction_definitions(id),
  definition_name TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id),
  requester_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  current_step_id TEXT,
  values_json TEXT NOT NULL DEFAULT '{}',
  requester_role TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_company_status ON transactions(company_id,status);
CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_requester ON transactions(requester_user_id);

CREATE TABLE IF NOT EXISTS transaction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  step TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_history_tx ON transaction_history(transaction_id, id DESC);

CREATE TABLE IF NOT EXISTS transaction_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  author_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_company_time ON audit_logs(company_id,id DESC);

CREATE TABLE IF NOT EXISTS leave_types (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  paid INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  opening REAL NOT NULL DEFAULT 0,
  accrued REAL NOT NULL DEFAULT 0,
  used REAL NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

INSERT OR IGNORE INTO companies(id,name,code,timezone,currency)
VALUES ('company-1','شركة النخبة للتجارة','ELITE','Asia/Riyadh','SAR');

INSERT OR IGNORE INTO employees(id,company_id,name,job,dept,branch,nationality,salary,join_date,status,manager_id) VALUES
('EMP-1001','company-1','محمد أحمد','أخصائي موارد بشرية','الموارد البشرية','الرياض','سعودي',9000,'2023-01-01','على رأس العمل',NULL),
('EMP-1002','company-1','سارة العتيبي','مدير فرع','العمليات','الرياض','سعودية',12500,'2022-05-15','على رأس العمل',NULL),
('EMP-1003','company-1','خالد الحربي','محاسب','المالية','جدة','سعودي',8500,'2024-02-10','على رأس العمل','EMP-1002'),
('EMP-1004','company-1','ريم القحطاني','منسق عمليات','العمليات','الدمام','سعودية',7200,'2025-08-01','على رأس العمل','EMP-1002');

INSERT OR IGNORE INTO roles(id,name,description) VALUES
('super_admin','مدير النظام','صلاحيات كاملة'),
('hr','مدير الموارد البشرية','إدارة عمليات الموارد البشرية'),
('manager','مدير مباشر','إدارة فريقه والمعاملات الموجهة إليه'),
('employee','موظف','الخدمات والمعاملات الذاتية');

INSERT OR IGNORE INTO permissions(id,name,description) VALUES
('employees.view','عرض الموظفين','عرض بيانات الموظفين'),
('employees.create','إضافة موظف','إضافة موظفين'),
('employees.view_salary','عرض الرواتب','عرض بيانات الرواتب'),
('transactions.view','عرض المعاملات','عرض المعاملات ضمن النطاق'),
('transactions.create','إنشاء معاملة','إنشاء معاملة'),
('transactions.act','تنفيذ إجراءات المعاملة','اعتماد أو رفض أو إعادة'),
('transactions.builder','منشئ المعاملات','إدارة تعريفات المعاملات'),
('leaves.view','عرض الإجازات','عرض الإجازات'),
('payroll.view','عرض الرواتب','الوصول للرواتب'),
('eos.view','نهاية الخدمة','الوصول لنهاية الخدمة'),
('documents.view','عرض المستندات','الوصول للمستندات'),
('reports.view','التقارير','الوصول للتقارير'),
('settings.view','الإعدادات','الوصول للإعدادات'),
('users.manage','إدارة المستخدمين','إدارة المستخدمين'),
('roles.manage','إدارة الأدوار','إدارة الأدوار والصلاحيات'),
('audit.view','سجل التدقيق','عرض سجل التدقيق');

INSERT OR IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT 'super_admin',id,'company' FROM permissions;

INSERT OR IGNORE INTO role_permissions(role_id,permission_id,scope) VALUES
('hr','employees.view','company'),
('hr','employees.create','company'),
('hr','employees.view_salary','company'),
('hr','transactions.view','company'),
('hr','transactions.create','company'),
('hr','transactions.act','company'),
('hr','transactions.builder','company'),
('hr','leaves.view','company'),
('hr','payroll.view','company'),
('hr','eos.view','company'),
('hr','documents.view','company'),
('hr','reports.view','company'),
('hr','settings.view','company'),
('hr','users.manage','company'),
('hr','audit.view','company'),
('manager','employees.view','managed_employees'),
('manager','transactions.view','managed_employees'),
('manager','transactions.create','self'),
('manager','transactions.act','managed_employees'),
('manager','leaves.view','managed_employees'),
('manager','documents.view','managed_employees'),
('manager','reports.view','managed_employees'),
('employee','transactions.view','self'),
('employee','transactions.create','self'),
('employee','leaves.view','self'),
('employee','documents.view','self'),
('employee','payroll.view','self');

INSERT OR IGNORE INTO users(id,company_id,username,display_name,pin_hash,role_id,employee_id,active)
VALUES ('USR-ADMIN','company-1','admin','مدير النظام','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','super_admin','EMP-1001',1);

INSERT OR IGNORE INTO transaction_definitions(id,company_id,name,category,description,active,public,version,definition_json)
VALUES
('leave','company-1','طلب إجازة','الإجازات','طلب إجازة يمر على المدير المباشر ثم الموارد البشرية',1,1,1,
'{"id":"leave","name":"طلب إجازة","category":"الإجازات","active":true,"public":true,"fields":[{"id":"leave_type","label":"نوع الإجازة","type":"select","required":true,"options":["سنوية","مرضية","غير مدفوعة"]},{"id":"from","label":"تاريخ البداية","type":"date","required":true},{"id":"to","label":"تاريخ النهاية","type":"date","required":true},{"id":"reason","label":"السبب","type":"textarea","required":false},{"id":"attachment","label":"مرفق مؤيد","type":"file","required":false}],"steps":[{"id":"s1","name":"اعتماد المدير المباشر","assignee":{"type":"manager"},"actions":[{"id":"approve","label":"موافقة","next":"s2"},{"id":"reject","label":"رفض","next":"END_REJECTED"},{"id":"return","label":"إعادة للتعديل","next":"START"}]},{"id":"s2","name":"مراجعة الموارد البشرية","assignee":{"type":"role","role":"hr"},"actions":[{"id":"approve","label":"اعتماد","next":"s3"},{"id":"return","label":"إعادة للتعديل","next":"START"},{"id":"reject","label":"رفض","next":"END_REJECTED"}]},{"id":"s3","name":"تنفيذ وإغلاق","assignee":{"type":"role","role":"hr"},"actions":[{"id":"close","label":"تنفيذ وإغلاق","next":"END_APPROVED"}]}]}');

INSERT OR IGNORE INTO leave_types(id,company_id,name,paid,active)
VALUES ('annual','company-1','سنوية',1,1),('sick','company-1','مرضية',1,1),('unpaid','company-1','غير مدفوعة',0,1);
