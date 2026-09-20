export async function onRequestGet({env}) {
  try { const row = await env.DB.prepare('SELECT 1 AS ok').first(); return new Response(JSON.stringify({ok:row?.ok===1,database:'D1',name:'hr-core'}),{headers:{'Content-Type':'application/json'}}); }
  catch(e){ return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}}); }
}
