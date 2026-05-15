import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  LogNCR: undefined;
  NCRDetail: { ncrId: string };
  AICorrectiveAction: { ncrId: string };
  Settings: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  NCRs: undefined;
  Audits: undefined;
  Actions: undefined;
  Reports: undefined;
};
