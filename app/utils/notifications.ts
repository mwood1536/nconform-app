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

// Cancels every NConform-scheduled notification and reschedules based on the
// current prefs + live data counts. Safe to call repeatedly (idempotent).
export async function applyNotificationPrefs(
  prefs: NotificationPrefs,
  counts: AlertCounts,
): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const anyEnabled =
      prefs.dailyReminderEnabled ||
      prefs.overdueActionAlerts ||
      prefs.auditDueAlerts ||
      prefs.trainingOverdueAlerts;
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
        },
        trigger: dailyTrigger(8, 10),
      });
    }
  } catch {
    // Notifications are best-effort; never crash the app over them.
  }
}
