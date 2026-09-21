import {json,requirePermission} from './_core.js';
export async function onRequestGet({request,env}){const a=await requirePermission(request,env,'audit.view');if(a.error)return a.error;const r=await env.DB.prepare('SELECT * FROM audit_logs WHERE company_id=? ORDER BY id DESC LIMIT 200').bind(a.user.company_id).all();return json({ok:true,logs:r.results||[]})}
