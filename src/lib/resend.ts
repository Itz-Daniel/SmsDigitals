import { Resend } from 'resend';

// The API Key will be picked up automatically from process.env.RESEND_API_KEY
// But we pass it explicitly to be safe
export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(userEmail: string) {
  try {
    const { data, error } = await resend.emails.send({
      // "SmsDigitals Team <onboarding@resend.dev>"
      // Since you don't own a domain yet, Resend forces you to use their testing domain 'onboarding@resend.dev'
      // BUT it will only send to the email address you signed up to Resend with!
      // When you buy a domain, change this to "SmsDigitals Team <hello@smsdigitals.com>"
      from: 'SmsDigitals Team <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Welcome to SmsDigitals! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0070F3; margin: 0;">SmsDigitals</h1>
            <p style="color: #666; font-size: 16px; margin-top: 5px;">Your premium gateway to virtual numbers</p>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <h2 style="margin-top: 0; color: #111;">Welcome aboard! 🎉</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #444;">
              We're thrilled to have you join SmsDigitals. You now have access to thousands of virtual numbers for WhatsApp, Telegram, and more across the globe.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #444;">
              <strong>Getting Started is Easy:</strong>
            </p>
            <ol style="font-size: 16px; line-height: 1.6; color: #444;">
              <li>Fund your wallet via our secure Paystack gateway</li>
              <li>Select your desired country and service</li>
              <li>Instantly receive your number and SMS code!</li>
            </ol>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://smsdigitals.com/dashboard/fund" style="background-color: #0070F3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Fund Your Wallet Now
              </a>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 14px; color: #888;">
            <p>Need help? Reply to this email and our team will get back to you.</p>
            <p>&copy; ${new Date().getFullYear()} SmsDigitals. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { error };
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
              <a href="https://smsdigitals.com/dashboard/support" style="background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
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
      from: 'SmsDigitals Team <onboarding@resend.dev>',
      to: [userEmail],
      subject: `Support Ticket Received: ${ticketSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #0070F3;">SmsDigitals Support</h1>
          <p>Hi there,</p>
          <p>We've received your support ticket regarding <strong>"${ticketSubject}"</strong>.</p>
          <p>Our team will review it and get back to you as soon as possible. You can track the status of your ticket or add more details from your dashboard.</p>
          <a href="https://smsdigitals.com/dashboard/support" style="background-color: #0070F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Ticket</a>
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
      from: 'SmsDigitals System <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `[ACTION REQUIRED] ${isReply ? 'New Reply on Ticket' : 'New Ticket Created'}: ${ticketSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #EF4444;">Admin Alert</h1>
          <p>A user has ${isReply ? 'replied to' : 'created'} a support ticket: <strong>"${ticketSubject}"</strong>.</p>
          <p>Please log in to the admin dashboard to review and resolve the issue.</p>
          <a href="https://smsdigitals.com/dashboard/management/support" style="background-color: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Go to Admin Panel</a>
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
