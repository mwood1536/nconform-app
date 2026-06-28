import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  LogNCR: undefined;
  NCRDetail: { ncrId: string };
  AICorrectiveAction: { ncrId: string };
  Settings: undefined;
  Reports: undefined;
  Actions: { initialFilter?: 'All' | 'Open' | 'Overdue' | 'Completed' } | undefined;
  OnePager: { ncrId?: string } | undefined;
  AuditBuilder: { templateId?: string } | undefined;
  AuditExecution: { auditId: string };
  AuditSchedule: undefined;
  TrainingForm: { recordId?: string; templateId?: string } | undefined;
  TrainingTemplates: undefined;
  UserDirectory: undefined;
  StandardsLibrary: undefined;
  SafetyObservation: undefined;
  Search: undefined;
  Pareto: undefined;
  DepartmentBreakdown: undefined;
  ManageDepartments: undefined;
  QuestionBank: undefined;
  HelpFAQ: undefined;
  Quiz: { recordId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  NCRs:
    | {
        filterIds?: string[];
        filterTitle?: string;
        initialStatus?: 'All' | 'Open' | 'In Progress' | 'Closed' | 'Overdue';
      }
    | undefined;
  Audits: undefined;
  Training: { initialFilter?: string } | undefined;
  More: undefined;
};
