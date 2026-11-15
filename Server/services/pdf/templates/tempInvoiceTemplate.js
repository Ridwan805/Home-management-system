/**
 * Temporary Modular PDF Template for DwellSync Invoices and Receipts
 * 
 * NOTE FOR FUTURE CUSTOM TEMPLATE:
 * This is a clean, temporary layout. To replace with your custom designed template:
 * 1. Implement renderInvoice(doc, data) and renderReceipt(doc, data) with your visual layout.
 * 2. All data fields are decoupled and passed via the standardized `data` object.
 */

function formatCurrency(amount, currency = 'BDT') {
  const num = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (currency === 'BDT') return `BDT ${num}`;
  if (currency === 'USD') return `$${num}`;
  return `${currency} ${num}`;
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Render an Invoice document
 * @param {PDFDocument} doc 
 * @param {Object} data 
 */
function renderInvoice(doc, data) {
  const primaryColor = '#0F172A'; // Navy
  const accentColor = '#2563EB';  // Blue
  const secondaryColor = '#64748B'; // Muted
  const borderColor = '#E2E8F0';

  // Header / Branding
  doc.fontSize(22).fillColor(primaryColor).text('Dwell', 50, 45, { continued: true });
  doc.fillColor(accentColor).text('Sync');
  doc.fontSize(9).fillColor(secondaryColor).text('Property & Tenancy Management System', 50, 72);

  // Document Title & Number (Right Aligned)
  doc.fontSize(16).fillColor(primaryColor).text('INVOICE', 350, 45, { align: 'right', width: 210 });
  doc.fontSize(10).fillColor(secondaryColor).text(`#${data.invoiceNumber || 'INV-0000'}`, 350, 68, { align: 'right', width: 210 });

  // Status Badge
  const status = (data.status || 'OPEN').toUpperCase();
  const statusColor = status === 'PAID' ? '#059669' : (status === 'OVERDUE' ? '#DC2626' : '#D97706');
  doc.fontSize(9).fillColor(statusColor).text(`Status: ${status}`, 350, 83, { align: 'right', width: 210 });

  // Divider
  doc.strokeColor(borderColor).lineWidth(1).moveTo(50, 105).lineTo(560, 105).stroke();

  // Invoice Meta Info Box (Issue date, Due date, Purpose)
  let y = 120;
  doc.fontSize(9).fillColor(secondaryColor).text('Issue Date:', 50, y);
  doc.fillColor(primaryColor).text(formatDate(data.issueDate), 110, y);

  doc.fillColor(secondaryColor).text('Due Date:', 220, y);
  doc.fillColor(primaryColor).text(formatDate(data.dueDate), 275, y);

  doc.fillColor(secondaryColor).text('Purpose:', 380, y);
  const purposeLabel = (data.paymentPurpose || 'CHARGE').replace(/_/g, ' ');
  doc.fillColor(primaryColor).text(purposeLabel, 430, y);

  // Bill To / Bill From Columns
  y = 150;
  doc.rect(50, y, 250, 85).fillAndStroke('#F8FAFC', borderColor);
  doc.rect(310, y, 250, 85).fillAndStroke('#F8FAFC', borderColor);

  // Bill To (Tenant/Payer)
  doc.fontSize(9).fillColor(secondaryColor).text('BILLED TO (TENANT / BUYER)', 60, y + 10);
  doc.fontSize(11).fillColor(primaryColor).text(data.payer?.name || 'Authorized Tenant', 60, y + 26);
  doc.fontSize(8.5).fillColor(secondaryColor);
  if (data.payer?.email) doc.text(data.payer.email, 60, y + 42);
  if (data.payer?.phone) doc.text(data.payer.phone, 60, y + 56);

  // Property & Payee Details
  doc.fontSize(9).fillColor(secondaryColor).text('PROPERTY & PAYEE', 320, y + 10);
  doc.fontSize(10).fillColor(primaryColor).text(data.property?.title || 'Residential Property', 320, y + 26, { width: 230 });
  doc.fontSize(8.5).fillColor(secondaryColor).text(data.property?.address || '', 320, y + 42, { width: 230 });
  if (data.payee?.name) {
    doc.text(`Owner / Manager: ${data.payee.name}`, 320, y + 66, { width: 230 });
  }

  // Line Items Table Header
  y = 255;
  doc.rect(50, y, 510, 24).fill(primaryColor);
  doc.fontSize(9).fillColor('#FFFFFF');
  doc.text('DESCRIPTION', 60, y + 7);
  doc.text('QTY', 360, y + 7, { width: 40, align: 'center' });
  doc.text('UNIT PRICE', 410, y + 7, { width: 65, align: 'right' });
  doc.text('AMOUNT', 485, y + 7, { width: 65, align: 'right' });

  // Line Items Rows
  y += 24;
  const items = (data.lineItems && data.lineItems.length > 0)
    ? data.lineItems
    : [{ description: purposeLabel, quantity: 1, unitPrice: data.total, amount: data.total }];

  items.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(50, y, 510, 24).fill(rowBg);
    doc.fontSize(9).fillColor(primaryColor);
    doc.text(item.description || 'Property Service Charge', 60, y + 7, { width: 290 });
    doc.text(String(item.quantity || 1), 360, y + 7, { width: 40, align: 'center' });
    doc.text(formatCurrency(item.unitPrice || item.amount, data.currency), 410, y + 7, { width: 65, align: 'right' });
    doc.text(formatCurrency(item.amount, data.currency), 485, y + 7, { width: 65, align: 'right' });
    y += 24;
  });

  // Table bottom border
  doc.strokeColor(borderColor).lineWidth(1).moveTo(50, y).lineTo(560, y).stroke();

  // Summary / Totals
  y += 15;
  const totalsX = 350;
  const valuesX = 475;

  doc.fontSize(9).fillColor(secondaryColor).text('Subtotal:', totalsX, y);
  doc.fillColor(primaryColor).text(formatCurrency(data.subtotal || data.total, data.currency), valuesX, y, { align: 'right', width: 75 });
  y += 18;

  if (data.tax && data.tax > 0) {
    doc.fillColor(secondaryColor).text('Tax:', totalsX, y);
    doc.fillColor(primaryColor).text(formatCurrency(data.tax, data.currency), valuesX, y, { align: 'right', width: 75 });
    y += 18;
  }

  if (data.fees && data.fees > 0) {
    doc.fillColor(secondaryColor).text('Fees:', totalsX, y);
    doc.fillColor(primaryColor).text(formatCurrency(data.fees, data.currency), valuesX, y, { align: 'right', width: 75 });
    y += 18;
  }

  // Highlight Box for Total
  doc.rect(totalsX - 10, y - 4, 220, 28).fill('#EFF6FF');
  doc.fontSize(10).fillColor(accentColor).text('Total Amount Due:', totalsX, y + 4);
  doc.fontSize(11).fillColor(accentColor).text(formatCurrency(data.total, data.currency), valuesX, y + 4, { align: 'right', width: 75 });
  y += 36;

  if (data.amountPaid && data.amountPaid > 0) {
    doc.fontSize(9).fillColor('#059669').text('Amount Paid:', totalsX, y);
    doc.text(formatCurrency(data.amountPaid, data.currency), valuesX, y, { align: 'right', width: 75 });
    y += 18;

    doc.fontSize(9).fillColor(primaryColor).text('Balance Remaining:', totalsX, y);
    doc.text(formatCurrency(data.balanceDue || 0, data.currency), valuesX, y, { align: 'right', width: 75 });
    y += 24;
  }

  // Payment Instructions / Notice Box
  y = Math.max(y + 10, 480);
  doc.rect(50, y, 510, 60).fillAndStroke('#F8FAFC', borderColor);
  doc.fontSize(9).fillColor(primaryColor).text('Payment Instructions & Terms', 60, y + 10);
  doc.fontSize(8).fillColor(secondaryColor).text(
    'Please complete payment via Stripe Checkout in your DwellSync Tenant Portal before the specified due date. ' +
    'Verified payments are automatically credited and recorded in your tenancy ledger with downloadable receipts.',
    60,
    y + 24,
    { width: 490, lineGap: 3 }
  );

  // Footer
  doc.fontSize(8).fillColor(secondaryColor).text(
    'DwellSync Home Management Platform  •  Secure Online Payments Powered by Stripe',
    50,
    730,
    { align: 'center', width: 510 }
  );
}

