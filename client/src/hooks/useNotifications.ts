import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

interface NotificationPermissions {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export function useNotifications() {
  const [permissions, setPermissions] = useState<NotificationPermissions>({
    granted: false,
    denied: false,
    prompt: true
  });
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      checkPermissions();
    }
  }, []);

  const checkPermissions = async () => {
    try {
      const localPermissions = await LocalNotifications.checkPermissions();
      const pushPermissions = await PushNotifications.checkPermissions();
      
      setPermissions({
        granted: localPermissions.display === 'granted' && pushPermissions.receive === 'granted',
        denied: localPermissions.display === 'denied' || pushPermissions.receive === 'denied',
        prompt: localPermissions.display === 'prompt-with-rationale' || pushPermissions.receive === 'prompt-with-rationale'
      });
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      // Request local notification permissions
      const localResult = await LocalNotifications.requestPermissions();
      
      // Request push notification permissions
      const pushResult = await PushNotifications.requestPermissions();
      
      const granted = localResult.display === 'granted' && pushResult.receive === 'granted';
      
      setPermissions({
        granted,
        denied: localResult.display === 'denied' || pushResult.receive === 'denied',
        prompt: false
      });

      if (granted) {
        // Register for push notifications
        await PushNotifications.register();
      }

      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const scheduleLocalNotification = async (title: string, body: string, schedule?: Date) => {
    if (!Capacitor.isNativePlatform() || !permissions.granted) {
      return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: schedule ? { at: schedule } : undefined,
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {}
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  };

  const scheduleDailyReminder = async (hour: number, minute: number) => {
    if (!Capacitor.isNativePlatform() || !permissions.granted) {
      return false;
    }

    try {
      const now = new Date();
      const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
      
      // If the time has passed today, schedule for tomorrow
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'InsideMeter Reminder',
            body: 'Time to track your mood and see how the moon is affecting your emotions! 🌙',
            id: hour * 100 + minute, // Unique ID based on time
            schedule: {
              at: scheduledTime,
              repeats: true,
              every: 'day'
            },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {}
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      return false;
    }
  };

  const cancelNotification = async (id: number) => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  };

  return {
    permissions,
    isNative,
    requestPermissions,
    scheduleLocalNotification,
    scheduleDailyReminder,
    cancelNotification,
    checkPermissions
  };
}