# نشر واختبار قواعد Firestore

1. افتح Firebase Console ثم المشروع `financial-app-96527` ثم Firestore Database > Rules.
2. انسخ محتوى `firestore.rules` والصقه ثم اختر **Publish**. وجود الملف محليًا لا ينشر القواعد.
3. اختبر بحساب A: القراءة والكتابة داخل `users/{A_UID}/...` تنجح.
4. اختبر بحساب A محاولة قراءة أو كتابة `users/{B_UID}/...`: يجب أن تفشل بـ `permission-denied`.
5. اختبر دون تسجيل دخول: أي قراءة أو كتابة يجب أن تفشل بـ `permission-denied`.

لا تنشر التطبيق قبل نجاح الاختبارات الثلاثة.
