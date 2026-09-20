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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_definitions_company ON transaction_definitions(company_id);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES transaction_definitions(id),
  definition_name TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id),
  status TEXT NOT NULL,
  current_step_id TEXT,
  values_json TEXT NOT NULL DEFAULT '{}',
  requester_role TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_company_status ON transactions(company_id,status);
CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_id);

CREATE TABLE IF NOT EXISTS transaction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_name TEXT,
  step TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_history_tx ON transaction_history(transaction_id, id DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_company_time ON audit_logs(company_id,id DESC);

INSERT OR IGNORE INTO companies(id,name,code,timezone,currency) VALUES
('company-1','شركة النخبة للتجارة','ELITE','Asia/Riyadh','SAR');

INSERT OR IGNORE INTO employees(id,company_id,name,job,dept,branch,nationality,salary,join_date,status,manager_id) VALUES
('EMP-1001','company-1','محمد أحمد','أخصائي موارد بشرية','الموارد البشرية','الرياض','سعودي',9000,'2023-01-01','على رأس العمل',NULL),
('EMP-1002','company-1','سارة العتيبي','مدير فرع','العمليات','الرياض','سعودية',12500,'2022-05-15','على رأس العمل',NULL),
('EMP-1003','company-1','خالد الحربي','محاسب','المالية','جدة','سعودي',8500,'2024-02-10','على رأس العمل','EMP-1002'),
('EMP-1004','company-1','ريم القحطاني','منسق عمليات','العمليات','الدمام','سعودية',7200,'2025-08-01','على رأس العمل','EMP-1002');

INSERT OR IGNORE INTO transaction_definitions(id,company_id,name,category,description,active,public,version,definition_json) VALUES
('leave','company-1','طلب إجازة','الإجازات','طلب إجازة يمر على المدير المباشر ثم الموارد البشرية',1,1,1,'{"id":"leave","name":"طلب إجازة","category":"الإجازات","active":true,"public":true,"fields":[{"id":"leave_type","label":"نوع الإجازة","type":"select","required":true,"options":["سنوية","مرضية","غير مدفوعة"]},{"id":"from","label":"تاريخ البداية","type":"date","required":true},{"id":"to","label":"تاريخ النهاية","type":"date","required":true},{"id":"reason","label":"السبب","type":"textarea","required":false}],"steps":[{"id":"s1","name":"اعتماد المدير المباشر","assignee":{"type":"manager"},"actions":[{"id":"approve","label":"موافقة","next":"s2"},{"id":"reject","label":"رفض","next":"END_REJECTED"},{"id":"return","label":"إعادة للتعديل","next":"START"}]},{"id":"s2","name":"مراجعة الموارد البشرية","assignee":{"type":"role","role":"hr"},"actions":[{"id":"approve","label":"اعتماد","next":"END_APPROVED"},{"id":"return","label":"إعادة للتعديل","next":"START"},{"id":"reject","label":"رفض","next":"END_REJECTED"}]}]}');
