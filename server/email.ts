import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const emailData: any = {
      to: params.to,
      from: params.fromName ? { email: params.from, name: params.fromName } : params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await mailService.send(emailData);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error.message);
    console.error('SendGrid error code:', error.code);
    if (error.response) {
      console.error('SendGrid response status:', error.response.status);
      console.error('SendGrid response body:', JSON.stringify(error.response.body, null, 2));
    }
    return false;
  }
}

export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
  const welcomeHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to LunarMood: Your InsiderMeter</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #e2e8f0; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #4338ca, #7c3aed); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; line-height: 1.6; }
        .moon-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        .main-text { font-size: 16px; color: #cbd5e1; margin: 20px 0; }
        .highlight { color: #e0e7ff; font-weight: 500; }
        .sparkle { color: #fbbf24; text-align: center; font-size: 24px; margin: 15px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #1e293b; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LunarMood: Your InsiderMeter</h1>
          <p style="margin: 10px 0 0 0; color: #e0e7ff;">Welcome to Your Journey</p>
        </div>
        <div class="content">
          <div class="moon-icon">🌙</div>
          <div class="main-text">
            <p><strong>Thank you for joining LunarMood: Your InsiderMeter—we're so glad you're here.</strong></p>
            
            <p>Each day brings a new phase of the moon—and a new opportunity to pause, reflect, and reconnect with yourself. By taking just a moment to log your mood daily, you begin to notice subtle patterns that often go unseen. These patterns can reveal more than just how you feel—they show who you are becoming.</p>
            
            <p>We encourage you to keep notifications on as gentle reminders to check in with yourself. It's not about tracking for the sake of data—it's about building a rhythm of awareness that supports clarity, balance, and growth.</p>
            
            <div class="sparkle">✨</div>
            <p class="highlight">When you begin to recognize your own inner cycles, you gain the power to move with them more gracefully—or even shift them consciously.</p>
            
            <p>This is your space. Return to it daily. You might be surprised by what unfolds.</p>
            
            <div style="text-align: center;">
              <a href="https://insidemeter.com" class="cta-button">Begin Your Journey</a>
            </div>
          </div>
        </div>
        <div class="footer">
          <p><strong>Warmly,</strong></p>
          <p>The LunarMood Team</p>
          <p>A YogaNebula Initiative</p>
          <p><a href="https://insidemeter.com" style="color: #8b5cf6;">insidemeter.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const welcomeText = `
Thank you for joining LunarMood: Your InsiderMeter—we're so glad you're here.

Each day brings a new phase of the moon—and a new opportunity to pause, reflect, and reconnect with yourself. By taking just a moment to log your mood daily, you begin to notice subtle patterns that often go unseen. These patterns can reveal more than just how you feel—they show who you are becoming.

We encourage you to keep notifications on as gentle reminders to check in with yourself. It's not about tracking for the sake of data—it's about building a rhythm of awareness that supports clarity, balance, and growth.

✨ When you begin to recognize your own inner cycles, you gain the power to move with them more gracefully—or even shift them consciously.

This is your space. Return to it daily. You might be surprised by what unfolds.

Visit: https://insidemeter.com

Warmly,
The LunarMood Team
A YogaNebula Initiative
insidemeter.com
  `;

  // Using verified SendGrid sender email
  const senderEmail = process.env.VERIFIED_SENDER_EMAIL || 'contact@yoganebula.com';
  
  return await sendEmail({
    to: userEmail,
    from: `Samir Lal <${senderEmail}>`,
    subject: 'Welcome to LunarMood: Your InsiderMeter',
    text: welcomeText,
    html: welcomeHtml
  });
}

export async function sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .cta { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>We received a request to reset your password for your LunarMood account (username: <strong>${userName}</strong>). If you made this request, click the button below to create a new password:</p>
          
          <a href="${resetLink}" class="cta">Reset Your Password</a>
          
          <div class="warning">
            <strong>⚠️ Important Security Information:</strong>
            <ul>
              <li>This link will expire in 1 hour for your security</li>
              <li>If you didn't request this reset, you can safely ignore this email</li>
              <li>Never share this link with anyone else</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">${resetLink}</p>
          
          <p>If you didn't request this password reset, please contact us immediately.</p>
          
          <p>Stay secure,<br>
          Samir Lal<br>
          <em>YogaNebula & InsideMeter</em></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: userEmail,
    from: "Samir Lal <contact@yoganebula.com>",
    subject: `Reset Password for ${userName} - LunarMood`,
    html: htmlContent,
    text: `Hello ${userName}, we received a request to reset your password for your LunarMood account (username: ${userName}). Click this link to reset your password: ${resetLink} This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.`
  });
}

