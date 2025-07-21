import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.warn("Twilio SMS credentials not configured - SMS notifications will be disabled");
}

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

interface SMSParams {
  to: string;
  message: string;
}

export async function sendSMS(params: SMSParams): Promise<boolean> {
  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('Twilio not configured - cannot send SMS');
    return false;
  }

  try {
    // Format phone number (ensure it starts with +1 for US numbers)
    let toNumber = params.to.trim();
    if (!toNumber.startsWith('+')) {
      toNumber = '+1' + toNumber.replace(/\D/g, ''); // Remove non-digits and add +1
    }

    const message = await client.messages.create({
      body: params.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber,
    });

    console.log(`✅ SMS sent successfully to ${toNumber}, SID: ${message.sid}`);
    return true;
  } catch (error: any) {
    console.error('❌ SMS send error:', error.message);
    
    // Check for specific Twilio permission errors
    if (error.message && error.message.includes('Permission to send an SMS has not been enabled')) {
      console.error('⚠️  Twilio SMS permissions issue: Geographic restrictions may apply. Check Twilio console for supported regions.');
    }
    
    return false;
  }
}

export async function sendMoodReminderSMS(phoneNumber: string, userName: string, timeOfDay: string): Promise<boolean> {
  const messages = {
    morning: `🌅 Good morning ${userName}! How are you feeling today? Take a moment to check in with yourself: https://insidemeter.com`,
    evening: `🌙 Hi ${userName}, time for your evening reflection. How did today feel? Track your mood: https://insidemeter.com`
  };

  const message = timeOfDay === 'morning' ? messages.morning : messages.evening;
  
  return await sendSMS({
    to: phoneNumber,
    message: message
  });
}

export async function sendTestSMS(phoneNumber: string, userName: string): Promise<boolean> {
  const message = `📱 Test SMS from InsideMeter! Hi ${userName}, SMS notifications are working. You'll receive mood reminders at 12 PM and 8 PM daily.`;
  
  return await sendSMS({
    to: phoneNumber,
    message: message
  });
}

export async function sendPhoneVerificationSMS(phoneNumber: string, verificationCode: string): Promise<boolean> {
  const message = `Your InsideMeter verification code is: ${verificationCode}. This code expires in 10 minutes. Do not share this code with anyone.`;
  
  return await sendSMS({
    to: phoneNumber,
    message: message
  });
}