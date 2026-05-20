import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationPrefs } from './storage';

// Local notifications only — no server. All scheduling is on-device.

let handlerConfigured = false;

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('nconform-reminders', {
    name: 'NConform Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

export interface AlertCounts {
  openNCRs: number;
  overdueActions: number;
  auditsInProgress: number;
  overdueTraining: number;
  expiringCerts30: number;
}

function dailyTrigger(
  hour: number,
  minute: number,
): Notifications.DailyTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: 'nconform-reminders',
  };
}

// Cancels every NConform daily-batch notification and reschedules based on the
// current prefs + live data counts. Safe to call repeatedly (idempotent).
// Targeted reminders scheduled via scheduleAuditReminder / scheduleTrainingReminder
// are owned by their callers and tracked by ID so they survive a daily refresh.
export async function applyNotificationPrefs(
  prefs: NotificationPrefs,
  counts: AlertCounts,
): Promise<void> {
  try {
    // Remove only the daily-batch IDs, not user-targeted reminders.
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of all) {
      const tag = (item.content?.data as { tag?: string } | undefined)?.tag;
      if (tag === 'daily-batch') {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
    const anyEnabled =
      prefs.dailyReminderEnabled ||
      prefs.overdueActionAlerts ||
      prefs.auditDueAlerts ||
      prefs.trainingOverdueAlerts ||
      prefs.certificationExpiryAlerts;
    if (!anyEnabled) return;

    const granted = await requestNotificationPermission();
    if (!granted) return;
    await ensureAndroidChannel();

    if (prefs.dailyReminderEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'NConform — Daily Review',
          body:
            counts.openNCRs > 0
              ? `You have ${counts.openNCRs} open NCR${
                  counts.openNCRs === 1 ? '' : 's'
                } to review.`
              : 'Review your open nonconformances and corrective actions.',
          data: { tag: 'daily-batch' },
        },
        trigger: dailyTrigger(prefs.dailyReminderHour, prefs.dailyReminderMinute),
      });
    }

    if (prefs.overdueActionAlerts && counts.overdueActions > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Overdue Actions',
          body: `${counts.overdueActions} action${
            counts.overdueActions === 1 ? ' is' : 's are'
          } past due.`,
          data: { tag: 'daily-batch' },
        },
        trigger: dailyTrigger(8, 0),
      });
    }

    if (prefs.auditDueAlerts && counts.auditsInProgress > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Audits Awaiting Completion',
          body: `${counts.auditsInProgress} audit${
            counts.auditsInProgress === 1 ? ' is' : 's are'
          } still in progress.`,
          data: { tag: 'daily-batch' },
        },
        trigger: dailyTrigger(8, 5),
      });
    }

    if (prefs.trainingOverdueAlerts && counts.overdueTraining > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Training Overdue',
          body: `${counts.overdueTraining} training record${
            counts.overdueTraining === 1 ? ' is' : 's are'
          } overdue for sign-off.`,
          data: { tag: 'daily-batch' },
        },
        trigger: dailyTrigger(8, 10),
      });
    }

    if (prefs.certificationExpiryAlerts && counts.expiringCerts30 > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Certifications Expiring',
          body: `${counts.expiringCerts30} certification${
            counts.expiringCerts30 === 1 ? '' : 's'
          } expire in the next 30 days.`,
          data: { tag: 'daily-batch' },
        },
        trigger: dailyTrigger(8, 15),
      });
    }
  } catch {
    // Notifications are best-effort; never crash the app over them.
  }
}

interface DateReminder {
  title: string;
  body: string;
  date: Date;
}

async function scheduleDateReminder(
  reminder: DateReminder,
  tag: string,
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    await ensureAndroidChannel();
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminder.date,
      channelId: 'nconform-reminders',
    };
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { tag },
      },
      trigger,
    });
  } catch {
    return null;
  }
}

export async function scheduleAuditReminder(
  reminder: DateReminder,
): Promise<string | null> {
  return scheduleDateReminder(reminder, 'audit-due');
}

export async function scheduleTrainingReminder(
  reminder: DateReminder,
): Promise<string | null> {
  return scheduleDateReminder(reminder, 'training-due');
}

export async function scheduleCertificationExpiryReminder(
  reminder: DateReminder,
): Promise<string | null> {
  return scheduleDateReminder(reminder, 'cert-expiry');
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignored — best-effort cleanup
  }
}