export async function sendProSubscriptionThankYouEmail(userEmail: string, userName: string): Promise<boolean> {
  const thankYouHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for joining InsideMeter PRO</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #e2e8f0; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .pro-badge { text-align: center; font-size: 48px; margin: 20px 0; }
        .feature-list { background-color: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
        .feature-item { margin: 10px 0; display: flex; align-items: center; }
        .feature-icon { margin-right: 10px; font-size: 18px; }
        .footer { background-color: #1e293b; padding: 20px; text-align: center; font-size: 14px; color: #94a3b8; }
        .signature { margin: 30px 0; padding: 20px 0; border-top: 1px solid #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Welcome to InsideMeter PRO</h1>
        </div>
        <div class="content">
          <div class="pro-badge">💜</div>
          <h2>Hi ${userName},</h2>
          
          <p><strong>Thank you for joining InsideMeter PRO.</strong></p>
          
          <p>This isn't just a subscription — it's a powerful step toward understanding yourself more deeply and consciously creating change.</p>
          
          <p>Every mood you log, every moment you reflect, brings you closer to a clearer version of yourself. The patterns you'll begin to see aren't fixed — they're clues. And with awareness comes the ability to shift, gently and meaningfully.</p>
          
          <div class="feature-list">
            <h3 style="margin-top: 0; color: #a855f7;">With PRO, you now have access to:</h3>
            <div class="feature-item">
              <span class="feature-icon">📈</span>
              <span><strong>Your Mood Meter</strong> — a mirror of your emotional landscape</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🏃</span>
              <span><strong>Activity insights</strong> — what lifts or lowers your state</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🧠</span>
              <span><strong>Guided reflections</strong> — small prompts, big shifts</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔔</span>
              <span><strong>Custom reminders</strong> — on your time, at your pace</span>
            </div>
          </div>
          
          <p>You have the tools. You have the data.</p>
          <p><strong>But more than anything — you have the power to change.</strong></p>
          
          <p>And you're not alone. InsideMeter is your private space to return to, whenever you need to check in, reset, or rise.</p>
          
          <p>We're honored to walk this path with you. One mood at a time.</p>
          
          <div class="signature">
            <p>With warmth,<br>
            <strong>The InsideMeter Team</strong><br>
            <em>A YogaNebula Initiative</em><br>
            <a href="https://insidemeter.com" style="color: #a855f7; text-decoration: none;">insidemeter.com</a></p>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 YogaNebula | Your journey to deeper self-awareness starts now</p>
          <p>This email was sent to ${userEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const thankYouText = `Thank you for joining InsideMeter PRO.

This isn't just a subscription — it's a powerful step toward understanding yourself more deeply and consciously creating change.

Every mood you log, every moment you reflect, brings you closer to a clearer version of yourself. The patterns you'll begin to see aren't fixed — they're clues. And with awareness comes the ability to shift, gently and meaningfully.

With PRO, you now have access to:
📈 Your Mood Meter — a mirror of your emotional landscape
🏃 Activity insights — what lifts or lowers your state
🧠 Guided reflections — small prompts, big shifts
🔔 Custom reminders — on your time, at your pace

You have the tools. You have the data.
But more than anything — you have the power to change.

And you're not alone. InsideMeter is your private space to return to, whenever you need to check in, reset, or rise.

We're honored to walk this path with you. One mood at a time.

With warmth,
The InsideMeter Team
A YogaNebula Initiative
insidemeter.com`;

  return await sendEmail({
    to: userEmail,
    from: 'Samir Lal <contact@yoganebula.com>',
    subject: 'Thank you for joining InsideMeter PRO',
    html: thankYouHtml,
    text: thankYouText
  });
}

export async function sendProUpgradeEmail(userEmail: string, userName: string): Promise<boolean> {
  const upgradeHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to InsideMeter PRO - Complimentary Access</title>
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
          background: linear-gradient(135deg, #8b5cf6, #a855f7); 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 { 
          color: white; 
          margin: 0; 
          font-size: 28px; 
          font-weight: 700; 
        }
        .content { 
          padding: 40px 30px; 
          background: white;
        }
        .star-icon { 
          text-align: center; 
          font-size: 48px; 
          margin: 20px 0; 
        }
        .feature-list { 
          background-color: #f8fafc; 
          padding: 25px; 
          border-radius: 8px; 
          margin: 25px 0; 
          border-left: 4px solid #8b5cf6; 
        }
        .feature-item { 
          margin: 12px 0; 
          display: flex; 
          align-items: center; 
          font-size: 16px;
        }
        .feature-icon { 
          margin-right: 12px; 
          font-size: 18px; 
          width: 24px;
        }
        .cta-button { 
          display: inline-block; 
          padding: 15px 30px; 
          background: linear-gradient(135deg, #8b5cf6, #a855f7); 
          color: white; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          margin: 20px 0; 
        }
        .footer { 
          background-color: #f1f5f9; 
          padding: 20px; 
          text-align: center; 
          font-size: 14px; 
          color: #64748b; 
        }
        .signature { 
          margin: 30px 0; 
          padding: 20px 0; 
          border-top: 1px solid #e2e8f0; 
        }
        .highlight { 
          color: #8b5cf6; 
          font-weight: 600; 
        }
        p { 
          color: #374151; 
          margin: 16px 0; 
        }
        h2 { 
          color: #1e293b; 
          margin: 0 0 20px 0; 
        }
        h3 { 
          color: #8b5cf6; 
          margin: 0 0 15px 0; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Welcome to InsideMeter PRO</h1>
        </div>
        <div class="content">
          <div class="star-icon">⭐</div>
          <h2>Hi ${userName},</h2>
          
          <p><strong>We've just unlocked InsideMeter PRO for you — completely free.</strong></p>
          
          <p>Why? Because we believe in the power of reflection, and we'd love for you to experience everything InsideMeter can offer:</p>
          
          <div class="feature-list">
            <h3>Your PRO Features Include:</h3>
            <div class="feature-item">
              <span class="feature-icon">📈</span>
              <span>Your personal Mood Meter dashboard</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🧠</span>
              <span>Guided insights into your emotional patterns</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🏃</span>
              <span>Activity impact tracking</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔔</span>
              <span>Custom mood reminders</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🌙</span>
              <span>Lunar-aligned emotional forecasts</span>
            </div>
          </div>
          
          <p>This is your invitation to go deeper. To observe. To shift.</p>
          
          <p>To see how your mood, habits, and energy move — and how you can move with them.</p>
          
          <p>As you explore, we'd love to hear your thoughts. Your feedback will help shape InsideMeter into an even more supportive space for self-awareness.</p>
          
          <p><strong>Enjoy the journey — and thank you for being part of ours.</strong></p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://insidemeter.com" class="cta-button">Explore PRO Features</a>
          </div>
          
          <div class="signature">
            <p>Warmly,<br>
            <strong>The InsideMeter Team</strong><br>
            <em>A YogaNebula Initiative</em><br>
            <a href="https://insidemeter.com" style="color: #8b5cf6;">insidemeter.com</a></p>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 YogaNebula | Your journey to self-awareness begins now</p>
          <p>This email was sent to ${userEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const upgradeText = `We've just unlocked InsideMeter PRO for you — completely free.

Why? Because we believe in the power of reflection, and we'd love for you to experience everything InsideMeter can offer:

📈 Your personal Mood Meter dashboard
🧠 Guided insights into your emotional patterns  
🏃 Activity impact tracking
🔔 Custom mood reminders
🌙 Lunar-aligned emotional forecasts

This is your invitation to go deeper. To observe. To shift.

To see how your mood, habits, and energy move — and how you can move with them.

As you explore, we'd love to hear your thoughts. Your feedback will help shape InsideMeter into an even more supportive space for self-awareness.

Enjoy the journey — and thank you for being part of ours.

Explore PRO Features: https://insidemeter.com

Warmly,
The InsideMeter Team
A YogaNebula Initiative
insidemeter.com`;

  return await sendEmail({
    to: userEmail,
    from: 'Samir Lal <contact@yoganebula.com>',
    subject: 'Welcome to InsideMeter PRO - Complimentary Access',
    html: upgradeHtml,
    text: upgradeText
  });
}

export async function sendSubscriptionCancellationEmail(userEmail: string, userName: string): Promise<boolean> {
  const cancellationHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We understand - InsideMeter</title>
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
          background: linear-gradient(135deg, #8b5cf6, #a855f7); 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 { 
          color: white; 
          margin: 0; 
          font-size: 28px; 
          font-weight: 700; 
        }
        .content { 
          padding: 40px 30px; 
          background: white;
        }
        .heart-icon { 
          text-align: center; 
          font-size: 48px; 
          margin: 20px 0; 
        }
        .cta-button { 
          display: inline-block; 
          padding: 15px 30px; 
          background: linear-gradient(135deg, #8b5cf6, #a855f7); 
          color: white; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          margin: 20px 0; 
        }
        .footer { 
          background-color: #f1f5f9; 
          padding: 20px; 
          text-align: center; 
          font-size: 14px; 
          color: #64748b; 
        }
        .signature { 
          margin: 30px 0; 
          padding: 20px 0; 
          border-top: 1px solid #e2e8f0; 
        }
        .highlight { 
          color: #8b5cf6; 
          font-weight: 600; 
        }
        p { 
          color: #374151; 
          margin: 16px 0; 
        }
        h2 { 
          color: #1e293b; 
          margin: 0 0 20px 0; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤍 We understand</h1>
        </div>
        <div class="content">
          <div class="heart-icon">🌙</div>
          <h2>Hi ${userName},</h2>
          
          <p>We noticed you've stepped away from InsideMeter PRO — and that's absolutely okay.</p>
          
          <p>Life has its own rhythm, and sometimes, pressing pause is part of the process. What matters is that you've already taken a powerful step: choosing self-awareness. And that doesn't go away with a subscription.</p>
          
          <p><strong>Remember, the patterns you've uncovered still live within you — and so does the power to shift them.</strong></p>
          
          <p>You can continue logging your mood, journaling, and reflecting anytime. And when you're ready to explore deeper insights again — the Mood Meter, activity tracking, and emotional forecasts will be right here, waiting for you.</p>
          
          <p>Because transformation isn't about being perfect.</p>
          <p><strong>It's about returning — gently, consistently, honestly.</strong></p>
          
          <p>Whenever you feel called to continue, we'll be here.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://insidemeter.com/subscription" class="cta-button">Rejoin PRO</a>
          </div>
          
          <div class="signature">
            <p>With gratitude and encouragement,<br>
            <strong>The InsideMeter Team</strong><br>
            <em>A YogaNebula Initiative</em></p>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 YogaNebula | Your journey continues, with or without PRO</p>
          <p>This email was sent to ${userEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const cancellationText = `We noticed you've stepped away from InsideMeter PRO — and that's absolutely okay.

Life has its own rhythm, and sometimes, pressing pause is part of the process. What matters is that you've already taken a powerful step: choosing self-awareness. And that doesn't go away with a subscription.

Remember, the patterns you've uncovered still live within you — and so does the power to shift them.

You can continue logging your mood, journaling, and reflecting anytime. And when you're ready to explore deeper insights again — the Mood Meter, activity tracking, and emotional forecasts will be right here, waiting for you.

Because transformation isn't about being perfect.
It's about returning — gently, consistently, honestly.

Whenever you feel called to continue, we'll be here.

Rejoin PRO: https://insidemeter.com/subscription

With gratitude and encouragement,
The InsideMeter Team
A YogaNebula Initiative`;

  return await sendEmail({
    to: userEmail,
    from: 'Samir Lal <contact@yoganebula.com>',
    subject: 'We understand - Your journey continues',
    html: cancellationHtml,
    text: cancellationText
  });
}