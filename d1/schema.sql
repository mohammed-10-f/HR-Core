PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- =========================================================
-- HR CORE - D1 DATABASE SCHEMA
-- Database: hr-core
-- =========================================================


-- =========================================================
-- 1. COMPANIES
-- =========================================================

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    commercial_name TEXT,
    commercial_registration TEXT,
    tax_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Saudi Arabia',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 2. ORGANIZATIONAL STRUCTURE
-- =========================================================

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    parent_id INTEGER,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    code TEXT,
    manager_employee_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    FOREIGN KEY (parent_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    department_id INTEGER,
    title_ar TEXT NOT NULL,
    title_en TEXT,
    code TEXT,
    level TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 3. EMPLOYEES
-- =========================================================

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    employee_number TEXT NOT NULL UNIQUE,

    first_name_ar TEXT NOT NULL,
    middle_name_ar TEXT,
    last_name_ar TEXT,

    first_name_en TEXT,
    middle_name_en TEXT,
    last_name_en TEXT,

    national_id TEXT,
    nationality TEXT,
    gender TEXT,
    date_of_birth TEXT,

    email TEXT,
    personal_email TEXT,
    mobile TEXT,

    department_id INTEGER,
    position_id INTEGER,
    manager_id INTEGER,

    employment_status TEXT NOT NULL DEFAULT 'active',
    employment_type TEXT,

    hire_date TEXT,
    probation_end_date TEXT,
    termination_date TEXT,

    basic_salary REAL DEFAULT 0,
    housing_allowance REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    other_allowances REAL DEFAULT 0,

    iban TEXT,

    photo_url TEXT,

    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,

    FOREIGN KEY (position_id)
        REFERENCES positions(id)
        ON DELETE SET NULL,

    FOREIGN KEY (manager_id)
        REFERENCES employees(id)
        ON DELETE SET NULL
);


-- Add department manager FK after employees exists
CREATE INDEX IF NOT EXISTS idx_employees_company
    ON employees(company_id);

CREATE INDEX IF NOT EXISTS idx_employees_department
    ON employees(department_id);

CREATE INDEX IF NOT EXISTS idx_employees_manager
    ON employees(manager_id);

CREATE INDEX IF NOT EXISTS idx_employees_status
    ON employees(employment_status);


-- =========================================================
-- 4. ROLES
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 5. PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 6. ROLE PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    scope TEXT NOT NULL DEFAULT 'company',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(role_id, permission_id),

    FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 7. USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    display_name TEXT NOT NULL,

    email TEXT,

    employee_id INTEGER,

    role_id INTEGER NOT NULL,

    company_id INTEGER,

    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),

    last_login_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE SET NULL,

    FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE SET NULL
);


CREATE INDEX IF NOT EXISTS idx_users_employee
    ON users(employee_id);

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role_id);


-- =========================================================
-- 8. SESSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    session_token TEXT NOT NULL UNIQUE,

    user_id INTEGER NOT NULL,

    expires_at TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions(user_id);


-- =========================================================
-- 9. TRANSACTION DEFINITIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS transaction_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    code TEXT NOT NULL UNIQUE,

    name_ar TEXT NOT NULL,
    name_en TEXT,

    category TEXT,

    description TEXT,

    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 10. TRANSACTION WORKFLOW STEPS
-- =========================================================

CREATE TABLE IF NOT EXISTS transaction_workflow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_definition_id INTEGER NOT NULL,

    step_order INTEGER NOT NULL,

    name_ar TEXT NOT NULL,
    name_en TEXT,

    required_permission TEXT,

    approval_type TEXT DEFAULT 'approval',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_definition_id)
        REFERENCES transaction_definitions(id)
        ON DELETE CASCADE,

    UNIQUE(transaction_definition_id, step_order)
);


