FIX17 - Customer Credit/Cash Master Integration

تم ربط Salesman Profile بالشيت:
Customers info Credit&Cash

الأعمدة المعتمدة:
A Customer Number
B Customer Name
C Salesman Code
D CR Limit
E Max Days
F Status

التعديل:
- Credit Limit في Salesman Profile وطباعته أصبح من الشيت الجديد لكل العملاء، وليس فقط من Due & Overdue.
- لو CR Limit فارغ أو صفر يظهر Cash بدل SAR 0.00.
- لو العميل عليه Overdue يظل Status = Overdue.
- إذا لا يوجد Overdue ويكون Status في الشيت Inactive يظهر Inactive، وإلا Active.
- الأكواد المدمجة تستمر بالاعتماد على Target كما هي.

الملفات المعدلة:
1) Code.gs (Google Apps Script)
2) Sales Dashboard 2/profiles.js (واجهة GitHub)

بعد استبدال Code.gs: Save ثم Update Deployment.
بعد استبدال profiles.js على GitHub: Commit + Push ثم Ctrl+F5.
