export type RootStackParamList = {
  Onboarding: undefined;
  PhoneEntry: undefined;
  OtpVerify: { phone: string; purpose: 'LOGIN' | 'RESET_PIN'; canResendInSeconds: number };
  PinSetup: { mode?: 'reset' } | undefined;
  PinUnlock: undefined;
  NafathVerify: undefined;
  Home: undefined;
  RequestFinancing: undefined;
  ApplicationStatus: { applicationId: string };
  Pay: undefined;
  History: { walletId: string };
  Repayment: undefined;
  Account: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