-- =========================================================
-- 11. TRANSACTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_number TEXT NOT NULL UNIQUE,

    definition_id INTEGER NOT NULL,

    company_id INTEGER NOT NULL,

    requester_user_id INTEGER,

    employee_id INTEGER,

    current_step_id INTEGER,

    status TEXT NOT NULL DEFAULT 'draft',

    subject TEXT,

    description TEXT,

    priority TEXT DEFAULT 'normal',

    submitted_at TEXT,

    completed_at TEXT,

    rejected_at TEXT,

    rejection_reason TEXT,

    return_reason TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (definition_id)
        REFERENCES transaction_definitions(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    FOREIGN KEY (requester_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE SET NULL,

    FOREIGN KEY (current_step_id)
        REFERENCES transaction_workflow_steps(id)
        ON DELETE SET NULL
);


CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_requester
    ON transactions(requester_user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_employee
    ON transactions(employee_id);

CREATE INDEX IF NOT EXISTS idx_transactions_company
    ON transactions(company_id);


-- =========================================================
-- 12. TRANSACTION HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS transaction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_id INTEGER NOT NULL,

    user_id INTEGER,

    action TEXT NOT NULL,

    from_status TEXT,
    to_status TEXT,

    comment TEXT,

    step_id INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (step_id)
        REFERENCES transaction_workflow_steps(id)
        ON DELETE SET NULL
);


CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction
    ON transaction_history(transaction_id);


-- =========================================================
-- 13. TRANSACTION COMMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS transaction_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_id INTEGER NOT NULL,

    user_id INTEGER,

    comment TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 14. ATTACHMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_id INTEGER,

    employee_id INTEGER,

    uploaded_by INTEGER,

    file_name TEXT NOT NULL,

    file_url TEXT,

    storage_key TEXT,

    mime_type TEXT,

    file_size INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 15. AUDIT LOG
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER,

    company_id INTEGER,

    action TEXT NOT NULL,

    entity_type TEXT,

    entity_id INTEGER,

    old_data TEXT,

    new_data TEXT,

    ip_address TEXT,

    user_agent TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE SET NULL
);


CREATE INDEX IF NOT EXISTS idx_audit_logs_user
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);


-- =========================================================
-- 16. LEAVE TYPES
-- =========================================================

CREATE TABLE IF NOT EXISTS leave_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    code TEXT NOT NULL,

    name_ar TEXT NOT NULL,
    name_en TEXT,

    paid INTEGER NOT NULL DEFAULT 1 CHECK (paid IN (0,1)),

    annual_entitlement REAL DEFAULT 0,

    requires_attachment INTEGER NOT NULL DEFAULT 0 CHECK (requires_attachment IN (0,1)),

    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    UNIQUE(company_id, code)
);


-- =========================================================
-- 17. LEAVE BALANCES
-- =========================================================

CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    employee_id INTEGER NOT NULL,

    leave_type_id INTEGER NOT NULL,

    year INTEGER NOT NULL,

    entitlement REAL NOT NULL DEFAULT 0,

    used REAL NOT NULL DEFAULT 0,

    pending REAL NOT NULL DEFAULT 0,

    adjustment REAL NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, leave_type_id, year),

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    FOREIGN KEY (leave_type_id)
        REFERENCES leave_types(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 18. LEAVE REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    employee_id INTEGER NOT NULL,

    leave_type_id INTEGER NOT NULL,

    transaction_id INTEGER,

    start_date TEXT NOT NULL,

    end_date TEXT NOT NULL,

    days REAL NOT NULL,

    reason TEXT,

    status TEXT NOT NULL DEFAULT 'pending',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    FOREIGN KEY (leave_type_id)
        REFERENCES leave_types(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 19. PAYROLL PERIODS
-- =========================================================

CREATE TABLE IF NOT EXISTS payroll_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    year INTEGER NOT NULL,

    month INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft',

    total_basic REAL DEFAULT 0,
    total_allowances REAL DEFAULT 0,
    total_deductions REAL DEFAULT 0,
    total_net REAL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, year, month),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 20. PAYROLL ITEMS
-- =========================================================

CREATE TABLE IF NOT EXISTS payroll_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    payroll_period_id INTEGER NOT NULL,

    employee_id INTEGER NOT NULL,

    basic_salary REAL DEFAULT 0,

    housing_allowance REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    other_allowances REAL DEFAULT 0,

    overtime REAL DEFAULT 0,

    deductions REAL DEFAULT 0,

    gross_salary REAL DEFAULT 0,
    net_salary REAL DEFAULT 0,

    iban TEXT,

    status TEXT DEFAULT 'draft',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (payroll_period_id)
        REFERENCES payroll_periods(id)
        ON DELETE CASCADE,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 21. EMPLOYEE DOCUMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS employee_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    employee_id INTEGER NOT NULL,

    document_type TEXT NOT NULL,

    document_name TEXT NOT NULL,

    file_url TEXT,

    storage_key TEXT,

    issue_date TEXT,

    expiry_date TEXT,

    status TEXT DEFAULT 'active',

    notes TEXT,

    uploaded_by INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry
    ON employee_documents(expiry_date);


-- =========================================================
-- 22. EMPLOYEE ASSETS
-- =========================================================

CREATE TABLE IF NOT EXISTS employee_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    employee_id INTEGER NOT NULL,

    asset_name TEXT NOT NULL,

    asset_type TEXT,

    serial_number TEXT,

    assigned_date TEXT,

    returned_date TEXT,

    status TEXT DEFAULT 'assigned',

    notes TEXT,

    FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 23. SYSTEM SETTINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER,

    setting_key TEXT NOT NULL,

    setting_value TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, setting_key),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE
);


