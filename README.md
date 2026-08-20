# قيّدها (Qeedha)

منصة رصيد البقالة الممول بالتقسيط — بناءً على الخطة المرجعية.

## هيكل Monorepo

```
.
├── apps
│   ├── api              # Backend (NestJS + PostgreSQL + Prisma)
│   ├── customer         # تطبيق العميل (React Native)
│   ├── merchant         # بوابة البقالة PWA (React + Tailwind)
│   └── admin            # لوحة تحكم المنصة (React + Tailwind)
├── packages
│   └── shared           # الأنواع والثوابت المشتركة
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## أدوات الجذر

- `pnpm dev` — تشغيل التطبيقات في وضع التطوير.
- `pnpm build` — بناء كل التطبيقات.
- `pnpm lint` — تنسيق وفحص.
- `pnpm db:generate` — توليد Prisma Client.
- `pnpm db:validate` — التحقق من سلامة مخطط قاعدة البيانات.
- `pnpm db:migrate` — تطبيق الهجرات.
- `pnpm db:studio` — استعراض قاعدة البيانات.

## ملاحظات المرحلة الأولى

- تم إنشاء هيكل Monorepo بـ Turborepo + pnpm.
- تم إنشاء Prisma Schema وفق الجداول الملزمة في الخطة، مع:
  - UUID كمفاتيح أساسية.
  - Soft delete عبر `deleted_at`.
  - `idempotency_key` فريد على `transactions`.
  - حماية `ledger_entries` من التعديل/الحذف بواسطة Triggers.
- تم إنشاء Migration SQL الأولى تحت `apps/api/prisma/migrations/20250731120000_init/`.
- تم إنشاء عقد OpenAPI كاملة تحت `apps/api/docs/openapi.yaml`.
- تم إنشاء أماكن مبدئية للواجهات الثلاث.

## الهوية اللونية

- أساسي: `#0E5F58`
- ثانوي: `#F5A623`
- نصوص: `#1E293B`

## ما تم إنجازه في المرحلة 2

- **Auth Module:** OTP بمحاولات محدودة + Rate limiting عبر Redis، JWT + Refresh Token دوّار، PIN، وواجهة Stub لنفاذ.
- **Customers & Merchants:** CRUD أساسي + RBAC (Owner/Manager/Cashier).
- **Wallets Module:** طلب رصيد عبر FinancingGateway.
- **Transactions Module:** دفع QR/OTP مع Idempotency، استرجاع، وربط مباشر بالـ Ledger.
- **Ledger Service:** قيد مزدوج لكل عملية مالية (Activation / Purchase / Refund)، محمي بـ DB Triggers ضد التعديل/الحذف.
- **FinancingGateway:** واجهة موحدة + ManualAdapter كامل + نقطة قرار يدوي في الأدمن.
- **QR:** توكنات TOTP صالحة 60 ثانية مع منع إعادة الاستخدام عبر Redis.
- **Notifications:** Stub جاهز للربط بـ Unifonic/FCM.
- **Audit:** سجل تدقيق لكل عملية مالية.
- **اختبارات وحدة:** 24 اختبارًا ناجحًا للنواة المالية Wallets/Transactions/Ledger.

## Integration API (تكامل Qeedha B)

- **مصادقة Server-to-Server:** بيانات اعتماد لكل بقالة (`X-Api-Key` / `X-Api-Secret`) مُصدرة من لوحة الأدمن.
- **ربط عملاء خارجيين:** `ExternalCustomerMapping` مع تحقق من ملكية العلاقة (محفظة فعلية) قبل الربط.
- **الشحن والاسترجاع:** `POST /integration/v1/charges` و `/refunds` بمعرّف `externalTransactionId` كآلية Idempotency أساسية، إلى جانب `Idempotency-Key`، مع قيد أحادي العملة (SAR) في هذه النسخة.
- **Webhooks:** تسجيل نقاط استقبال وتوقيع HMAC-SHA256 (سر مُشفّر بـ AES-256-GCM قابل لإعادة الفك)، بلا طابور إعادة محاولة في هذه المرحلة.
- **إعادة استخدام:** الشحن يمر عبر `TransactionsService.payFromIntegration` نفسه المسؤول عن الـ Ledger، دون تكرار منطق الدفع.

## تطبيق العميل (`apps/customer`)

- **تطبيق حقيقي مربوط بالـ API الفعلي:** Expo 52 / React Native 0.76 مع React Navigation (native-stack) و13 شاشة كاملة — Onboarding، دخول بالجوال/OTP، إنشاء PIN وقفل/فتح محلي، نفاذ (Stub حقيقي)، الرئيسية (بطاقة المحفظة + آخر العمليات)، طلب رصيد جديد (خطوات: كود البقالة → مبلغ → خطة → مراجعة)، حالة الطلب (Polling)، الدفع (QR حي عبر `react-native-qrcode-svg` + رمز الكاشير عبر SMS)، السجل، السداد (توضيحي فقط، لا تحصيل من قيّدها)، والحساب.
- **i18n خفيف مخصص:** عربي/إنجليزي بدون i18next، مع اتجاه RTL/LTR مبني على Context (بدون `I18nManager.forceRTL`)، عربي كلغة افتراضية، واختبار تطابق مفاتيح بين القاموسين.
- **تخزين آمن:** التوكنات ورمز PIN (كعلَم فقط) عبر `expo-secure-store`، لا تخزين في AsyncStorage.
- **API Client:** غلاف `fetch` نمطي بأخطاء مُصنّفة (`message`/`code`/`status`) مع تحديث توكن صامت مرة واحدة (refresh-and-retry) عند 401 قبل تسجيل الخروج القسري.
- **إضافات خلفية داعمة (Backend، صغيرة وإضافية):**
  - `GET /customers/me/qr-code` — يولّد توكن الدفع بصيغة `${customerId}:${code}` التي يتوقعها مسار الكاشير الحالي.
  - `GET /merchants/:id/public` — يعيد `{id, name, status}` فقط (بدون بيانات حساسة) لتمكين العميل من التحقق من اسم البقالة قبل تقديم طلب تمويل.
  - **تشديد ملكية المحفظة:** `WalletsService.findById`/`getBalance` باتا يتحققان أن المحفظة تعود لصاحب الـ JWT (`FORBIDDEN` غير ذلك) — كانت ثغرة قائمة قبل أن يصبح تطبيق العميل أول مستهلك حقيقي لهذين المسارين.

## أدوات تشغيل

- `pnpm dev` — وضع التطوير.
- `pnpm build` — بناء الكل.
- `pnpm db:deploy` — تطبيق الهجرات على Postgres.
- `pnpm --filter api test -- --coverage` — اختبارات الوحدة.
