import type { TranslationKeys } from './ar';

/**
 * English strings. Must have the exact same key set as ar.ts —
 * enforced by src/i18n/__tests__/keyParity.test.ts.
 */
const en: Record<TranslationKeys, string> = {
  common_skip: 'Skip',
  common_next: 'Next',
  common_back: 'Back',
  common_continue: 'Continue',
  common_cancel: 'Cancel',
  common_confirm: 'Confirm',
  common_retry: 'Retry',
  common_loading: 'Loading...',
  common_error_generic: 'Something went wrong',
  common_save: 'Save',
  common_sar: 'SAR',

  onboarding_slide1_title: 'Instant credit for your groceries',
  onboarding_slide1_body:
    'Qeedha gives you a balance to shop at partner grocery stores and split your payment with ease.',
  onboarding_slide2_title: 'Pay with one tap',
  onboarding_slide2_body: 'Scan a QR code or use the cashier code when paying in-store.',
  onboarding_slide3_title: 'Full control over your spending',
  onboarding_slide3_body: 'Track your balance, purchases, and financing requests in one place.',
  onboarding_get_started: 'Get started',

  phone_title: 'Phone number',
  phone_subtitle: 'Enter your Saudi phone number to log in or create a new account',
  phone_placeholder: '+9665XXXXXXXX',
  phone_invalid: 'Please enter a valid Saudi phone number (+9665XXXXXXXX)',
  phone_send_code: 'Send code',

  otp_title: 'Verification code',
  otp_subtitle: 'Enter the code sent to',
  otp_resend_in: 'You can resend in {seconds}s',
  otp_resend: 'Resend code',
  otp_verify: 'Verify',
  otp_name_prompt: "Looks like you're new here, what's your full name?",
  otp_name_placeholder: 'Full name',
  otp_invalid: 'Invalid code, please try again',

  pin_setup_title: 'Create a PIN',
  pin_setup_subtitle: 'Create a 4-6 digit PIN to protect your account',
  pin_setup_confirm_title: 'Confirm PIN',
  pin_setup_confirm_subtitle: 'Enter the PIN again to confirm',
  pin_mismatch: "PINs don't match, please try again",
  pin_unlock_title: 'Enter your PIN',
  pin_unlock_forgot: 'Forgot PIN?',
  pin_invalid: 'Incorrect PIN',

  nafath_title: 'Identity verification (Nafath)',
  nafath_body: 'For a better experience and a higher balance, verify your identity via Nafath.',
  nafath_national_id_placeholder: 'National ID / Iqama number',
  nafath_start: 'Start verification',
  nafath_skip: 'Skip for now',
  nafath_status_pending: 'Your verification request is being reviewed via Nafath',
  nafath_status_verified: 'Your identity has been verified',
  nafath_status_rejected: 'Verification failed, please try again later',

  home_hello: 'Hello',
  home_wallet_remaining: 'Remaining',
  home_wallet_total: 'Total balance',
  home_wallet_none_title: 'No active balance',
  home_wallet_none_body: 'Request a new balance to start shopping at partner stores',
  home_request_new: 'Request new balance',
  home_low_balance_banner: 'Your remaining balance is low',
  home_pay_button: 'Pay',
  home_recent_transactions: 'Recent transactions',
  home_view_all: 'View all',
  home_no_transactions: 'No transactions yet',

  financing_step_merchant_title: 'Store code',
  financing_step_merchant_subtitle: 'Enter the store code or ID (search by code)',
  financing_merchant_placeholder: 'Store ID',
  financing_merchant_resolve: 'Check',
  financing_merchant_not_found: 'Could not find that store, check the code',
  financing_step_amount_title: 'Requested amount',
  financing_amount_custom: 'Custom amount',
  financing_step_plan_title: 'Payment plan',
  financing_plan_pay_in_1: 'Pay in full today',
  financing_plan_pay_in_30: 'Within 30 days',
  financing_plan_installments_4: '4 installments',
  financing_step_review_title: 'Review request',
  financing_review_merchant: 'Store',
  financing_review_amount: 'Amount',
  financing_review_plan: 'Plan',
  financing_submit: 'Submit request',

  application_status_title: 'Application status',
  application_status_pending: 'Your request is under review...',
  application_status_approved: 'Your request has been approved',
  application_status_rejected: 'Your request was rejected',
  application_status_go_home: 'Go to home',

  pay_title: 'Pay',
  pay_tab_qr: 'QR code',
  pay_tab_manual: 'Cashier code',
  pay_qr_expires_in: 'Expires in {seconds}s',
  pay_manual_send: 'Send code',
  pay_manual_instructions:
    'A code was sent to your phone via SMS. Read it aloud to the cashier to complete the payment.',
  pay_manual_sent: 'Code sent',

  history_title: 'Transaction history',
  history_empty: 'No transactions yet',

  repayment_title: 'Repayment',
  repayment_note:
    'Repayment and collection are handled by the financing partner — Qeedha does not collect payments directly.',
  repayment_no_applications: 'No financing applications yet',
  repayment_decided_at: 'Decided on',

  account_title: 'Account',
  account_language: 'Language',
  account_logout: 'Log out',

  txn_type_activation: 'Wallet activation',
  txn_type_purchase: 'Purchase',
  txn_type_refund: 'Refund',
  txn_type_reversal: 'Reversal',
  txn_status_pending: 'Pending',
  txn_status_completed: 'Completed',
  txn_status_failed: 'Failed',
  txn_status_reversed: 'Reversed',
};

export default en;