-- =========================================================
-- SEED DATA
-- =========================================================


-- =========================================================
-- COMPANY
-- =========================================================

INSERT OR IGNORE INTO companies
(
    id,
    name_ar,
    name_en,
    commercial_name,
    country,
    active
)
VALUES
(
    1,
    'شركة HR Core',
    'HR Core Company',
    'HR Core',
    'Saudi Arabia',
    1
);


-- =========================================================
-- DEPARTMENTS
-- =========================================================

INSERT OR IGNORE INTO departments
(
    id,
    company_id,
    name_ar,
    name_en,
    code,
    active
)
VALUES
(1, 1, 'الموارد البشرية', 'Human Resources', 'HR', 1),
(2, 1, 'المالية', 'Finance', 'FIN', 1),
(3, 1, 'تقنية المعلومات', 'Information Technology', 'IT', 1),
(4, 1, 'الإدارة', 'Administration', 'ADM', 1);


-- =========================================================
-- POSITIONS
-- =========================================================

INSERT OR IGNORE INTO positions
(
    id,
    company_id,
    department_id,
    title_ar,
    title_en,
    code,
    active
)
VALUES
(1, 1, 1, 'مدير الموارد البشرية', 'HR Manager', 'HR-MGR', 1),
(2, 1, 1, 'أخصائي موارد بشرية', 'HR Specialist', 'HR-SPEC', 1),
(3, 1, 2, 'محاسب', 'Accountant', 'ACC', 1),
(4, 1, 3, 'أخصائي تقنية معلومات', 'IT Specialist', 'IT-SPEC', 1),
(5, 1, 4, 'مدير إداري', 'Administration Manager', 'ADM-MGR', 1);


-- =========================================================
-- EMPLOYEES
-- =========================================================

INSERT OR IGNORE INTO employees
(
    id,
    company_id,
    employee_number,
    first_name_ar,
    last_name_ar,
    first_name_en,
    last_name_en,
    national_id,
    nationality,
    email,
    mobile,
    department_id,
    position_id,
    employment_status,
    employment_type,
    hire_date,
    basic_salary,
    housing_allowance,
    transport_allowance,
    active
)
VALUES
(
    1,
    1,
    'EMP-0001',
    'محمد',
    'المدير',
    'Mohammed',
    'Admin',
    '0000000000',
    'Saudi',
    'admin@hrcore.local',
    '0500000000',
    1,
    1,
    'active',
    'full_time',
    '2026-01-01',
    20000,
    5000,
    2000,
    1
),
(
    2,
    1,
    'EMP-0002',
    'أحمد',
    'العتيبي',
    'Ahmed',
    'Alotaibi',
    '0000000001',
    'Saudi',
    'ahmed@hrcore.local',
    '0500000001',
    1,
    2,
    'active',
    'full_time',
    '2026-02-01',
    10000,
    2500,
    1000,
    1
),
(
    3,
    1,
    'EMP-0003',
    'سارة',
    'القحطاني',
    'Sarah',
    'Alqahtani',
    '0000000002',
    'Saudi',
    'sarah@hrcore.local',
    '0500000002',
    2,
    3,
    'active',
    'full_time',
    '2026-02-15',
    9000,
    2250,
    1000,
    1
),
(
    4,
    1,
    'EMP-0004',
    'خالد',
    'الحربي',
    'Khalid',
    'Alharbi',
    '0000000003',
    'Saudi',
    'khalid@hrcore.local',
    '0500000003',
    3,
    4,
    'active',
    'full_time',
    '2026-03-01',
    11000,
    2750,
    1000,
    1
);


-- =========================================================
-- ROLES
-- =========================================================

