import { getAuthUser, permissionsFor, json } from './auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) return json({ error: 'D1 binding DB is missing' }, 500);

  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'غير مصرح — سجل الدخول أولاً' }, 401);

  // Live D1 schema: companies(id, name_ar, name_en, commercial_name, city, country, active, ...)
  const companyRow = await env.DB.prepare(`
    SELECT
      id,
      name_ar AS name,
      name_en AS nameEn,
      commercial_name AS commercialName,
      city,
      country,
      active
    FROM companies
    WHERE id = ?
    LIMIT 1
  `).bind(user.companyId).first().catch(() => null);

  const fallbackCompany = companyRow || await env.DB.prepare(`
    SELECT
      id,
      name_ar AS name,
      name_en AS nameEn,
      commercial_name AS commercialName,
      city,
      country,
      active
    FROM companies
    WHERE active = 1
    ORDER BY id
    LIMIT 1
  `).first().catch(() => null);

  if (!fallbackCompany) {
    return json({ error: 'No company found. Add an active company before loading D1 state.' }, 404);
  }

  const company = {
    ...fallbackCompany,
    // The live schema currently does not store these presentation fields.
    // Keep stable defaults so the existing UI can render without local demo data.
    code: makeCompanyCode(fallbackCompany),
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
  };

  const employees = await env.DB.prepare(`
    SELECT
      id,
      name,
      job,
      dept,
      branch,
      nationality,
      salary,
      join_date AS joinDate,
      status,
      manager_id AS managerId
    FROM employees
    WHERE company_id = ?
    ORDER BY name
  `).bind(company.id).all().catch(() => ({ results: [] }));

  let employeeRows = employees.results || [];
  if (user.roleId === 'employee') {
    employeeRows = employeeRows.filter((e) => String(e.id) === String(user.employeeId));
  } else if (user.roleId === 'manager') {
    employeeRows = employeeRows.filter((e) =>
      String(e.id) === String(user.employeeId) || String(e.managerId) === String(user.employeeId)
    );
  }

  const defRows = await env.DB.prepare(`
    SELECT
      id,
      code,
      name_ar AS name,
      name_en AS nameEn,
      description,
      module,
      icon,
      active,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM transaction_definitions
    ORDER BY created_at DESC
  `).all().catch(() => ({ results: [] }));

  const stepRows = await env.DB.prepare(`
    SELECT
      id,
      transaction_definition_id AS definitionId,
      step_order AS stepOrder,
      name_ar AS name,
      name_en AS nameEn,
      role_id AS roleDbId,
      permission_code AS permissionCode,
      action_type AS actionType,
      allow_return AS allowReturn,
      allow_reject AS allowReject,
      active
    FROM transaction_workflow_steps
    ORDER BY transaction_definition_id, step_order
  `).all().catch(() => ({ results: [] }));

  const definitions = (defRows.results || []).map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    nameEn: d.nameEn,
    description: d.description || '',
    category: d.module || 'المعاملات',
    active: !!d.active,
    public: true,
    version: 1,
    fields: [],
    steps: (stepRows.results || [])
      .filter((s) => String(s.definitionId) === String(d.id) && s.active)
      .map((s) => ({
        id: s.id,
        name: s.name,
        assignee: s.roleDbId
          ? { type: 'roleDb', roleId: s.roleDbId }
          : { type: 'permission', permission: s.permissionCode },
        actions: [],
      })),
  }));

  const txRows = await env.DB.prepare(`
    SELECT
      t.id,
      t.transaction_number AS transactionNumber,
      t.transaction_definition_id AS definitionId,
      t.employee_id AS employeeId,
      t.submitted_by AS submittedBy,
      t.current_step_id AS currentStepId,
      t.status,
      t.title,
      t.description,
      t.data_json AS dataJson,
      t.submitted_at AS submittedAt,
      t.completed_at AS completedAt,
      t.created_at AS createdAt,
      t.updated_at AS updatedAt
    FROM transactions t
    WHERE t.employee_id IN (
      SELECT id FROM employees WHERE company_id = ?
    )
    ORDER BY t.created_at DESC
  `).bind(company.id).all().catch(() => ({ results: [] }));

  let visibleTx = txRows.results || [];
  if (user.roleId === 'employee') {
    visibleTx = visibleTx.filter((t) =>
      String(t.employeeId) === String(user.employeeId) || String(t.submittedBy) === String(user.id)
    );
  }
  if (user.roleId === 'manager') {
    visibleTx = visibleTx.filter((t) =>
      String(t.employeeId) === String(user.employeeId) ||
      employeeRows.some((e) => String(e.id) === String(t.employeeId))
    );
  }

  const historyRows = visibleTx.length
    ? await env.DB.prepare(`
        SELECT
          transaction_id AS transactionId,
          action,
          actor_user_id AS by,
          step AS stepName,
          created_at AS at
        FROM transaction_history
        WHERE transaction_id IN (${visibleTx.map(() => '?').join(',')})
        ORDER BY id
      `).bind(...visibleTx.map((t) => t.id)).all().catch(() => ({ results: [] }))
    : { results: [] };

  const commentRows = visibleTx.length
    ? await env.DB.prepare(`
        SELECT
          transaction_id AS transactionId,
          author_user_id AS authorUserId,
          author_name AS authorName,
          body,
          created_at AS createdAt
        FROM transaction_comments
        WHERE transaction_id IN (${visibleTx.map(() => '?').join(',')})
        ORDER BY id
      `).bind(...visibleTx.map((t) => t.id)).all().catch(() => ({ results: [] }))
    : { results: [] };

  const attachmentRows = visibleTx.length
    ? await env.DB.prepare(`
        SELECT
          transaction_id AS transactionId,
          employee_id AS employeeId,
          file_name AS fileName,
          file_url AS fileUrl,
          file_type AS fileType,
          file_size AS fileSize,
          uploaded_by AS uploadedBy,
          created_at AS createdAt
        FROM attachments
        WHERE transaction_id IN (${visibleTx.map(() => '?').join(',')})
        ORDER BY id
      `).bind(...visibleTx.map((t) => t.id)).all().catch(() => ({ results: [] }))
    : { results: [] };

  const transactions = visibleTx.map((t) => ({
    id: t.id,
    transactionNumber: t.transactionNumber,
    definitionId: t.definitionId,
    definitionName:
      definitions.find((d) => String(d.id) === String(t.definitionId))?.name ||
      t.title ||
      'معاملة',
    employeeId: t.employeeId,
    currentStepId: t.currentStepId,
    status: statusMap(t.status),
    values: safeJson(t.dataJson),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    submittedAt: t.submittedAt,
    completedAt: t.completedAt,
    history: (historyRows.results || [])
      .filter((h) => String(h.transactionId) === String(t.id))
      .map((h) => ({ ...h, step: h.stepName })),
    comments: (commentRows.results || [])
      .filter((c) => String(c.transactionId) === String(t.id))
      .map((c) => ({
        userId: c.authorUserId,
        user: c.authorName,
        comment: c.body,
        createdAt: c.createdAt,
      })),
    attachments: (attachmentRows.results || [])
      .filter((a) => String(a.transactionId) === String(t.id))
      .map((a) => ({
        employeeId: a.employeeId,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileType: a.fileType,
        fileSize: a.fileSize,
        uploadedBy: a.uploadedBy,
        createdAt: a.createdAt,
      })),
  }));

  let audit = [];
  if (user.roleId === 'super_admin' || user.roleId === 'hr') {
    audit = (
      await env.DB.prepare(`
        SELECT
          id,
          actor_name AS user,
          action,
          entity_type AS entity,
          entity_id AS entityId,
          details,
          created_at AS at
        FROM audit_logs
        WHERE company_id = ?
        ORDER BY id DESC
        LIMIT 500
      `).bind(company.id).all().catch(() => ({ results: [] }))
    ).results || [];
  }

  return json({
    company,
    user,
    permissions: await permissionsFor(env, user),
    employees: employeeRows,
    definitions,
    transactions,
    leaves: [],
    audit,
    notifications: [],
    source: 'd1',
  });
}

function makeCompanyCode(company) {
  const source = String(company.nameEn || company.name || '').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 3).map((x) => x[0]).join('').toUpperCase();
  return source.slice(0, 4).toUpperCase() || `C${company.id}`;
}

function statusMap(value) {
  const map = {
    draft: 'مسودة',
    'قيد المعالجة': 'قيد المعالجة',
    in_progress: 'قيد المعالجة',
    returned: 'معادة للتعديل',
    rejected: 'مرفوضة',
    completed: 'مكتملة',
  };
  return map[value] || value || 'مسودة';
}

function safeJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}
