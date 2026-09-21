import {json,requirePermission} from './_core.js';
import {ensureSchema,cleanupKnownOrphans,schemaHealth} from './schema.js';
export async function onRequestGet({request,env}){
  const a=await requirePermission(request,env,'system.maintenance'); if(a.error)return a.error;
  const schema=await schemaHealth(env);
  return json({ok:true,schema_ready:true,...schema});
}
export async function onRequestPost({request,env}){
  const a=await requirePermission(request,env,'system.maintenance'); if(a.error)return a.error;
  await ensureSchema(env);
  const result=await cleanupKnownOrphans(env);
  const schema=await schemaHealth(env);
  return json({ok:true,...result,...schema,message:'تمت مزامنة المخطط وتنظيف السجلات اليتيمة المعروفة. لا يتم حذف الجداول أو الأعمدة أو بيانات الأعمال تلقائيًا.'});
}