INSERT OR IGNORE INTO roles
(
    id,
    code,
    name_ar,
    name_en,
    description,
    is_system,
    active
)
VALUES
(
    1,
    'super_admin',
    'مدير النظام',
    'Super Administrator',
    'صلاحية كاملة على النظام',
    1,
    1
),
(
    2,
    'hr',
    'الموارد البشرية',
    'Human Resources',
    'إدارة عمليات الموارد البشرية',
    1,
    1
),
(
    3,
    'manager',
    'مدير',
    'Manager',
    'إدارة الموظفين التابعين',
    1,
    1
),
(
    4,
    'employee',
    'موظف',
    'Employee',
    'الوصول إلى بيانات وطلبات الموظف نفسه',
    1,
    1
);


-- =========================================================
-- PERMISSIONS
-- =========================================================

INSERT OR IGNORE INTO permissions
(code, name_ar, name_en, module, action, description)
VALUES

-- Dashboard
('dashboard.view', 'عرض لوحة التحكم', 'View Dashboard', 'dashboard', 'view', 'عرض لوحة التحكم'),

-- Employees
('employees.view', 'عرض الموظفين', 'View Employees', 'employees', 'view', 'عرض بيانات الموظفين'),
('employees.create', 'إضافة موظف', 'Create Employee', 'employees', 'create', 'إنشاء موظف جديد'),
('employees.edit', 'تعديل موظف', 'Edit Employee', 'employees', 'edit', 'تعديل بيانات الموظف'),
('employees.terminate', 'إنهاء خدمة موظف', 'Terminate Employee', 'employees', 'terminate', 'إنهاء خدمة الموظف'),
('employees.export', 'تصدير الموظفين', 'Export Employees', 'employees', 'export', 'تصدير بيانات الموظفين'),
('employees.view_salary', 'عرض رواتب الموظفين', 'View Employee Salary', 'employees', 'view_salary', 'عرض معلومات الراتب'),

-- Organization
('organization.view', 'عرض الهيكل التنظيمي', 'View Organization', 'organization', 'view', 'عرض الهيكل التنظيمي'),
('organization.manage', 'إدارة الهيكل التنظيمي', 'Manage Organization', 'organization', 'manage', 'إدارة الهيكل التنظيمي'),

-- Documents
('documents.view', 'عرض المستندات', 'View Documents', 'documents', 'view', 'عرض المستندات'),
('documents.create', 'إضافة مستند', 'Create Document', 'documents', 'create', 'إضافة مستند'),
('documents.edit', 'تعديل مستند', 'Edit Document', 'documents', 'edit', 'تعديل مستند'),
('documents.delete', 'حذف مستند', 'Delete Document', 'documents', 'delete', 'حذف مستند'),
('documents.export', 'تصدير المستندات', 'Export Documents', 'documents', 'export', 'تصدير المستندات'),

-- Transactions
('transactions.view', 'عرض المعاملات', 'View Transactions', 'transactions', 'view', 'عرض المعاملات'),
('transactions.create', 'إنشاء معاملة', 'Create Transaction', 'transactions', 'create', 'إنشاء معاملة'),
('transactions.edit', 'تعديل معاملة', 'Edit Transaction', 'transactions', 'edit', 'تعديل معاملة'),
('transactions.submit', 'إرسال معاملة', 'Submit Transaction', 'transactions', 'submit', 'إرسال معاملة'),
('transactions.approve', 'اعتماد معاملة', 'Approve Transaction', 'transactions', 'approve', 'اعتماد المعاملة'),
('transactions.reject', 'رفض معاملة', 'Reject Transaction', 'transactions', 'reject', 'رفض المعاملة'),
('transactions.return', 'إعادة معاملة للتعديل', 'Return Transaction', 'transactions', 'return', 'إعادة المعاملة للتعديل'),
('transactions.cancel', 'إلغاء معاملة', 'Cancel Transaction', 'transactions', 'cancel', 'إلغاء المعاملة'),
('transactions.export', 'تصدير المعاملات', 'Export Transactions', 'transactions', 'export', 'تصدير المعاملات'),

-- Leaves
('leaves.view', 'عرض الإجازات', 'View Leaves', 'leaves', 'view', 'عرض الإجازات'),
('leaves.create', 'طلب إجازة', 'Create Leave', 'leaves', 'create', 'إنشاء طلب إجازة'),
('leaves.approve', 'اعتماد الإجازات', 'Approve Leaves', 'leaves', 'approve', 'اعتماد طلبات الإجازات'),
('leaves.reject', 'رفض الإجازات', 'Reject Leaves', 'leaves', 'reject', 'رفض طلبات الإجازات'),
('leaves.manage_balance', 'إدارة أرصدة الإجازات', 'Manage Leave Balances', 'leaves', 'manage_balance', 'إدارة أرصدة الإجازات'),

