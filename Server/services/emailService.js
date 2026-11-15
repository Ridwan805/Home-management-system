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

/**
 * Send official tenant notice email via Resend
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.tenantName - Recipient tenant name
 * @param {string} options.noticeType - Type of notice (rent_reminder, overdue_payment, etc.)
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Body text
 * @param {string} [options.priority] - Priority (low, normal, high, urgent)
 * @param {Date|string} [options.dueDate] - Scheduled or due date
 * @param {string} [options.propertyTitle] - Property name
 * @param {string} [options.unitNumber] - Unit / apartment number
 * @param {string} [options.ownerName] - Property owner name
 */
async function sendTenantNoticeEmail({
  to,
  tenantName = 'Tenant',
  noticeType = 'general',
  subject,
  message,
  priority = 'normal',
  dueDate = null,
  propertyTitle = 'Your Residence',
  unitNumber = '',
  ownerName = 'Property Management'
}) {
  const apiKey = getApiKey();
  const from = getFromEmail();

  if (!apiKey) {
    console.warn('⚠️ Resend API key missing in environment, skipping email delivery.');
    return { success: false, error: 'Resend API key not configured' };
  }

  const priorityColors = {
    urgent: { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', label: 'URGENT NOTICE' },
    high: { bg: '#FFF7ED', border: '#EA580C', text: '#9A3412', label: 'HIGH PRIORITY' },
    normal: { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF', label: 'OFFICIAL NOTICE' },
    low: { bg: '#F8FAFC', border: '#64748B', text: '#334155', label: 'INFORMATIONAL' }
  };

  const priorityStyle = priorityColors[priority] || priorityColors.normal;

  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : null;

  const escapedMessage = (message || '').replace(/\n/g, '<br/>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; }
        .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .logo-accent { color: #2563eb; }
        .content { padding: 32px 28px; }
        .priority-badge { display: inline-block; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: ${priorityStyle.bg}; border: 1px solid ${priorityStyle.border}; color: ${priorityStyle.text}; margin-bottom: 16px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .property-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #475569; }
        .property-info strong { color: #0f172a; }
        .body-card { background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid ${priorityStyle.border}; border-radius: 8px; padding: 18px 20px; font-size: 14.5px; line-height: 1.6; color: #334155; margin-bottom: 22px; }
        .due-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13.5px; color: #854d0e; }
        .signature { font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Dwell<span class="logo-accent">Sync</span></h1>
        </div>
        <div class="content">
          <div class="priority-badge">${priorityStyle.label}</div>
          <h2 class="title">${subject}</h2>
          
          <div class="property-info">
            <strong>Property:</strong> ${propertyTitle} ${unitNumber ? `(Unit ${unitNumber})` : ''} &bull; 
            <strong>Recipient:</strong> ${tenantName}
          </div>

          <div class="body-card">
            ${escapedMessage}
          </div>

          ${formattedDueDate ? `
            <div class="due-box">
              📅 <strong>Relevant Date / Deadline:</strong> ${formattedDueDate}
            </div>
          ` : ''}

          <div class="signature">
            Issued by: <strong>${ownerName}</strong> via DwellSync Property Management Portal
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} DwellSync Home Management System. This is an official property notification.
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
        subject: `[DwellSync Notice] ${subject}`,
        html: htmlContent
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn('⚠️ Resend API error sending notice:', data);
      return {
        success: false,
        error: data.message || 'Failed to dispatch email via Resend',
        code: data.name
      };
    }

    console.log(`✅ Tenant notice sent to ${to} via Resend. Email ID: ${data.id}`);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error('❌ Error sending tenant notice via Resend:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendTenantNoticeEmail
};
