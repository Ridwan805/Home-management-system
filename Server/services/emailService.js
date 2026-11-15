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
              <strong>Relevant Date / Deadline:</strong> ${formattedDueDate}
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

/**
 * Send invoice issued notification email via Resend
 */
async function sendInvoiceIssuedEmail({
  to,
  recipientName = 'Tenant',
  invoiceNumber,
  amount,
  currency = 'BDT',
  dueDate,
  propertyTitle = 'Residential Property',
  paymentPurpose = 'Monthly Rent',
  payUrl = null
}) {
  const apiKey = getApiKey();
  const from = getFromEmail();

  if (!apiKey) {
    console.warn('⚠️ Resend API key missing in environment, skipping invoice email delivery.');
    return { success: false, error: 'Resend API key not configured' };
  }

  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'Due on receipt';

  const formattedAmount = `${currency === 'BDT' ? 'BDT ' : '$'}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DwellSync Invoice #${invoiceNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; padding: 24px; text-align: center; }
        .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; }
        .logo-accent { color: #2563eb; }
        .content { padding: 32px 28px; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
        .invoice-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .label { color: #64748b; }
        .value { font-weight: 600; color: #0f172a; }
        .total-row { border-top: 1px solid #cbd5e1; margin-top: 10px; padding-top: 10px; font-size: 16px; font-weight: 700; }
        .total-val { color: #2563eb; }
        .btn-box { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff; font-weight: 600; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; }
        .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Dwell<span class="logo-accent">Sync</span></h1>
        </div>
        <div class="content">
          <h2 class="title">New Invoice Issued: #${invoiceNumber}</h2>
          <p>Hello ${recipientName}, a new invoice has been generated for your property obligation.</p>
          
          <div class="invoice-card">
            <div class="row"><span class="label">Invoice Number:</span><span class="value">#${invoiceNumber}</span></div>
            <div class="row"><span class="label">Property:</span><span class="value">${propertyTitle}</span></div>
            <div class="row"><span class="label">Purpose:</span><span class="value">${paymentPurpose.replace(/_/g, ' ')}</span></div>
            <div class="row"><span class="label">Due Date:</span><span class="value">${formattedDueDate}</span></div>
            <div class="row total-row"><span class="label">Total Amount:</span><span class="total-val">${formattedAmount}</span></div>
          </div>

          ${payUrl ? `
            <div class="btn-box">
              <a href="${payUrl}" class="btn">View & Pay Invoice in Portal</a>
            </div>
          ` : ''}

          <p style="font-size: 13px; color: #64748b;">
            Please complete payment via Stripe Checkout in your DwellSync portal. After verification, an official receipt will be generated.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} DwellSync Home Management Platform. All rights reserved.
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
        subject: `[DwellSync Invoice] #${invoiceNumber} - ${propertyTitle}`,
        html: htmlContent
      })
    });
    const data = await res.json();
    return { success: res.ok, emailId: data.id };
  } catch (err) {
    console.error('❌ Error sending invoice email via Resend:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send payment receipt confirmation email via Resend
 */
async function sendPaymentReceiptEmail({
  to,
  recipientName = 'Tenant',
  receiptNumber,
  invoiceNumber,
  amount,
  currency = 'BDT',
  paidDate,
  propertyTitle = 'Residential Property',
  paymentMethod = 'Stripe Card',
  transactionId = ''
}) {
  const apiKey = getApiKey();
  const from = getFromEmail();

  if (!apiKey) {
    console.warn('⚠️ Resend API key missing in environment, skipping receipt email delivery.');
    return { success: false, error: 'Resend API key not configured' };
  }

  const formattedPaidDate = paidDate ? new Date(paidDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'Confirmed';

  const formattedAmount = `${currency === 'BDT' ? 'BDT ' : '$'}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt #${receiptNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; padding: 24px; text-align: center; }
        .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; }
        .logo-accent { color: #2563eb; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; margin-bottom: 12px; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .label { color: #64748b; }
        .value { font-weight: 600; color: #0f172a; }
        .total-row { border-top: 1px solid #cbd5e1; margin-top: 10px; padding-top: 10px; font-size: 16px; font-weight: 700; }
        .total-val { color: #059669; }
        .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Dwell<span class="logo-accent">Sync</span></h1>
        </div>
        <div class="content">
          <div class="badge">Payment Verified</div>
          <h2 class="title">Official Payment Receipt: #${receiptNumber}</h2>
          <p>Thank you, ${recipientName}. Your payment has been successfully confirmed and credited.</p>
          
          <div class="card">
            <div class="row"><span class="label">Receipt Number:</span><span class="value">#${receiptNumber}</span></div>
            ${invoiceNumber ? `<div class="row"><span class="label">Invoice Ref:</span><span class="value">#${invoiceNumber}</span></div>` : ''}
            <div class="row"><span class="label">Property:</span><span class="value">${propertyTitle}</span></div>
            <div class="row"><span class="label">Payment Date:</span><span class="value">${formattedPaidDate}</span></div>
            <div class="row"><span class="label">Payment Method:</span><span class="value">${paymentMethod}</span></div>
            ${transactionId ? `<div class="row"><span class="label">Transaction Ref:</span><span class="value font-mono">${transactionId}</span></div>` : ''}
            <div class="row total-row"><span class="label">Amount Paid:</span><span class="total-val">${formattedAmount}</span></div>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            You can view your complete payment history and download official PDF receipts anytime from your DwellSync portal.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} DwellSync Home Management Platform. All rights reserved.
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
        subject: `[DwellSync Receipt] #${receiptNumber} - Payment Confirmed`,
        html: htmlContent
      })
    });
    const data = await res.json();
    return { success: res.ok, emailId: data.id };
  } catch (err) {
    console.error('❌ Error sending receipt email via Resend:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send email notification when a new message is received in an application thread
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.recipientName - Name of the person receiving the email
 * @param {string} options.senderName - Name of the person who sent the message
 * @param {string} options.propertyTitle - Title or address of property
 * @param {string} options.messagePreview - Text preview of message
 * @param {string} options.conversationUrl - Direct link to open conversation
 */
async function sendMessageNotificationEmail({
  to,
  recipientName = 'Valued User',
  senderName = 'Property Contact',
  propertyTitle = 'Property Application',
  messagePreview = '',
  conversationUrl = ''
}) {
  const apiKey = getApiKey();
  const from = getFromEmail();

  if (!apiKey || !to) {
    return { success: false, reason: 'Resend API key or recipient email not configured' };
  }

  const safePreview = (messagePreview || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const actionUrl = conversationUrl || `${process.env.FRONTEND_URL || 'http://localhost:5174'}/tenant/request-info`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Message - ${propertyTitle}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; padding: 24px; text-align: center; }
        .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; }
        .logo-accent { color: #2563eb; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; margin-bottom: 12px; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
        .message-box { background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .meta-text { font-size: 13px; color: #64748b; margin-bottom: 24px; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; }
        .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Dwell<span class="logo-accent">Sync</span></h1>
        </div>
        <div class="content">
          <div class="badge">Application Communication</div>
          <h2 class="title">New Message Regarding ${propertyTitle}</h2>
          <p>Hello ${recipientName},</p>
          <p>You have received a new message from <strong>${senderName}</strong> regarding your property application:</p>
          
          <div class="message-box">
            "${safePreview}"
          </div>

          <p class="meta-text">
            To view the full message history and reply directly, open your DwellSync portal.
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${actionUrl}" class="btn">View Conversation & Reply</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} DwellSync Home Management Platform. All rights reserved.
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
        subject: `[DwellSync] New Message from ${senderName} regarding ${propertyTitle}`,
        html: htmlContent
      })
    });
    const data = await res.json();
    return { success: res.ok, emailId: data.id };
  } catch (err) {
    console.error('Error sending message notification email via Resend:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendTenantNoticeEmail,
  sendInvoiceIssuedEmail,
  sendPaymentReceiptEmail,
  sendMessageNotificationEmail
};
