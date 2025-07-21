import { storage } from './storage';
import { sendEmail } from './email';
import { sendMoodReminderSMS } from './sms';
import { db } from './db';
import { notificationLog } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Track last email send times to prevent duplicates
const lastEmailSent: Map<string, number> = new Map();

// Track last SMS send times to prevent duplicates
const lastSmsSent: Map<string, number> = new Map();

interface NotificationSchedule {
  hour: number;
  minute: number;
  message: string;
  subject: string;
}

// Daily notification schedule: 12pm and 8pm
const NOTIFICATION_TIMES: NotificationSchedule[] = [
  {
    hour: 12,
    minute: 0,
    subject: 'Mood Check-in Reminder 🌞',
    message: 'How are you feeling today? Take a moment to log your mood and see how it correlates with today\'s lunar phase.'
  },
  {
    hour: 20,
    minute: 0,
    subject: 'Mood Reflection Time 🌙',
    message: 'How has your mood been today? Capture your feelings and continue your lunar mood journey.'
  }
];

export async function sendMoodReminders(): Promise<void> {
  try {
    console.log('🔄 Checking for users with notifications enabled...');
    
    // Get all users with email notifications enabled
    const usersWithEmailNotifications = await storage.getUsersWithEmailNotifications();
    
    // Get all users with SMS notifications enabled
    const usersWithSmsNotifications = await storage.getUsersWithSmsNotifications();
    
    if (usersWithEmailNotifications.length === 0 && usersWithSmsNotifications.length === 0) {
      console.log('📧 No users have notifications enabled');
      return;
    }

    console.log(`📧 Found ${usersWithEmailNotifications.length} users with email notifications enabled`);
    console.log(`📱 Found ${usersWithSmsNotifications.length} users with SMS notifications enabled`);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find matching notification time (exact hour and minute)
    const matchingSchedule = NOTIFICATION_TIMES.find(schedule => 
      schedule.hour === currentHour && schedule.minute === currentMinute
    );

    if (!matchingSchedule) {
      console.log(`⏰ Current time ${currentHour}:${currentMinute.toString().padStart(2, '0')} does not match notification schedule`);
      return;
    }

    // Create unique key for this notification time to prevent duplicates
    const notificationKey = `${currentHour}:${currentMinute}:${now.toDateString()}`;
    
    // Check database for recent notification to prevent duplicates across server restarts
    const recentNotification = await db.select()
      .from(notificationLog)
      .where(eq(notificationLog.notificationKey, notificationKey))
      .limit(1);
    
    if (recentNotification.length > 0) {
      const timeSinceLastSent = Date.now() - new Date(recentNotification[0].sentAt!).getTime();
      console.log(`⏸️ Skipping duplicate email send for ${notificationKey} (last sent ${Math.round(timeSinceLastSent/1000)} seconds ago via database check)`);
      return;
    }
    
    // Also check in-memory cache as secondary check
    const lastSentTime = lastEmailSent.get(notificationKey);
    if (lastSentTime && (Date.now() - lastSentTime) < 300000) { // 5 minute cooldown
      console.log(`⏸️ Skipping duplicate email send for ${notificationKey} (last sent ${Math.round((Date.now() - lastSentTime)/1000)} seconds ago via memory check)`);
      return;
    }

    const totalRecipients = usersWithEmailNotifications.length + usersWithSmsNotifications.length;
    console.log(`✨ Sending ${matchingSchedule.subject} reminders at ${currentHour}:${currentMinute.toString().padStart(2, '0')} to ${totalRecipients} users`);
    
    // Record notification in database to prevent duplicates across server restarts
    await db.insert(notificationLog).values({
      notificationKey: notificationKey,
      notificationType: 'email',
      recipientCount: totalRecipients
    });
    
    // Mark this notification time as processed in memory as well
    const currentTime = Date.now();
    lastEmailSent.set(notificationKey, currentTime);
    lastSmsSent.set(notificationKey, currentTime);
    
    console.log(`🔒 Logged notification ${notificationKey} in database and memory to prevent duplicates`);

    // Send emails to all users with email notifications enabled
    for (const user of usersWithEmailNotifications) {
      const emailAddress = user.notificationEmail || user.email;
      if (!emailAddress) continue;

      const userName = user.name || user.username || 'Friend';
      
      const moodReminderHtml = createMoodReminderHtml(userName, matchingSchedule);
      const moodReminderText = createMoodReminderText(userName, matchingSchedule);

      const success = await sendEmail({
        to: emailAddress,
        from: 'Samir Lal <contact@yoganebula.com>',
        subject: matchingSchedule.subject,
        html: moodReminderHtml,
        text: moodReminderText
      });

      if (success) {
        console.log(`✅ Mood reminder sent to ${emailAddress}`);
      } else {
        console.log(`❌ Failed to send mood reminder to ${emailAddress}`);
      }
    }

    // Send SMS to all users with SMS notifications enabled
    for (const user of usersWithSmsNotifications) {
      const phoneNumber = user.notificationPhone;
      if (!phoneNumber) continue;

      const userName = user.name || user.username || 'Friend';
      const timeOfDay = matchingSchedule.hour === 12 ? 'midday' : 'evening';
      
      const success = await sendMoodReminderSMS(phoneNumber, userName, timeOfDay);

      if (success) {
        console.log(`✅ SMS mood reminder sent to ${phoneNumber}`);
      } else {
        console.log(`❌ Failed to send SMS mood reminder to ${phoneNumber}`);
      }
    }
  } catch (error) {
    console.error('❌ Error sending mood reminders:', error);
  }
}

