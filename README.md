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

## أدوات تشغيل

- `pnpm dev` — وضع التطوير.
- `pnpm build` — بناء الكل.
- `pnpm db:deploy` — تطبيق الهجرات على Postgres.
- `pnpm --filter api test -- --coverage` — اختبارات الوحدة.
