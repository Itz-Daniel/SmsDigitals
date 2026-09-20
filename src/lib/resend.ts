import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SmsDigitals Team <onboarding@resend.dev>';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smsdigital.fun').replace(/\/$/, '');

export async function sendWelcomeEmail(userEmail: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: 'Welcome to SmsDigitals! 🚀',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0070F3; margin: 0; font-size: 24px; font-weight: 800;">SmsDigitals</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your premium gateway to virtual numbers</p>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Welcome aboard! 🎉</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569;">
              We're thrilled to have you join SmsDigitals. You now have instant access to thousands of virtual numbers for WhatsApp, Telegram, Google, and more across 44+ countries.
            </p>
            
            <p style="font-size: 15px; line-height: 1.6; color: #475569; font-weight: 600; margin-top: 16px;">
              Getting Started is Easy:
            </p>
            <ol style="font-size: 14px; line-height: 1.8; color: #475569; padding-left: 20px;">
              <li>Fund your wallet via Card, Bank Transfer, or Crypto</li>
              <li>Select your desired country and service</li>
              <li>Instantly receive your number and SMS code!</li>
            </ol>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="${SITE_URL}/dashboard/fund" style="background-color: #0070F3; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                Fund Your Wallet Now
              </a>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 6px;">Need help? Reply directly to this email or visit our <a href="${SITE_URL}/dashboard/support" style="color: #0070F3;">Help Desk</a>.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} SmsDigitals. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error (sendWelcomeEmail):', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error };
  }
}

export async function sendDepositConfirmationEmail({
  userEmail,
  amount,
  currency,
  reference,
  gateway = "Online Payment",
}: {
  userEmail: string;
  amount: number;
  currency: string;
  reference: string;
  gateway?: string;
}) {
  try {
    const formattedAmount = currency.toUpperCase() === 'NGN' 
      ? `₦${amount.toLocaleString()}` 
      : `$${amount.toFixed(2)} USD`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Deposit Confirmed: ${formattedAmount} added to your wallet! 💳`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0070F3; margin: 0; font-size: 24px; font-weight: 800;">SmsDigitals</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Instant Virtual Numbers & Verification</p>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 12px;">
              <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                Deposit Successful
              </span>
            </div>
            
            <h2 style="margin: 0; color: #0f172a; text-align: center; font-size: 28px; font-weight: 800;">
              +${formattedAmount}
            </h2>
            <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 6px; margin-bottom: 20px;">
              Successfully credited to your wallet balance
            </p>
            
            <div style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; font-size: 13px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Reference</td>
                  <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">${reference}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Payment Method</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a; border-top: 1px solid #f1f5f9;">${gateway}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Date</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a; border-top: 1px solid #f1f5f9;">${new Date().toUTCString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="${SITE_URL}/dashboard" style="background-color: #0070F3; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                Go to Dashboard & Rent Numbers
              </a>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 6px;">Questions regarding your deposit? Reach our team at <a href="${SITE_URL}/dashboard/support" style="color: #0070F3;">Help Desk</a>.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} SmsDigitals. All rights reserved.</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error("Deposit confirmation email error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error("Failed to send deposit confirmation email:", err);
    return { success: false, error: err };
  }
}

export async function sendLoginAlertEmail({
  userEmail,
  ipAddress,
  userAgent,
}: {
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const now = new Date().toUTCString();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Security Alert: New Sign-in to your SmsDigitals account 🔐`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0070F3; margin: 0; font-size: 24px; font-weight: 800;">SmsDigitals</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Security & Account Notification</p>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 18px; font-weight: 700;">
              New Sign-in Detected
            </h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
              We detected a recent sign-in to your SmsDigitals account (<strong>${userEmail}</strong>).
            </p>
            
            <div style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px; font-size: 13px; color: #334155;">
              <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${now}</p>
              ${ipAddress ? `<p style="margin: 4px 0;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
              ${userAgent ? `<p style="margin: 4px 0;"><strong>Device / Browser:</strong> ${userAgent}</p>` : ''}
            </div>
            
            <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-top: 16px;">
              If this was you, you can safely disregard this email. If you did not sign in, please reset your password immediately to protect your wallet balance.
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${SITE_URL}/forgot" style="background-color: #ef4444; color: white; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
                Reset Password
              </a>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} SmsDigitals. All rights reserved.</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error("Login alert email error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error("Failed to send login alert email:", err);
    return { success: false, error: err };
  }
}

export async function sendTicketReplyEmail(userEmail: string, ticketSubject: string, replyText: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'SmsDigitals Support <onboarding@resend.dev>',
      to: [userEmail],
      subject: `Update on your ticket: ${ticketSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10B981; margin: 0;">SmsDigitals Support</h1>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <h2 style="margin-top: 0; color: #111;">Your ticket has been updated</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #444;">
              An admin has replied to your support ticket <strong>"${ticketSubject}"</strong>.
            </p>
            
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-top: 20px;">
              <p style="font-size: 15px; line-height: 1.6; color: #111; margin: 0; white-space: pre-wrap;">${replyText}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${SITE_URL}/dashboard/support" style="background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Ticket in Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 12px;">
            <p>If you have any more questions, please open a new ticket.</p>
            <p>&copy; ${new Date().getFullYear()} SmsDigitals. All rights reserved.</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error("Resend API Error:", error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error("Failed to send ticket reply email:", error);
    return { error };
  }
}

export async function sendTicketCreatedEmail(userEmail: string, ticketSubject: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Support Ticket Received: ${ticketSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #0070F3;">SmsDigitals Support</h1>
          <p>Hi there,</p>
          <p>We've received your support ticket regarding <strong>"${ticketSubject}"</strong>.</p>
          <p>Our team will review it and get back to you as soon as possible. You can track the status of your ticket or add more details from your dashboard.</p>
          <a href="${SITE_URL}/dashboard/support" style="background-color: #0070F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Ticket</a>
        </div>
      `
    });
    if (error) console.error("Resend API Error:", error);
    return { data, error };
  } catch (error) {
    console.error("Failed to send ticket created email:", error);
    return { error };
  }
}

export async function sendAdminNotificationEmail(ticketSubject: string, isReply: boolean = false) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { error: "No admin email configured" };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [adminEmail],
      subject: `[ACTION REQUIRED] ${isReply ? 'New Reply on Ticket' : 'New Ticket Created'}: ${ticketSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #EF4444;">Admin Alert</h1>
          <p>A user has ${isReply ? 'replied to' : 'created'} a support ticket: <strong>"${ticketSubject}"</strong>.</p>
          <p>Please log in to the admin dashboard to review and resolve the issue.</p>
          <a href="${SITE_URL}/dashboard/management/support" style="background-color: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Go to Admin Panel</a>
        </div>
      `
    });
    if (error) console.error("Resend API Error:", error);
    return { data, error };
  } catch (error) {
    console.error("Failed to send admin notification email:", error);
    return { error };
  }
}
