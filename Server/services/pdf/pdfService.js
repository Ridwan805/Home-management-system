const PDFDocument = require('pdfkit');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const User = require('../../models/User');
const Property = require('../../models/Property');
const tempTemplate = require('./templates/tempInvoiceTemplate');

class PDFService {
  /**
   * Retrieves and formats standardized data for an Invoice
   * @param {string} invoiceId 
   * @param {string} requestingUserId 
   * @returns {Promise<Object>}
   */
  static async getInvoiceData(invoiceId, requestingUserId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('billTo', 'firstName lastName email phoneNumber')
      .populate('billFrom', 'firstName lastName email phoneNumber')
      .populate('propertyId', 'title displayName address location')
      .populate('requestId')
      .populate('payments');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Authorization check: user must be billTo (tenant), billFrom (owner), property owner, or admin
    const isPayer = invoice.billTo?._id?.toString() === requestingUserId?.toString();
    const isPayee = invoice.billFrom?._id?.toString() === requestingUserId?.toString();
    
    // Check if requesting user is property owner
    let isOwner = isPayee;
    if (!isOwner && invoice.propertyId) {
      const prop = await Property.findById(invoice.propertyId._id || invoice.propertyId);
      if (prop && prop.ownerUserId?.toString() === requestingUserId?.toString()) {
        isOwner = true;
      }
    }

    if (requestingUserId && !isPayer && !isOwner) {
      const user = await User.findById(requestingUserId);
      if (user?.role !== 'admin') {
        const err = new Error('Unauthorized access to invoice');
        err.statusCode = 403;
        throw err;
      }
    }

    const payerName = invoice.billTo ? `${invoice.billTo.firstName || ''} ${invoice.billTo.lastName || ''}`.trim() : 'Authorized Tenant';
    const payeeName = invoice.billFrom ? `${invoice.billFrom.firstName || ''} ${invoice.billFrom.lastName || ''}`.trim() : 'Property Owner';

    const propTitle = invoice.propertyId?.displayName || invoice.propertyId?.title || 'Residential Residence';
    const propAddress = invoice.propertyId?.address || 'Property Address';

    return {
      documentType: 'INVOICE',
      invoiceNumber: invoice.invoiceNo || `INV-${invoice._id.toString().slice(-6).toUpperCase()}`,
      issueDate: invoice.issuedAt || invoice.createdAt,
      dueDate: invoice.dueDate,
      paymentPurpose: invoice.paymentPurpose || 'MONTHLY_RENT',
      status: invoice.status || 'open',
      currency: (invoice.currency || 'BDT').toUpperCase(),
      payer: {
        name: payerName,
        email: invoice.billTo?.email || '',
        phone: invoice.billTo?.phoneNumber || ''
      },
      payee: {
        name: payeeName,
        email: invoice.billFrom?.email || ''
      },
      property: {
        title: propTitle,
        address: propAddress
      },
      lineItems: (invoice.lineItems || []).map(li => ({
        description: li.description,
        quantity: li.quantity || 1,
        unitPrice: li.unitPrice || li.amount,
        amount: li.amount
      })),
      subtotal: invoice.subtotal || invoice.total,
      tax: invoice.tax || 0,
      fees: invoice.totalFees || 0,
      total: invoice.total,
      amountPaid: invoice.paidAmount || 0,
      balanceDue: invoice.balance !== undefined ? invoice.balance : (invoice.total - (invoice.paidAmount || 0))
    };
  }

