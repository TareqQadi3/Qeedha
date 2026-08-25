/**
 * English strings for the owner/manager dashboard. Must have the exact same key set as
 * `ar.ts` — enforced by src/__tests__/i18nKeyParity.test.ts.
 */
import { TranslationKeys } from './ar';

const en: Record<TranslationKeys, string> = {
  app_title: 'Qeedha',
  app_subtitle: 'Merchant Owner Dashboard',

  common_logout: 'Log out',
  common_cancel: 'Cancel',
  common_confirm: 'Confirm',
  common_save: 'Save',
  common_close: 'Close',
  common_loading: 'Loading...',
  common_error_generic: 'Something went wrong',
  common_reason: 'Reason',
  common_reason_required: 'Please enter a reason',
  common_optional: '(optional)',
  common_language_toggle: 'العربية',
  common_created_at: 'Created at',
  common_actions: 'Actions',
  common_status: 'Status',
  common_name: 'Name',
  common_empty: 'No data to display',
  common_sar: 'SAR',
  common_all: 'All',

  nav_overview: 'Overview',
  nav_branches: 'Branches',
  nav_users: 'Users',
  nav_transactions: 'Transactions',
  nav_settlements: 'Settlements',
  nav_cashier: 'Cashier',

  role_OWNER: 'Owner',
  role_MANAGER: 'Manager',
  role_CASHIER: 'Cashier',

  user_status_ACTIVE: 'Active',
  user_status_SUSPENDED: 'Suspended',

  overview_title: 'Overview',
  overview_branches_count: 'Branches',
  overview_users_count: 'Users',
  overview_recent_settlements: 'Recent settlements',
  overview_settlements_empty: 'No settlements yet',

  branches_title: 'Branches',
  branches_empty: 'No branches yet',
  branches_col_name: 'Branch name',
  branches_col_geo: 'Geo location',
  branches_create_button: 'Add branch',
  branches_name_label: 'Branch name',
  branches_name_placeholder: 'e.g. Main branch',
  branches_lat_label: 'Latitude',
  branches_lng_label: 'Longitude',
  branches_create_success: 'Branch added successfully',

  users_title: 'Users',
  users_empty: 'No users yet',
  users_col_name: 'Name',
  users_col_phone: 'Phone',
  users_col_role: 'Role',
  users_create_button: 'Add user',
  users_fullname_label: 'Full name',
  users_phone_label: 'Phone number',
  users_phone_placeholder: '+9665xxxxxxxx',
  users_password_label: 'Password',
  users_role_label: 'Role',
  users_status_label: 'Status',
  users_create_success: 'User added successfully',
  users_update_status_success: 'User updated',

  transactions_title: 'Transactions',
  transactions_empty: 'No matching transactions',
  transactions_filter_branch_all: 'All branches',
  transactions_filter_status_all: 'All statuses',
  transactions_col_id: 'Transaction ID',
  transactions_col_branch: 'Branch',
  transactions_col_type: 'Type',
  transactions_col_amount: 'Amount',
  transactions_col_method: 'Method',
  transactions_refund_action: 'Refund',
  transactions_refund_modal_title: 'Confirm refund',
  transactions_refund_reason_label: 'Refund reason',
  transactions_refund_reason_placeholder: 'Write the refund reason...',
  transactions_refund_success: 'Refund completed successfully',
  transactions_load_more: 'Load more',

  transaction_type_ACTIVATION: 'Activation',
  transaction_type_PURCHASE: 'Purchase',
  transaction_type_REFUND: 'Refund',
  transaction_type_REVERSAL: 'Reversal',

  transaction_status_PENDING: 'Pending',
  transaction_status_COMPLETED: 'Completed',
  transaction_status_FAILED: 'Failed',
  transaction_status_REVERSED: 'Reversed',

  settlements_title: 'Settlements',
  settlements_empty: 'No matching settlements',
  settlements_col_period: 'Period',
  settlements_col_gross: 'Gross',
  settlements_col_commission: 'Commission',
  settlements_col_net: 'Net payable',

  settlements_status_PENDING: 'Pending',
  settlements_status_PAID: 'Paid',
  settlements_status_RECONCILED: 'Reconciled',
};

export default en;
