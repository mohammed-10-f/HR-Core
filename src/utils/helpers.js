export const money=n=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)+' ر.س';
export const today='17/09/2026';
export function daysBetween(a,b){const x=new Date(a),y=new Date(b);return Math.max(0,Math.round((y-x)/86400000)+1)}
export const statusClass=s=>({"مكتملة":'success',"مقبولة":'success',"بانتظار الاعتماد":'warning',"مراجعة HR":'info',"تنفيذ":'info',"مرفوضة":'danger'}[s]||'neutral');