  /**
   * Retrieves and formats standardized data for a Payment Receipt
   * @param {string} paymentId 
   * @param {string} requestingUserId 
   * @returns {Promise<Object>}
   */
  static async getPaymentReceiptData(paymentId, requestingUserId) {
    const payment = await Payment.findById(paymentId)
      .populate('payerId', 'firstName lastName email phoneNumber')
      .populate('payeeId', 'firstName lastName email phoneNumber')
      .populate('receiverId', 'firstName lastName email phoneNumber')
      .populate('propertyId', 'title displayName address location')
      .populate({
        path: 'invoiceId',
        select: 'invoiceNo total lineItems period dueDate billFrom billTo paymentPurpose propertyId',
        populate: {
          path: 'propertyId',
          select: 'title displayName address location'
        }
      })
      .populate({
        path: 'rentId',
        populate: {
          path: 'propertyId',
          select: 'title displayName address location'
        }
      })
      .populate('requestId');

    if (!payment) {
      throw new Error('Payment transaction not found');
    }

    // Verify payment is completed/paid before generating official receipt
    const isCompleted = ['completed', 'paid', 'succeeded'].includes(payment.status);
    if (!isCompleted) {
      const err = new Error('Receipt cannot be generated for an unconfirmed or pending payment');
      err.statusCode = 400;
      throw err;
    }

    // Authorization check
    const isPayer = payment.payerId?._id?.toString() === requestingUserId?.toString();
    const isPayee = (payment.payeeId?._id?.toString() === requestingUserId?.toString()) ||
                    (payment.receiverId?._id?.toString() === requestingUserId?.toString());

    let isOwner = isPayee;
    if (!isOwner && (payment.propertyId || payment.invoiceId?.propertyId || payment.rentId?.propertyId)) {
      const propRef = payment.propertyId || payment.invoiceId?.propertyId || payment.rentId?.propertyId;
      const prop = await Property.findById(propRef._id || propRef);
      if (prop && prop.ownerUserId?.toString() === requestingUserId?.toString()) {
        isOwner = true;
      }
    }

    if (requestingUserId && !isPayer && !isOwner) {
      const user = await User.findById(requestingUserId);
      if (user?.role !== 'admin') {
        const err = new Error('Unauthorized access to receipt');
        err.statusCode = 403;
        throw err;
      }
    }

    const payerName = payment.payerId ? `${payment.payerId.firstName || ''} ${payment.payerId.lastName || ''}`.trim() : 'Authorized Tenant';
    const payeeObj = payment.payeeId || payment.receiverId || payment.invoiceId?.billFrom;
    const payeeName = payeeObj ? `${payeeObj.firstName || ''} ${payeeObj.lastName || ''}`.trim() : 'Property Owner';

    const prop = payment.propertyId || payment.invoiceId?.propertyId || payment.rentId?.propertyId;
    const propTitle = prop?.displayName || prop?.title || 'Residential Property';
    const propAddress = prop?.address || 'Property Address';

    return {
      documentType: 'RECEIPT',
      paymentId: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
      receiptNumber: payment.receiptData?.paymentId || payment.paymentId || `REC-${payment._id.toString().slice(-8).toUpperCase()}`,
      paidDate: payment.paidAt || payment.completedAt || payment.createdAt,
      paymentMethod: payment.method === 'stripe' ? 'Stripe Card Payment' : (payment.provider || payment.method || 'Credit/Debit Card'),
      transactionId: payment.stripeDetails?.paymentIntentId || payment.stripeDetails?.chargeId || payment.externalRef || 'VERIFIED-ONLINE',
      invoiceNumber: payment.invoiceId?.invoiceNo || '',
      paymentPurpose: payment.paymentPurpose || payment.type || 'MONTHLY_RENT',
      amount: payment.amount,
      currency: (payment.currency || payment.invoiceId?.currency || 'BDT').toUpperCase(),
      payer: {
        name: payerName,
        email: payment.payerId?.email || '',
        phone: payment.payerId?.phoneNumber || ''
      },
      payee: {
        name: payeeName,
        email: payeeObj?.email || ''
      },
      property: {
        title: propTitle,
        address: propAddress
      }
    };
  }

  /**
   * Generates PDF buffer for an Invoice
   * @param {string} invoiceId 
   * @param {string} requestingUserId 
   * @returns {Promise<Buffer>}
   */
  static async generateInvoicePDFBuffer(invoiceId, requestingUserId) {
    const data = await this.getInvoiceData(invoiceId, requestingUserId);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      tempTemplate.renderInvoice(doc, data);
      doc.end();
    });
  }

  /**
   * Generates PDF buffer for a Payment Receipt
   * @param {string} paymentId 
   * @param {string} requestingUserId 
   * @returns {Promise<Buffer>}
   */
  static async generateReceiptPDFBuffer(paymentId, requestingUserId) {
    const data = await this.getPaymentReceiptData(paymentId, requestingUserId);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      tempTemplate.renderReceipt(doc, data);
      doc.end();
    });
  }

  /**
   * Streams invoice PDF to HTTP response
   */
  static async streamInvoicePDF(invoiceId, requestingUserId, res) {
    const data = await this.getInvoiceData(invoiceId, requestingUserId);
    const filename = `Invoice-${data.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    tempTemplate.renderInvoice(doc, data);
    doc.end();
  }

  /**
   * Streams receipt PDF to HTTP response
   */
  static async streamReceiptPDF(paymentId, requestingUserId, res) {
    const data = await this.getPaymentReceiptData(paymentId, requestingUserId);
    const filename = `Receipt-${data.receiptNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    tempTemplate.renderReceipt(doc, data);
    doc.end();
  }
}

module.exports = PDFService;