-- Payroll
('payroll.view', 'عرض الرواتب', 'View Payroll', 'payroll', 'view', 'عرض بيانات الرواتب'),
('payroll.create', 'إنشاء مسير رواتب', 'Create Payroll', 'payroll', 'create', 'إنشاء مسير رواتب'),
('payroll.edit', 'تعديل مسير الرواتب', 'Edit Payroll', 'payroll', 'edit', 'تعديل مسير الرواتب'),
('payroll.approve', 'اعتماد الرواتب', 'Approve Payroll', 'payroll', 'approve', 'اعتماد مسير الرواتب'),
('payroll.export', 'تصدير الرواتب', 'Export Payroll', 'payroll', 'export', 'تصدير بيانات الرواتب'),
('payroll.view_salary', 'عرض تفاصيل الرواتب', 'View Salary Details', 'payroll', 'view_salary', 'عرض تفاصيل رواتب الموظفين'),
('payroll.view_bank_file', 'عرض ملف البنك', 'View Bank File', 'payroll', 'view_bank_file', 'عرض ملف البنك'),

-- Reports
('reports.view', 'عرض التقارير', 'View Reports', 'reports', 'view', 'عرض التقارير'),
('reports.export', 'تصدير التقارير', 'Export Reports', 'reports', 'export', 'تصدير التقارير'),

-- Administration
('admin.users.view', 'عرض المستخدمين', 'View Users', 'admin', 'users.view', 'عرض المستخدمين'),
('admin.users.manage', 'إدارة المستخدمين', 'Manage Users', 'admin', 'users.manage', 'إدارة المستخدمين'),
('admin.roles.view', 'عرض الأدوار والصلاحيات', 'View Roles', 'admin', 'roles.view', 'عرض الأدوار'),
('admin.roles.manage', 'إدارة الأدوار والصلاحيات', 'Manage Roles', 'admin', 'roles.manage', 'إدارة الأدوار والصلاحيات'),
('admin.settings.manage', 'إدارة إعدادات النظام', 'Manage Settings', 'admin', 'settings.manage', 'إدارة إعدادات النظام'),
('admin.audit.view', 'عرض سجل التدقيق', 'View Audit Log', 'admin', 'audit.view', 'عرض سجل التدقيق'),
('admin.workflow.manage', 'إدارة مسارات المعاملات', 'Manage Workflows', 'admin', 'workflow.manage', 'إدارة مسارات المعاملات');


-- =========================================================
-- ROLE PERMISSIONS
-- =========================================================


-- SUPER ADMIN
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 1, id, 'company'
FROM permissions;


-- HR
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 2, id, 'company'
FROM permissions
WHERE code IN
(
    'dashboard.view',

    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.terminate',
    'employees.export',
    'employees.view_salary',

    'organization.view',
    'organization.manage',

    'documents.view',
    'documents.create',
    'documents.edit',
    'documents.delete',
    'documents.export',

    'transactions.view',
    'transactions.create',
    'transactions.edit',
    'transactions.submit',
    'transactions.approve',
    'transactions.reject',
    'transactions.return',
    'transactions.cancel',
    'transactions.export',

    'leaves.view',
    'leaves.create',
    'leaves.approve',
    'leaves.reject',
    'leaves.manage_balance',

    'payroll.view',
    'payroll.create',
    'payroll.edit',
    'payroll.approve',
    'payroll.export',
    'payroll.view_salary',
    'payroll.view_bank_file',

    'reports.view',
    'reports.export',

    'admin.audit.view',
    'admin.workflow.manage'
);


-- MANAGER
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 3, id,
    CASE
        WHEN code IN (
            'employees.view',
            'documents.view',
            'transactions.view',
            'leaves.view'
        )
        THEN 'managed_employees'
        ELSE 'managed_employees'
    END
FROM permissions
WHERE code IN
(
    'dashboard.view',

    'employees.view',

    'documents.view',

    'transactions.view',
    'transactions.create',
    'transactions.submit',
    'transactions.approve',
    'transactions.reject',
    'transactions.return',

    'leaves.view',
    'leaves.approve',
    'leaves.reject',

    'reports.view'
);


-- EMPLOYEE
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 4, id, 'self'
FROM permissions
WHERE code IN
(
    'dashboard.view',

    'employees.view',

    'documents.view',

    'transactions.view',
    'transactions.create',
    'transactions.edit',
    'transactions.submit',

    'leaves.view',
    'leaves.create'
);


