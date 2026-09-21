import {schemaHealth} from './schema.js';
export async function onRequestGet({env}){
  try{
    const r=await env.DB.prepare('SELECT 1 ok').first();
    const schema=await schemaHealth(env);
    return new Response(JSON.stringify({ok:true,worker:true,database:r?.ok===1,name:'hr-core',schemaReady:true,schemaVersion:schema.version,schemaIssues:schema.issues.length,tables:schema.tables,timestamp:new Date().toISOString()}),{headers:{'Content-Type':'application/json'}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,worker:true,database:false,schemaReady:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}})
  }
}
