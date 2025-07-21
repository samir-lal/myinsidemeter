// iOS Native Notification Service
// This will replace the current email/SMS notification system

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class iOSNotificationService {
  
  static async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not running on native platform');
      return false;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async scheduleDailyMoodReminders(userId: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not running on native platform');
      return;
    }

    try {
      // Cancel existing notifications
      await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }] });

      // Schedule 12 PM notification
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      if (noon.getTime() <= Date.now()) {
        noon.setDate(noon.getDate() + 1); // Schedule for tomorrow if past today's time
      }

      // Schedule 8 PM notification
      const evening = new Date();
      evening.setHours(20, 0, 0, 0);
      if (evening.getTime() <= Date.now()) {
        evening.setDate(evening.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Mood Check-In 🌙",
            body: "How are you feeling right now? Take a moment to reflect.",
            id: 1001,
            schedule: { 
              at: noon,
              repeats: true,
              every: 'day'
            },
            actionTypeId: "mood-reminder-noon",
            sound: "default",
            attachments: [],
            extra: { userId, time: 'noon' }
          },
          {
            title: "Evening Reflection ✨", 
            body: "End your day with mindful awareness. Track your mood.",
            id: 1002,
            schedule: { 
              at: evening,
              repeats: true,
              every: 'day'
            },
            actionTypeId: "mood-reminder-evening",
            sound: "default", 
            attachments: [],
            extra: { userId, time: 'evening' }
          }
        ]
      });

      console.log('Daily mood reminders scheduled successfully');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const pending = await LocalNotifications.getPending();
      const ids = pending.notifications.map(n => ({ id: n.id }));
      
      if (ids.length > 0) {
        await LocalNotifications.cancel({ notifications: ids });
      }
      
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  static async sendTestNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      alert('Test notification: This would appear as a native iOS notification!');
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Test Notification",
            body: "Your iOS mood tracking app is working perfectly! 🎉",
            id: 9999,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            actionTypeId: "test-notification",
            sound: "default",
            attachments: [],
            extra: { test: true }
          }
        ]
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  static setupNotificationActionHandlers(): void {
    if (!Capacitor.isNativePlatform()) return;

    // Handle notification taps
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('Notification action performed:', notification);
      
      const { actionId } = notification;
      
      if (actionId === 'mood-reminder-noon' || actionId === 'mood-reminder-evening') {
        // Navigate to mood logging page
        window.location.href = '/';
      }
    });

    // Handle notification received while app is in foreground
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });
  }
}