-- =========================================================
-- ADMIN USER
-- PIN = 1234
-- SHA-256:
-- 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
-- =========================================================

INSERT OR IGNORE INTO users
(
    id,
    username,
    password_hash,
    display_name,
    email,
    employee_id,
    role_id,
    company_id,
    active
)
VALUES
(
    1,
    'admin',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'مدير النظام',
    'admin@hrcore.local',
    1,
    1,
    1,
    1
);


-- =========================================================
-- TRANSACTION DEFINITIONS
-- =========================================================

INSERT OR IGNORE INTO transaction_definitions
(
    id,
    code,
    name_ar,
    name_en,
    category,
    description,
    active
)
VALUES
(1, 'LEAVE_REQUEST', 'طلب إجازة', 'Leave Request', 'leaves', 'طلب إجازة موظف', 1),
(2, 'EMPLOYEE_DATA_UPDATE', 'تحديث بيانات موظف', 'Employee Data Update', 'employees', 'تحديث بيانات الموظف', 1),
(3, 'EMPLOYEE_NEW_HIRE', 'طلب توظيف', 'New Hire Request', 'recruitment', 'طلب توظيف/التحاق موظف', 1),
(4, 'SALARY_CHANGE', 'تغيير راتب', 'Salary Change', 'payroll', 'طلب تغيير راتب موظف', 1),
(5, 'TERMINATION', 'إنهاء خدمة', 'Termination', 'employees', 'معاملة إنهاء خدمة موظف', 1),
(6, 'DOCUMENT_UPDATE', 'تحديث مستند', 'Document Update', 'documents', 'تحديث مستند موظف', 1);


-- =========================================================
-- WORKFLOW STEPS
-- =========================================================

INSERT OR IGNORE INTO transaction_workflow_steps
(
    id,
    transaction_definition_id,
    step_order,
    name_ar,
    name_en,
    required_permission,
    approval_type
)
VALUES
(1, 1, 1, 'مراجعة المدير', 'Manager Review', 'leaves.approve', 'approval'),
(2, 1, 2, 'مراجعة الموارد البشرية', 'HR Review', 'leaves.approve', 'approval'),

(3, 2, 1, 'مراجعة الموارد البشرية', 'HR Review', 'employees.edit', 'approval'),

(4, 3, 1, 'مراجعة الموارد البشرية', 'HR Review', 'employees.create', 'approval'),

(5, 4, 1, 'مراجعة الموارد البشرية', 'HR Review', 'payroll.edit', 'approval'),
(6, 4, 2, 'اعتماد الرواتب', 'Payroll Approval', 'payroll.approve', 'approval'),

(7, 5, 1, 'مراجعة الموارد البشرية', 'HR Review', 'employees.terminate', 'approval'),

(8, 6, 1, 'مراجعة الموارد البشرية', 'HR Review', 'documents.edit', 'approval');


-- =========================================================
-- LEAVE TYPES
-- =========================================================

INSERT OR IGNORE INTO leave_types
(
    id,
    company_id,
    code,
    name_ar,
    name_en,
    paid,
    annual_entitlement,
    requires_attachment,
    active
)
VALUES
(1, 1, 'ANNUAL', 'إجازة سنوية', 'Annual Leave', 1, 21, 0, 1),
(2, 1, 'SICK', 'إجازة مرضية', 'Sick Leave', 1, 0, 1, 1),
(3, 1, 'UNPAID', 'إجازة بدون راتب', 'Unpaid Leave', 0, 0, 0, 1),
(4, 1, 'EMERGENCY', 'إجازة اضطرارية', 'Emergency Leave', 1, 0, 0, 1);


-- =========================================================
-- LEAVE BALANCES
-- =========================================================

INSERT OR IGNORE INTO leave_balances
(
    employee_id,
    leave_type_id,
    year,
    entitlement,
    used,
    pending,
    adjustment
)
SELECT
    e.id,
    1,
    2026,
    21,
    0,
    0,
    0
FROM employees e;


-- =========================================================
-- SYSTEM SETTINGS
-- =========================================================

INSERT OR IGNORE INTO system_settings
(
    company_id,
    setting_key,
    setting_value
)
VALUES
(1, 'system_name', 'HR Core'),
(1, 'system_name_ar', 'نظام الموارد البشرية'),
(1, 'default_language', 'ar'),
(1, 'default_country', 'Saudi Arabia'),
(1, 'currency', 'SAR');


COMMIT;