/**
 * Render a Payment Receipt document
 * @param {PDFDocument} doc 
 * @param {Object} data 
 */
function renderReceipt(doc, data) {
  const primaryColor = '#0F172A';
  const successColor = '#059669';
  const secondaryColor = '#64748B';
  const borderColor = '#E2E8F0';

  // Header / Branding
  doc.fontSize(22).fillColor(primaryColor).text('Dwell', 50, 45, { continued: true });
  doc.fillColor('#2563EB').text('Sync');
  doc.fontSize(9).fillColor(secondaryColor).text('Official Proof of Payment', 50, 72);

  // Document Title & Number
  doc.fontSize(16).fillColor(primaryColor).text('PAYMENT RECEIPT', 350, 45, { align: 'right', width: 210 });
  doc.fontSize(10).fillColor(secondaryColor).text(`Receipt #${data.receiptNumber || data.paymentId || 'REC-0000'}`, 350, 68, { align: 'right', width: 210 });

  // Verified Stamp
  doc.rect(480, 85, 80, 20).fillAndStroke('#ECFDF5', '#A7F3D0');
  doc.fontSize(9).fillColor(successColor).text('VERIFIED PAID', 480, 90, { align: 'center', width: 80 });

  // Divider
  doc.strokeColor(borderColor).lineWidth(1).moveTo(50, 115).lineTo(560, 115).stroke();

  // Meta Grid
  let y = 130;
  doc.fontSize(9).fillColor(secondaryColor).text('Payment Date:', 50, y);
  doc.fillColor(primaryColor).text(formatDate(data.paidDate || data.paymentDate), 130, y);

  doc.fillColor(secondaryColor).text('Payment Method:', 330, y);
  doc.fillColor(primaryColor).text(data.paymentMethod || 'Stripe Card', 420, y);
  y += 20;

  if (data.invoiceNumber) {
    doc.fillColor(secondaryColor).text('Invoice Reference:', 50, y);
    doc.fillColor(primaryColor).text(`#${data.invoiceNumber}`, 130, y);
  }

  if (data.transactionId) {
    doc.fillColor(secondaryColor).text('Transaction Ref:', 330, y);
    doc.fillColor(primaryColor).text(data.transactionId, 420, y, { width: 140 });
  }
  y += 25;

  // Payer / Property Cards
  doc.rect(50, y, 250, 75).fillAndStroke('#F8FAFC', borderColor);
  doc.rect(310, y, 250, 75).fillAndStroke('#F8FAFC', borderColor);

  doc.fontSize(8.5).fillColor(secondaryColor).text('PAID BY (TENANT / BUYER)', 60, y + 8);
  doc.fontSize(10.5).fillColor(primaryColor).text(data.payer?.name || 'Verified Tenant', 60, y + 22);
  if (data.payer?.email) doc.fontSize(8.5).fillColor(secondaryColor).text(data.payer.email, 60, y + 38);

  doc.fontSize(8.5).fillColor(secondaryColor).text('PROPERTY & UNIT', 320, y + 8);
  doc.fontSize(10).fillColor(primaryColor).text(data.property?.title || 'Residential Residence', 320, y + 22, { width: 230 });
  doc.fontSize(8.5).fillColor(secondaryColor).text(data.property?.address || '', 320, y + 38, { width: 230 });

  // Payment Breakdown Box
  y += 95;
  doc.rect(50, y, 510, 120).fillAndStroke('#FFFFFF', borderColor);
  doc.fontSize(10).fillColor(primaryColor).text('Payment Details & Allocation', 65, y + 12);

  let py = y + 32;
  doc.fontSize(9).fillColor(secondaryColor).text('Payment Purpose:', 65, py);
  doc.fillColor(primaryColor).text((data.paymentPurpose || 'Rent Payment').replace(/_/g, ' '), 200, py);
  py += 18;

  doc.fillColor(secondaryColor).text('Settlement Recipient:', 65, py);
  doc.fillColor(primaryColor).text(data.payee?.name || 'Property Owner via DwellSync Stripe Gateway', 200, py);
  py += 18;

  doc.fillColor(secondaryColor).text('Authorization Status:', 65, py);
  doc.fillColor(successColor).text('Payment Settled & Confirmed', 200, py);
  py += 18;

  // Highlight Box for Amount Paid
  y += 135;
  doc.rect(50, y, 510, 45).fill('#ECFDF5');
  doc.strokeColor('#A7F3D0').lineWidth(1).rect(50, y, 510, 45).stroke();
  doc.fontSize(11).fillColor('#065F46').text('Total Amount Received:', 70, y + 16);
  doc.fontSize(15).fillColor(successColor).text(formatCurrency(data.amount, data.currency), 350, y + 14, { align: 'right', width: 190 });

  // Statutory / Platform Disclaimer
  y += 70;
  doc.rect(50, y, 510, 60).fillAndStroke('#F8FAFC', borderColor);
  doc.fontSize(8.5).fillColor(primaryColor).text('Official Record Notice', 60, y + 10);
  doc.fontSize(8).fillColor(secondaryColor).text(
    'This electronic receipt certifies that payment was successfully processed via the Stripe payment gateway. ' +
    'The corresponding invoice balance and property management records have been reconciled in real-time.',
    60,
    y + 24,
    { width: 490, lineGap: 3 }
  );

  // Footer
  doc.fontSize(8).fillColor(secondaryColor).text(
    'DwellSync Home Management Platform  •  Official Electronic Payment Receipt',
    50,
    730,
    { align: 'center', width: 510 }
  );
}

module.exports = {
  renderInvoice,
  renderReceipt
};
