/**
 * Email Service using Resend API
 */
const RESEND_API_URL = 'https://api.resend.com/emails';

const getApiKey = () => process.env.RESEND_API_KEY || '';
const getFromEmail = () => process.env.RESEND_FROM_EMAIL || 'DwellSync <onboarding@resend.dev>';

/**
 * Send password reset email with 6-digit verification code
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.resetCode - 6-digit OTP code
 * @param {string} [options.userName] - Recipient name
 */
async function sendPasswordResetEmail({ to, resetCode, userName = 'User' }) {
  const apiKey = getApiKey();
  const from = getFromEmail();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DwellSync - Password Reset Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; }
        .logo-text { color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .logo-accent { color: #006aff; }
        .content { padding: 36px 32px; }
        .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .lead { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .code-box { background: #f1f5f9; border: 2px dashed #006aff; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
        .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #64748b; margin-bottom: 8px; }
        .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #006aff; font-family: 'Courier New', monospace; margin: 0; }
        .expiry-note { font-size: 13px; color: #94a3b8; text-align: center; margin-top: 8px; }
        .warning { font-size: 13px; color: #64748b; background: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-top: 24px; line-height: 1.5; }
        .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Dwell<span class="logo-accent">Sync</span></h1>
        </div>
        <div class="content">
          <h2 class="greeting">Hello, ${userName}</h2>
          <p class="lead">We received a request to reset your password for your DwellSync account. Use the verification code below to complete your password reset:</p>
          
          <div class="code-box">
            <div class="code-label">Password Reset Code</div>
            <div class="code">${resetCode}</div>
          </div>
          <div class="expiry-note">⏱️ This code will expire in 15 minutes.</div>

          <div class="warning">
            If you did not request a password reset, please ignore this email or make sure your account is secure.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} DwellSync Home Management System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        subject: `DwellSync - Your Password Reset Code is ${resetCode}`,
        html: htmlContent
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn('⚠️ Resend API warning/error:', data);
      // If free tier testing restriction (only sending to registered email), provide clear dev note
      return {
        success: false,
        error: data.message || 'Failed to dispatch email via Resend',
        code: data.name,
        resendData: data
      };
    }

    console.log(`✅ Password reset email sent to ${to} via Resend. Email ID: ${data.id}`);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail
};
