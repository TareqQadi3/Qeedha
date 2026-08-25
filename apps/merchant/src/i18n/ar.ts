/**
 * Arabic strings (default language) for the owner/manager dashboard. `en.ts` must have the
 * exact same key set — enforced by src/__tests__/i18nKeyParity.test.ts.
 *
 * Scope note: this i18n system covers only the NEW Owner/Manager dashboard added in this
 * phase (OwnerShell + its sections). The pre-existing Login/Cashier screens stay
 * Arabic-only/hardcoded on purpose — see the phase notes — and do not use this module.
 */
const ar = {
  app_title: 'قيّدها',
  app_subtitle: 'لوحة صاحب المتجر',

  common_logout: 'تسجيل الخروج',
  common_cancel: 'إلغاء',
  common_confirm: 'تأكيد',
  common_save: 'حفظ',
  common_close: 'إغلاق',
  common_loading: 'جارٍ التحميل...',
  common_error_generic: 'حدث خطأ غير متوقع',
  common_reason: 'السبب',
  common_reason_required: 'الرجاء إدخال السبب',
  common_optional: '(اختياري)',
  common_language_toggle: 'English',
  common_created_at: 'تاريخ الإنشاء',
  common_actions: 'الإجراءات',
  common_status: 'الحالة',
  common_name: 'الاسم',
  common_empty: 'لا توجد بيانات لعرضها',
  common_sar: 'ريال',
  common_all: 'الكل',

  nav_overview: 'نظرة عامة',
  nav_branches: 'الفروع',
  nav_users: 'المستخدمون',
  nav_transactions: 'العمليات',
  nav_settlements: 'التسويات',
  nav_cashier: 'صندوق الدفع',

  role_OWNER: 'مالك',
  role_MANAGER: 'مدير',
  role_CASHIER: 'كاشير',

  user_status_ACTIVE: 'نشط',
  user_status_SUSPENDED: 'موقوف',

  overview_title: 'نظرة عامة',
  overview_branches_count: 'عدد الفروع',
  overview_users_count: 'عدد المستخدمين',
  overview_recent_settlements: 'أحدث التسويات',
  overview_settlements_empty: 'لا توجد تسويات بعد',

  branches_title: 'الفروع',
  branches_empty: 'لا توجد فروع بعد',
  branches_col_name: 'اسم الفرع',
  branches_col_geo: 'الموقع الجغرافي',
  branches_create_button: 'إضافة فرع',
  branches_name_label: 'اسم الفرع',
  branches_name_placeholder: 'مثال: الفرع الرئيسي',
  branches_lat_label: 'خط العرض',
  branches_lng_label: 'خط الطول',
  branches_create_success: 'تمت إضافة الفرع بنجاح',

  users_title: 'المستخدمون',
  users_empty: 'لا يوجد مستخدمون بعد',
  users_col_name: 'الاسم',
  users_col_phone: 'الجوال',
  users_col_role: 'الدور',
  users_create_button: 'إضافة مستخدم',
  users_fullname_label: 'الاسم الكامل',
  users_phone_label: 'رقم الجوال',
  users_phone_placeholder: '+9665xxxxxxxx',
  users_password_label: 'كلمة المرور',
  users_role_label: 'الدور',
  users_status_label: 'الحالة',
  users_create_success: 'تمت إضافة المستخدم بنجاح',
  users_update_status_success: 'تم تحديث بيانات المستخدم',

  transactions_title: 'العمليات',
  transactions_empty: 'لا توجد عمليات مطابقة',
  transactions_filter_branch_all: 'كل الفروع',
  transactions_filter_status_all: 'كل الحالات',
  transactions_col_id: 'رقم العملية',
  transactions_col_branch: 'الفرع',
  transactions_col_type: 'النوع',
  transactions_col_amount: 'المبلغ',
  transactions_col_method: 'الطريقة',
  transactions_refund_action: 'استرجاع',
  transactions_refund_modal_title: 'تأكيد الاسترجاع',
  transactions_refund_reason_label: 'سبب الاسترجاع',
  transactions_refund_reason_placeholder: 'اكتب سبب الاسترجاع...',
  transactions_refund_success: 'تم تنفيذ الاسترجاع بنجاح',
  transactions_load_more: 'تحميل المزيد',

  transaction_type_ACTIVATION: 'تفعيل',
  transaction_type_PURCHASE: 'شراء',
  transaction_type_REFUND: 'استرجاع',
  transaction_type_REVERSAL: 'عكس عملية',

  transaction_status_PENDING: 'معلّقة',
  transaction_status_COMPLETED: 'مكتملة',
  transaction_status_FAILED: 'فاشلة',
  transaction_status_REVERSED: 'معكوسة',

  settlements_title: 'التسويات',
  settlements_empty: 'لا توجد تسويات مطابقة',
  settlements_col_period: 'الفترة',
  settlements_col_gross: 'الإجمالي',
  settlements_col_commission: 'العمولة',
  settlements_col_net: 'الصافي المستحق',

  settlements_status_PENDING: 'معلّقة',
  settlements_status_PAID: 'مدفوعة',
  settlements_status_RECONCILED: 'تمت المطابقة',
} as const;

export type TranslationKeys = keyof typeof ar;

export default ar;