function createMoodReminderHtml(userName: string, schedule: NotificationSchedule): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${schedule.subject}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background-color: #f8fafc; 
          color: #1e293b; 
          line-height: 1.6; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, ${schedule.hour === 12 ? '#f59e0b, #d97706' : '#6366f1, #4f46e5'}); 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 { 
          color: white; 
          margin: 0; 
          font-size: 24px; 
          font-weight: 600; 
        }
        .content { 
          padding: 30px; 
          background: white;
        }
        .moon-icon { 
          text-align: center; 
          font-size: 48px; 
          margin: 20px 0; 
        }
        .cta-button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: linear-gradient(135deg, #8b5cf6, #a855f7); 
          color: white; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          margin: 20px 0;
        }
        .footer { 
          background-color: #f8fafc; 
          padding: 20px; 
          text-align: center; 
          font-size: 14px; 
          color: #64748b; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${schedule.subject}</h1>
        </div>
        <div class="content">
          <div class="moon-icon">${schedule.hour === 12 ? '🌞' : '🌙'}</div>
          
          <p><strong>Hi ${userName},</strong></p>
          
          <p>${schedule.message}</p>
          
          <p>Taking just a moment to check in with yourself can reveal patterns you might not notice otherwise. Your emotional landscape is always shifting—tracking it helps you see the bigger picture.</p>
          
          <div style="text-align: center;">
            <a href="https://insidemeter.com" class="cta-button">Log Your Mood</a>
          </div>
          
          <p><em>Remember: There's no perfect mood to track. Every feeling matters, and every entry brings you closer to understanding your own patterns.</em></p>
        </div>
        <div class="footer">
          <p>You're receiving this because you enabled email reminders in your InsideMeter settings.</p>
          <p><a href="https://insidemeter.com" style="color: #8b5cf6;">Manage notifications</a> | <a href="https://insidemeter.com" style="color: #8b5cf6;">Track your mood</a></p>
          <p>© 2025 YogaNebula | InsideMeter</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createMoodReminderText(userName: string, schedule: NotificationSchedule): string {
  return `${schedule.subject}

Hi ${userName},

${schedule.message}

Taking just a moment to check in with yourself can reveal patterns you might not notice otherwise. Your emotional landscape is always shifting—tracking it helps you see the bigger picture.

Visit: https://insidemeter.com

Remember: There's no perfect mood to track. Every feeling matters, and every entry brings you closer to understanding your own patterns.

You're receiving this because you enabled email reminders in your InsideMeter settings.
Manage notifications: https://insidemeter.com

© 2025 YogaNebula | InsideMeter`;
}

export async function sendTestNotifications(): Promise<void> {
  try {
    console.log('🧪 Sending test notifications...');
    
    // Create a test schedule for immediate sending
    const testSchedule: NotificationSchedule = {
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
      subject: '🧪 Test Mood Reminder',
      message: 'This is a test email to verify your mood reminder notifications are working correctly.'
    };

    // Get all users with email notifications enabled
    const usersWithNotifications = await storage.getUsersWithEmailNotifications();
    
    if (usersWithNotifications.length === 0) {
      console.log('📧 No users have email notifications enabled for testing');
      return;
    }

    console.log(`📧 Sending test emails to ${usersWithNotifications.length} users`);

    for (const user of usersWithNotifications) {
      const emailAddress = user.notificationEmail || user.email;
      if (!emailAddress) continue;

      const userName = user.name || user.username || 'Friend';
      
      const testHtml = createMoodReminderHtml(userName, testSchedule);
      const testText = createMoodReminderText(userName, testSchedule);

      const success = await sendEmail({
        to: emailAddress,
        from: 'Samir Lal <contact@yoganebula.com>',
        subject: testSchedule.subject,
        html: testHtml,
        text: testText
      });

      if (success) {
        console.log(`✅ Test email sent to ${emailAddress}`);
      } else {
        console.log(`❌ Failed to send test email to ${emailAddress}`);
      }
    }
  } catch (error) {
    console.error('❌ Error sending test notifications:', error);
  }
}

export function startNotificationScheduler(): void {
  console.log('📅 Starting email notification scheduler...');
  
  // Check for notifications every minute
  setInterval(async () => {
    await sendMoodReminders();
  }, 60000); // 1 minute = 60,000 milliseconds
  
  console.log('✅ Email notification scheduler started - checking every minute for 12:00 PM and 8:00 PM reminders');
}