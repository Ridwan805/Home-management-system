const Stripe = require('stripe');
const Request = require('../models/Request');
const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Rent = require('../models/Rent');
const EmailService = require('./emailService');
const NotificationService = require('./notificationService');

// Payment Purposes supported universally
const PAYMENT_PURPOSES = {
  RENTAL_ADVANCE: 'RENTAL_ADVANCE',
  MONTHLY_RENT: 'MONTHLY_RENT',
  PURCHASE_BOOKING_DEPOSIT: 'PURCHASE_BOOKING_DEPOSIT',
  OUTSTANDING_INVOICE: 'OUTSTANDING_INVOICE',
  OTHER_AUTHORIZED_PROPERTY_CHARGE: 'OTHER_AUTHORIZED_PROPERTY_CHARGE'
};

class StripePaymentService {
  constructor() {
    this.stripe = null;
    this.initStripe();
  }

  /**
   * Initializes the Stripe SDK in test mode without exposing secrets
   */
  initStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      try {
        this.stripe = new Stripe(secretKey, {
          apiVersion: '2023-10-16' // Stable Stripe API version
        });
        const isTestMode = secretKey.startsWith('sk_test_');
        console.log(`💳 StripePaymentService initialized successfully [Test Mode: ${isTestMode}]`);
      } catch (err) {
        console.error('❌ Failed to initialize Stripe client:', err.message);
        this.stripe = null;
      }
    } else {
      console.warn('⚠️ STRIPE_SECRET_KEY is not defined in environment variables. Stripe features disabled.');
    }
  }

  /**
   * Returns initialized Stripe client or throws error
   */
  getClient() {
    if (!this.stripe) {
      this.initStripe();
    }
    if (!this.stripe) {
      throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing or invalid.');
    }
    return this.stripe;
  }

  /**
   * Resolves the appropriate frontend URL dynamically
   */
  resolveFrontendUrl(reqOrigin) {
    if (reqOrigin && reqOrigin.startsWith('http')) {
      return reqOrigin.replace(/\/+$/, '');
    }
    const envUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    if (envUrl) {
      return envUrl.replace(/\/+$/, '');
    }
    return 'http://localhost:5174';
  }

  /**
   * Ensures an authoritative Invoice exists before proceeding to payment
   * @param {Object} options
   * @returns {Promise<{ invoice: Object, payment: Object }>}
   */
  async ensureInvoiceAndPaymentRecord({
    purpose,
    requestId = null,
    invoiceId = null,
    paymentId = null,
    rentId = null,
    propertyId = null,
    payerId,
    payeeId = null,
    amount,
    currency = 'BDT',
    description = '',
    dueDate = null,
    period = null
  }) {
    let invoice = null;
    let payment = null;

    // 1. If invoiceId provided, find existing invoice
    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId)
        .populate('propertyId')
        .populate('billTo')
        .populate('billFrom');
    }

    // 2. If paymentId provided, find existing payment
    if (paymentId) {
      payment = await Payment.findById(paymentId)
        .populate('invoiceId')
        .populate('propertyId');
      if (payment && !invoice && payment.invoiceId) {
        invoice = payment.invoiceId;
      }
    }

    // 3. For RENTAL_ADVANCE or PURCHASE_BOOKING_DEPOSIT linked to a Request
    if (!invoice && requestId) {
      const request = await Request.findById(requestId)
        .populate('propertyId ownerId tenantId');

      if (!request) {
        throw new Error('Property request not found for invoice creation');
      }

      propertyId = propertyId || request.propertyId?._id || request.propertyId;
      payerId = payerId || request.tenantId?._id || request.tenantId;
      payeeId = payeeId || request.ownerId?._id || request.ownerId;
      currency = (request.offer?.currency || request.advancePayment?.currency || currency || 'BDT').toUpperCase();
      
      if (purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE) {
        amount = Number(request.offer?.securityDeposit || request.advancePayment?.amount || amount || 0);
        description = description || `Advance Rental Security Deposit - ${request.propertyId?.title || 'Property'}`;
      } else if (purpose === PAYMENT_PURPOSES.PURCHASE_BOOKING_DEPOSIT) {
        amount = Number(request.offer?.bookingDeposit || request.advancePayment?.amount || amount || 0);
        description = description || `Property Purchase Booking Deposit - ${request.propertyId?.title || 'Property'}`;
      }

      // Check if invoice already exists for this request and purpose
      invoice = await Invoice.findOne({
        requestId: request._id,
        paymentPurpose: purpose,
        status: { $ne: 'void' }
      });

      if (!invoice) {
        const invCount = await Invoice.countDocuments();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const invoiceNo = `INV-${dateStr}-${(invCount + 1).toString().padStart(4, '0')}`;

        invoice = new Invoice({
          invoiceNo,
          requestId: request._id,
          propertyId,
          billTo: payerId,
          billFrom: payeeId,
          paymentPurpose: purpose,
          issuedAt: new Date(),
          dueDate: request.offer?.paymentDeadline || dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lineItems: [{
            type: purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE ? 'deposit' : 'fee',
            description,
            quantity: 1,
            unitPrice: amount,
            amount: amount
          }],
          subtotal: amount,
          total: amount,
          balance: amount,
          currency,
          status: 'open'
        });

        await invoice.save();
        console.log(`🧾 Created authoritative invoice #${invoice.invoiceNo} for ${purpose}`);
      }
    }

    // 4. Ensure corresponding Payment record exists
    if (!payment && invoice) {
      payment = await Payment.findOne({
        invoiceId: invoice._id,
        status: { $in: ['pending', 'processing'] }
      });

      if (!payment) {
        payment = new Payment({
          invoiceId: invoice._id,
          requestId: requestId || invoice.requestId,
          rentId: rentId || invoice.rentId,
          propertyId: propertyId || invoice.propertyId,
          payerId: payerId || invoice.billTo,
          payeeId: payeeId || invoice.billFrom,
          receiverId: payeeId || invoice.billFrom,
          paymentPurpose: purpose,
          type: purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE ? 'advance_payment' : 
                (purpose === PAYMENT_PURPOSES.PURCHASE_BOOKING_DEPOSIT ? 'full_payment' : 'monthly_rent'),
          status: 'pending',
          method: 'stripe',
          provider: 'stripe',
          amount: invoice.total,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          description: description || `Payment for Invoice #${invoice.invoiceNo}`,
          history: [{
            status: 'pending',
            timestamp: new Date(),
            note: `Payment initialized for ${purpose}`
          }]
        });

        await payment.save();
        console.log(`💳 Created Payment record ${payment.paymentId} for Invoice #${invoice.invoiceNo}`);
      }
    }

    return { invoice, payment };
  }

  /**
   * Creates a Stripe Checkout Session for any supported property payment
   */
  async createPaymentSession({
    purpose,
    requestId = null,
    invoiceId = null,
    paymentId = null,
    userId,
    customerEmail = null,
    reqOrigin = null
  }) {
    const stripe = this.getClient();

    if (!Object.values(PAYMENT_PURPOSES).includes(purpose)) {
      purpose = PAYMENT_PURPOSES.MONTHLY_RENT;
    }

    // 1. Authoritative Invoice & Payment Record establishment
    const { invoice, payment } = await this.ensureInvoiceAndPaymentRecord({
      purpose,
      requestId,
      invoiceId,
      paymentId,
      payerId: userId
    });

    if (!invoice || !payment) {
      throw new Error('Unable to resolve invoice and payment records for this transaction');
    }

    // 2. Authorization Verification
    if (invoice.billTo?._id?.toString() !== userId.toString() && invoice.billTo?.toString() !== userId.toString()) {
      const err = new Error('Not authorized to make payment for this invoice');
      err.statusCode = 403;
      throw err;
    }

    // 3. Status Verification (already paid check)
    if (invoice.status === 'paid' || payment.status === 'completed' || payment.status === 'paid') {
      const err = new Error('This invoice has already been paid and verified');
      err.statusCode = 400;
      throw err;
    }

    // Existing open Stripe session reuse & duplicate charge protection
    if (payment.stripeDetails?.sessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(payment.stripeDetails.sessionId);
        if (existingSession.payment_status === 'paid') {
          console.log(`♻️ Found already paid Stripe session ${existingSession.id}, resolving payment...`);
          await this.handlePaymentSuccess(existingSession);
          return {
            success: true,
            alreadyPaid: true,
            message: 'This invoice has already been paid and verified in Stripe.'
          };
        } else if (existingSession.status === 'open' && existingSession.url) {
          console.log(`♻️ Reusing open active Stripe Checkout session: ${existingSession.id}`);
          return {
            success: true,
            sessionId: existingSession.id,
            url: existingSession.url,
            reused: true
          };
        }
      } catch (sessCheckErr) {
        console.warn('⚠️ Could not check existing session with Stripe:', sessCheckErr.message);
      }
    }

    // 4. Offer Deadline Verification if applicable
    if (requestId) {
      const request = await Request.findById(requestId);
      if (request?.offer?.paymentDeadline && new Date() > new Date(request.offer.paymentDeadline)) {
        const err = new Error('The payment deadline for this offer has expired. The reservation has been released.');
        err.statusCode = 400;
        throw err;
      }
      if (request?.requestType === 'Rent' && request.offer) {
        if (!request.offer.formCompleted) {
          const err = new Error('Please complete the tenancy agreement form before proceeding to payment.');
          err.statusCode = 400;
          throw err;
        }
        if (!request.offer.acceptanceConsent) {
          const err = new Error('Please review and accept the agreement terms before proceeding to payment.');
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // 5. Authoritative Amount Calculation
    const payableAmount = Number(invoice.balance > 0 ? invoice.balance : invoice.total);
    if (!payableAmount || payableAmount <= 0) {
      throw new Error('Invalid payable amount for invoice');
    }

    // Currency configuration
    // Stripe supports BDT presentment currency in Test Mode!
    const currency = (invoice.currency || 'BDT').toLowerCase();
    const unitAmount = Math.round(payableAmount * 100); // Smallest currency unit (cents / poisha)

    // Customer Email resolution
    if (!customerEmail) {
      const userDoc = await User.findById(userId).select('email');
      customerEmail = userDoc?.email || undefined;
    }

    // Property Display Label
    const property = await Property.findById(invoice.propertyId);
    const propTitle = property?.displayName || property?.title || 'DwellSync Property';
    const propAddress = property?.address || 'Residential Unit';

    // 6. Dynamic Redirect URLs
    const frontendUrl = this.resolveFrontendUrl(reqOrigin);
    let successUrl, cancelUrl;

    if (purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE || purpose === PAYMENT_PURPOSES.PURCHASE_BOOKING_DEPOSIT) {
      successUrl = `${frontendUrl}/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}&request_id=${requestId || ''}`;
      cancelUrl = `${frontendUrl}/tenant/request-info?payment=cancelled&request_id=${requestId || ''}`;
    } else {
      successUrl = `${frontendUrl}/tenant/payment?session_id={CHECKOUT_SESSION_ID}&status=success&payment_id=${payment._id}&invoice_id=${invoice._id}`;
      cancelUrl = `${frontendUrl}/tenant/payment?status=cancelled&payment_id=${payment._id}&invoice_id=${invoice._id}`;
    }

    // 7. Stripe Checkout Session creation with complete metadata
    const lineItemName = `${purpose.replace(/_/g, ' ')} - #${invoice.invoiceNo}`;
    const lineItemDesc = `${propTitle} (${propAddress}) - Total Due: ৳${payableAmount.toLocaleString()}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: lineItemName,
            description: lineItemDesc
          },
          unit_amount: unitAmount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        paymentPurpose: purpose,
        purpose: purpose,
        invoiceId: invoice._id.toString(),
        invoiceNo: invoice.invoiceNo,
        paymentId: payment._id.toString(),
        requestId: requestId ? requestId.toString() : (invoice.requestId ? invoice.requestId.toString() : ''),
        userId: userId.toString(),
        tenantId: userId.toString(),
        amount: payableAmount.toString(),
        currency: currency.toUpperCase(),
        // Backwards compatibility keys for existing webhook parsers:
        type: purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE ? 'advance_payment' :
              (purpose === PAYMENT_PURPOSES.PURCHASE_BOOKING_DEPOSIT ? 'full_payment' : 'invoice_payment'),
        requestType: purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE ? 'advance_payment' : 'invoice_payment'
      }
    });

    // 8. Update Payment & Invoice with session details
    payment.status = 'processing';
    payment.stripeDetails = {
      ...(payment.stripeDetails || {}),
      sessionId: session.id
    };
    payment.history.push({
      status: 'processing',
      timestamp: new Date(),
      note: `Checkout session created: ${session.id}`
    });
    await payment.save();

    if (requestId) {
      await Request.findByIdAndUpdate(requestId, {
        'advancePayment.stripeSessionId': session.id
      });
    }

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
      checkoutUrl: session.url // Backwards compatibility alias
    };
  }

  /**
   * Idempotent handler for verified successful payment confirmation
   * @param {Object} session - Stripe Checkout Session object
   */
  async handlePaymentSuccess(session) {
    const metadata = session.metadata || {};
    const purpose = metadata.paymentPurpose || metadata.purpose || 
      (metadata.type === 'advance_payment' ? PAYMENT_PURPOSES.RENTAL_ADVANCE :
       (metadata.type === 'full_payment' ? PAYMENT_PURPOSES.PURCHASE_BOOKING_DEPOSIT : PAYMENT_PURPOSES.MONTHLY_RENT));

    const invoiceId = metadata.invoiceId;
    const paymentId = metadata.paymentId;
    const requestId = metadata.requestId;
    const userId = metadata.userId || metadata.tenantId;

    console.log(`🎉 [STRIPE SERVICE] Processing payment success for purpose: ${purpose}`, {
      sessionId: session.id,
      paymentIntent: session.payment_intent,
      invoiceId,
      paymentId,
      requestId
    });

    let payment = null;
    let invoice = null;

    // 1. Resolve and update Payment record
    if (paymentId) {
      payment = await Payment.findById(paymentId);
    }
    if (!payment && invoiceId) {
      payment = await Payment.findOne({ invoiceId: invoiceId });
    }
    if (!payment && requestId) {
      payment = await Payment.findOne({ requestId: requestId }).sort({ createdAt: -1 });
    }

    if (payment) {
      // Idempotency check: if already completed, do not re-run actions
      if (['completed', 'paid', 'succeeded'].includes(payment.status)) {
        console.log(`⚠️ Payment ${payment._id} already marked completed. Skipping duplicate processing.`);
        return { alreadyProcessed: true };
      }

      payment.status = 'completed';
      payment.paidAt = new Date();
      payment.externalRef = session.payment_intent;
      payment.stripeDetails = {
        ...(payment.stripeDetails || {}),
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        chargeId: session.payment_intent
      };

      payment.history.push({
        status: 'completed',
        timestamp: new Date(),
        note: `Payment confirmed via Stripe Checkout (${session.payment_intent})`
      });

      await payment.save();
      console.log(`✅ Payment ${payment._id} marked completed`);
    }

    // 2. Resolve and update Invoice record
    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId);
    } else if (payment?.invoiceId) {
      invoice = await Invoice.findById(payment.invoiceId);
    } else if (requestId) {
      invoice = await Invoice.findOne({ requestId: requestId });
    }

    if (invoice) {
      invoice.status = 'paid';
      invoice.balance = 0;
      invoice.paidAmount = invoice.total;
      invoice.paidAt = new Date();
      invoice.receiptNumber = payment?.paymentId || `REC-${Date.now().toString().slice(-6)}`;
      if (payment && !invoice.payments.includes(payment._id)) {
        invoice.payments.push(payment._id);
      }
      await invoice.save();
      console.log(`✅ Invoice #${invoice.invoiceNo} marked paid`);

      // Update Rent outstanding balance if linked
      if (invoice.rentId || payment?.rentId) {
        const rentId = invoice.rentId || payment.rentId;
        try {
          const rent = await Rent.findById(rentId);
          if (rent) {
            const currentBal = Number(rent.outstandingBalance) || 0;
            const deduction = Number(payment?.amount || invoice.total) || 0;
            rent.outstandingBalance = Math.max(0, currentBal - deduction);
            if (purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE) {
              rent.advancePaymentVerified = true;
            }
            await rent.save();
            console.log(`🏠 Updated Rent ${rent._id} outstanding balance to ৳${rent.outstandingBalance}`);
          }
        } catch (rentErr) {
          console.warn('⚠️ Could not update rent balance:', rentErr.message);
        }
      }
    }

    // 3. Purpose-specific workflow execution
    if (purpose === PAYMENT_PURPOSES.RENTAL_ADVANCE && requestId) {
      await this.activateTenancyUponAdvancePayment(requestId, session, userId, payment);
    } else if (purpose === PAYMENT_PURPOSES.PURCHASE_BOOKING_DEPOSIT && requestId) {
      await this.processPurchaseDepositConfirmation(requestId, session, userId, payment);
    }

    // 4. Dispatch Email Notifications Asynchronously
    try {
      this.dispatchPaymentSuccessNotifications(invoice, payment, session).catch(err => {
        console.warn('⚠️ Async payment email delivery warning:', err.message);
      });
    } catch (notifyErr) {
      console.warn('⚠️ Failed initiating payment notification:', notifyErr.message);
    }

    return { success: true };
  }

  /**
   * Authoritatively verifies a Stripe session with Stripe API and reconciles database
   */
  async verifySession(sessionId) {
    if (!sessionId) {
      throw new Error('Session ID is required for verification');
    }

    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      console.log(`🔍 [VERIFY SESSION] Session ${sessionId} confirmed paid by Stripe. Processing reconciliation...`);
      await this.handlePaymentSuccess(session);
      return {
        verified: true,
        status: 'paid',
        paymentStatus: 'completed',
        session
      };
    } else if (session.status === 'expired') {
      const payment = await Payment.findOne({
        $or: [
          { stripeSessionId: sessionId },
          { 'stripeDetails.sessionId': sessionId }
        ],
        status: 'processing'
      });
      if (payment) {
        payment.status = 'expired';
        payment.history.push({
          status: 'expired',
          timestamp: new Date(),
          note: 'Stripe checkout session expired'
        });
        await payment.save();
      }
      return {
        verified: false,
        status: 'expired',
        paymentStatus: 'expired',
        session
      };
    }

    return {
      verified: false,
      status: session.status,
      paymentStatus: session.payment_status,
      session
    };
  }

  /**
   * Activates Tenancy for Rental Advance payments
   */
  async activateTenancyUponAdvancePayment(requestId, session, userId, payment) {
    const request = await Request.findById(requestId);
    if (!request) return;

    if (request.advancePayment?.status === 'Paid') {
      console.log('⚠️ Tenancy already activated for this request. Skipping.');
      return;
    }

    request.advancePayment = request.advancePayment || {};
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
    request.advancePayment.paymentIntentId = session.payment_intent;
    request.advancePayment.stripeSessionId = session.id;
    request.advancePayment.isPaid = true;
    request.advancePayment.canPayAgain = false;

    if (request.offer) request.offer.status = 'Paid';
    if (request.reservation) {
      request.reservation.status = 'Converted';
      request.reservation.convertedAt = new Date();
    }

    request.timeline.push({
      event: 'Advance payment verified via Stripe',
      actor: userId,
      timestamp: new Date(),
      note: `Verified advance payment of ৳${request.advancePayment.amount?.toLocaleString() || ''}. Activating tenancy.`
    });

    const property = await Property.findById(request.propertyId);
    if (property) {
      let rent = null;
      if (request.rentId) rent = await Rent.findById(request.rentId);
      if (!rent) rent = await Rent.findOne({ requestId: request._id, status: 'Active' });

      if (!rent) {
        const rentAmount = Number(request.offer?.monthlyRent || property.pricing?.rent || property.pricing?.monthlyRent || property.price || 0);
        const depositAmount = Number(request.offer?.securityDeposit || request.advancePayment.amount || rentAmount);
        const startDate = request.offer?.startDate ? new Date(request.offer.startDate) : new Date();
        const endDate = request.offer?.endDate ? new Date(request.offer.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        const noticeDays = Number(request.offer?.noticeDays) || 60;
        const dueDay = Number(request.offer?.dueDay) || 1;
        const currency = (request.offer?.currency || request.advancePayment.currency || 'BDT').toUpperCase();

        rent = new Rent({
          propertyId: property._id,
          ownerId: request.ownerId._id || request.ownerId,
          tenants: [userId],
          requestId: request._id,
          term: {
            type: 'fixed',
            startDate,
            endDate,
            noticeDays: noticeDays || 60,
            noticePeriodMonths: request.offer?.noticePeriodMonths || 2,
            noticePeriodUnit: 'months'
          },
          rent: {
            amount: rentAmount,
            currency,
            dueDay,
            graceDays: 5,
            lateFee: { amount: 0, type: 'fixed' }
          },
          securityDeposit: {
            amount: depositAmount,
            held: depositAmount,
            refundedAmount: 0,
            refundStatus: 'none',
            deductions: [],
            refundTransactions: []
          },
          billing: {
            frequency: 'monthly',
            nextInvoiceDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            autoGenerate: true
          },
          status: 'Active'
        });

        await rent.save();
        console.log(`🏠 [TENANCY ACTIVATION] Active Rent created: ${rent._id}`);
      }

      request.rentId = rent._id;
      request.status = 'Paid/Completed';

      property.status = 'Rented';
      property.currentRentId = rent._id;
      property.rentedAt = new Date();
      if (!property.stateHistory) property.stateHistory = [];
      property.stateHistory.push({
        status: 'Rented',
        timestamp: new Date(),
        note: `Property marked Rented upon advance payment verification for request ${requestId}`,
        updatedBy: userId
      });
      await property.save();

      // Automatically generate first regular monthly billing invoice
      try {
        const InvoiceService = require('./invoiceService');
        await InvoiceService.generateFirstMonthlyInvoiceAfterAdvance(request._id);
      } catch (invErr) {
        console.warn('⚠️ Could not generate follow-up monthly invoice:', invErr.message);
      }
    }

    await request.save();
  }

  /**
   * Processes Purchase Booking Deposit confirmation without creating a rental lease
   */
  async processPurchaseDepositConfirmation(requestId, session, userId, payment) {
    const request = await Request.findById(requestId);
    if (!request) return;

    request.status = 'AdvancePaid';
    request.advancePayment = request.advancePayment || {};
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
    request.advancePayment.paymentIntentId = session.payment_intent;
    request.advancePayment.stripeSessionId = session.id;

    request.timeline.push({
      event: 'Purchase Booking Deposit Verified via Stripe',
      actor: userId,
      timestamp: new Date(),
      note: `Purchase booking deposit confirmed. Unit reserved for transaction completion.`
    });

    const property = await Property.findById(request.propertyId);
    if (property) {
      property.status = 'Processing';
      if (!property.stateHistory) property.stateHistory = [];
      property.stateHistory.push({
        status: 'Processing',
        state: 'Processing',
        timestamp: new Date(),
        note: `Property marked Processing upon verified booking deposit for purchase request ${requestId}`,
        updatedBy: userId
      });
      await property.save();
    }

    await request.save();
    console.log(`🏠 [PURCHASE DEPOSIT] Purchase booking verified for request ${requestId}. No rental lease created.`);
  }

  /**
   * Handles payment failure from Stripe
   */
  async handlePaymentFailure(paymentIntent) {
    if (!paymentIntent?.id) return;
    const payment = await Payment.findOne({
      $or: [
        { 'stripeDetails.paymentIntentId': paymentIntent.id },
        { externalRef: paymentIntent.id }
      ]
    });

    if (payment) {
      payment.status = 'failed';
      payment.history.push({
        status: 'failed',
        timestamp: new Date(),
        note: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Transaction declined'}`
      });
      await payment.save();
      console.log(`❌ Payment ${payment._id} marked failed`);
    }
  }

  /**
   * Dispatches asynchronous email notifications using Resend
   */
  async dispatchPaymentSuccessNotifications(invoice, payment, session) {
    if (!payment) return;
    const payer = await User.findById(payment.payerId);
    if (!payer?.email) return;

    const prop = invoice?.propertyId || payment.propertyId;
    const propTitle = prop?.displayName || prop?.title || 'Your Residence';

    // Send in-app notification to tenant & owner
    try {
      const notify = (NotificationService.sendNotification || NotificationService.createNotification).bind(NotificationService);
      await notify({
        userId: payer._id,
        recipientId: payer._id,
        recipientRole: 'Tenant',
        type: 'payment',
        title: 'Payment Confirmed',
        message: `Your payment of ৳${payment.amount?.toLocaleString()} for ${payment.paymentPurpose?.replace(/_/g, ' ') || 'Invoice'} was confirmed.`,
        relatedEntityType: 'Payment',
        relatedEntityId: payment._id,
        actionUrl: '/tenant/payment'
      });

      // Find owner of property or payee
      const ownerId = payment.payeeId || payment.receiverId || prop?.ownerUserId || prop?.ownerId || prop?.owner;
      if (ownerId && ownerId.toString() !== payer._id.toString()) {
        await notify({
          userId: ownerId,
          recipientId: ownerId,
          recipientRole: 'Owner',
          senderId: payer._id,
          type: 'payment',
          title: 'Payment Received',
          message: `Payment of ৳${payment.amount?.toLocaleString()} received from ${payer.firstName || 'tenant'} for ${propTitle}.`,
          relatedEntityType: 'Payment',
          relatedEntityId: payment._id,
          actionUrl: '/payments'
        });
      }
    } catch (e) {
      console.warn('In-app notification error:', e.message);
    }

    // Send official receipt email via Resend
    try {
      await EmailService.sendPaymentReceiptEmail({
        to: payer.email,
        recipientName: `${payer.firstName || ''} ${payer.lastName || ''}`.trim() || 'Tenant',
        receiptNumber: payment.receiptData?.paymentId || payment.paymentId || `REC-${payment._id.toString().slice(-6)}`,
        invoiceNumber: invoice?.invoiceNo,
        amount: payment.amount,
        currency: payment.currency,
        paidDate: payment.paidAt || new Date(),
        propertyTitle: propTitle,
        paymentMethod: 'Stripe Card',
        transactionId: session.payment_intent || payment.externalRef
      });
      console.log(`📧 Official payment receipt email dispatched to ${payer.email}`);
    } catch (emailErr) {
      console.warn('⚠️ Non-blocking email dispatch warning:', emailErr.message);
    }
  }

  /**
   * Initiates a verified refund through Stripe
   */
  async processRefund({ paymentId, amount = null, reason = 'requested_by_customer', requestingUserId }) {
    const stripe = this.getClient();
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.stripeDetails?.paymentIntentId && !payment.externalRef) {
      throw new Error('This payment was not processed via Stripe and cannot be refunded online.');
    }

    const paymentIntentId = payment.stripeDetails?.paymentIntentId || payment.externalRef;
    const refundAmount = amount ? Number(amount) : Number(payment.amount);
    const refundCents = Math.round(refundAmount * 100);

    console.log(`🔄 Initiating Stripe refund for Payment ${paymentId}: ${refundAmount} ${payment.currency}`);

    const stripeRefund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundCents,
      reason: reason === 'duplicate' ? 'duplicate' : (reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer'),
      metadata: {
        paymentId: payment._id.toString(),
        refundedBy: requestingUserId?.toString() || 'SYSTEM'
      }
    });

    payment.status = refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    payment.refund = {
      isRefunded: true,
      refundAmount: refundAmount,
      refundReason: reason,
      refundedAt: new Date(),
      refundedBy: requestingUserId
    };
    payment.history.push({
      status: payment.status,
      timestamp: new Date(),
      note: `Refund of ${refundAmount} ${payment.currency} processed via Stripe (${stripeRefund.id})`,
      updatedBy: requestingUserId
    });

    await payment.save();

    return {
      success: true,
      refundId: stripeRefund.id,
      amount: refundAmount,
      status: stripeRefund.status
    };
  }
}

// Export singleton instance
module.exports = new StripePaymentService();
