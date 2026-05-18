import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  LogNCR: undefined;
  NCRDetail: { ncrId: string };
  AICorrectiveAction: { ncrId: string };
  Settings: undefined;
  Reports: undefined;
  Actions: undefined;
  OnePager: { ncrId?: string } | undefined;
  AuditBuilder: { templateId?: string } | undefined;
  AuditExecution: { auditId: string };
  TrainingForm: { recordId?: string } | undefined;
  UserDirectory: undefined;
  StandardsLibrary: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  NCRs: undefined;
  Audits: undefined;
  Training: undefined;
  More: undefined;
};
