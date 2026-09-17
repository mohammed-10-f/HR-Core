const names=['أحمد السالم','محمد العتيبي','خالد الحربي','عبدالله القحطاني','سعود المطيري','نورة الشمري','سارة الغامدي','ريم الدوسري','فاطمة الزهراني','مها الشهري','ياسر العنزي','لينا المالكي','تركي الرشيد','هند العمري','راشد القرني','جود الهاجري','فيصل الدوسري','علا العبدالله','ماجد السبيعي','نوف الحربي'];
const depts=['الموارد البشرية','المالية','تقنية المعلومات','المبيعات','التسويق','العمليات','المشتريات','الشؤون القانونية','خدمة العملاء','الجودة','التطوير والتدريب','إدارة المشاريع'];
const branches=['الرياض','جدة','الدمام','الخبر','مكة المكرمة','المدينة المنورة','أبها','تبوك','القصيم','ينبع'];
const jobs=['أخصائي موارد بشرية','محلل مالي','مهندس برمجيات','مدير مبيعات','أخصائي تسويق','منسق عمليات','أخصائي مشتريات','مستشار قانوني','ممثل خدمة عملاء','محلل جودة'];
const companies=[
 {id:'elite',name:'شركة النخبة للتجارة',short:'النخبة',employees:1248,industry:'التجارة والتوزيع',color:'#17375e'},
 {id:'madar',name:'شركة مدار الطبية',short:'مدار',employees:486,industry:'الرعاية والخدمات الطبية',color:'#245a62'},
 {id:'solutions',name:'شركة حلول الأعمال',short:'حلول',employees:2731,industry:'الخدمات والاستشارات',color:'#4a496d'},
 {id:'riyadah',name:'شركة الريادة للخدمات',short:'الريادة',employees:742,industry:'الخدمات المتخصصة',color:'#6a5142'}
];
function employeesFor(companyId){let c=companies.find(x=>x.id===companyId); let n=Math.max(140,Math.min(c.employees,260)); return Array.from({length:n},(_,i)=>({id:`EMP-${companyId.slice(0,2).toUpperCase()}-${String(i+1001).padStart(5,'0')}`,name:names[i%names.length],dept:depts[i%depts.length],branch:branches[(i*3)%branches.length],job:jobs[(i*7)%jobs.length],status:i%17===0?'تحت التجربة':'على رأس العمل',nationality:i%4===0?'غير سعودي':'سعودي',salary:6500+(i%12)*850,joinDate:`${2022+i%5}-${String((i%12)+1).padStart(2,'0')}-01`,phone:'05X XXX XXXX',email:'demo.employee@example.test'}));}
const seedTransactions=[
 {id:'TRX-260917-001',type:'طلب إجازة',employee:'محمد العتيبي',requester:'محمد العتيبي',date:'17/09/2026',status:'بانتظار الاعتماد',current:'مدير الإدارة',priority:'عادية',due:'19/09/2026',last:'تم إرسال الطلب',company:'elite',leaveDays:4},
 {id:'TRX-260916-014',type:'تعديل راتب',employee:'نورة الشمري',requester:'HR Specialist',date:'16/09/2026',status:'مراجعة HR',current:'مدير الموارد البشرية',priority:'عالية',due:'18/09/2026',last:'اعتماد المدير',company:'elite'},
 {id:'TRX-260915-008',type:'مباشرة موظف',employee:'تركي الرشيد',requester:'HR Specialist',date:'15/09/2026',status:'مكتملة',current:'—',priority:'عادية',due:'15/09/2026',last:'تم الإغلاق',company:'madar'},
 {id:'TRX-260914-022',type:'تعريف بالراتب',employee:'سارة الغامدي',requester:'سارة الغامدي',date:'14/09/2026',status:'مكتملة',current:'—',priority:'منخفضة',due:'14/09/2026',last:'تم إصدار المستند',company:'elite'},
 {id:'TRX-260913-031',type:'نقل',employee:'خالد الحربي',requester:'HR Manager',date:'13/09/2026',status:'مرفوضة',current:'—',priority:'عادية',due:'15/09/2026',last:'تم الرفض من HR',company:'solutions'},
 {id:'TRX-260912-011',type:'إنهاء خدمة',employee:'راشد القرني',requester:'HR Manager',date:'12/09/2026',status:'تنفيذ',current:'HR Operations',priority:'عالية',due:'20/09/2026',last:'اعتماد المدير',company:'riyadah'}
];
const leaves=[{id:'LV-1001',employee:'محمد العتيبي',type:'سنوية',from:'21/09/2026',to:'24/09/2026',days:4,status:'بانتظار الاعتماد',balance:18,company:'elite'},{id:'LV-1002',employee:'نورة الشمري',type:'سنوية',from:'28/09/2026',to:'30/09/2026',days:3,status:'مقبولة',balance:14,company:'elite'},{id:'LV-1003',employee:'سارة الغامدي',type:'مرضية',from:'10/09/2026',to:'11/09/2026',days:2,status:'مقبولة',balance:null,company:'elite'}];
const notifications=[['warning','12 إقامة ستنتهي خلال 30 يومًا','المستندات'],['warning','8 عقود ستنتهي قريبًا','المستندات'],['info','14 معاملة بانتظار الاعتماد','المعاملات'],['success','تم إغلاق 6 معاملات اليوم','المعاملات']];
const roles=[{id:'super',label:'Super Admin'},{id:'hrm',label:'HR Manager'},{id:'hrs',label:'HR Specialist'},{id:'manager',label:'Department Manager'},{id:'employee',label:'Employee'}];
export {companies,depts,branches,jobs,employeesFor,seedTransactions,leaves,notifications,roles};
