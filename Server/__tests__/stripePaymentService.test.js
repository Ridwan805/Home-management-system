const stripePaymentService = require('../services/stripePaymentService');
const Request = require('../models/Request');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const User = require('../models/User');

jest.mock('../models/Request');
jest.mock('../models/Invoice');
jest.mock('../models/Payment');
jest.mock('../models/Property');
jest.mock('../models/Rent');
jest.mock('../models/User');
jest.mock('../services/emailService', () => ({
  sendPaymentReceiptEmail: jest.fn().mockResolvedValue({ success: true }),
  sendInvoiceIssuedEmail: jest.fn().mockResolvedValue({ success: true })
}));
jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true })
}));

describe('StripePaymentService - Universal Payment Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stripePaymentService.stripe = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ id: 'cs_test_mock_123', url: 'https://checkout.stripe.com/mock' })
        }
      },
      refunds: {
        create: jest.fn().mockResolvedValue({ id: 're_mock_123', status: 'succeeded' })
      }
    };
  });

  describe('ensureInvoiceAndPaymentRecord', () => {
    it('creates an authoritative Invoice and Payment record before payment for RENTAL_ADVANCE', async () => {
      const mockRequest = {
        _id: 'req_123',
        requestId: 'REQ-1234',
        requestType: 'Rent',
        propertyId: { _id: 'prop_123', title: 'Luxury Apt' },
        tenantId: { _id: 'tenant_123' },
        ownerId: { _id: 'owner_123' },
        offer: {
          securityDeposit: 30000,
          currency: 'BDT',
          paymentDeadline: new Date(Date.now() + 86400000)
        }
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRequest)
      });

      Invoice.findOne.mockResolvedValue(null);
      Invoice.countDocuments.mockResolvedValue(10);

      const mockSavedInvoice = {
        _id: 'inv_123',
        invoiceNo: 'INV-20261116-0011',
        total: 30000,
        currency: 'BDT',
        status: 'open',
        save: jest.fn().mockResolvedValue(true)
      };
      Invoice.mockImplementation(() => mockSavedInvoice);

      Payment.findOne.mockResolvedValue(null);
      const mockSavedPayment = {
        _id: 'pay_123',
        paymentId: 'PAY-123',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      Payment.mockImplementation(() => mockSavedPayment);

      const result = await stripePaymentService.ensureInvoiceAndPaymentRecord({
        purpose: 'RENTAL_ADVANCE',
        requestId: 'req_123'
      });

      expect(result.invoice).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(mockSavedInvoice.save).toHaveBeenCalled();
      expect(mockSavedPayment.save).toHaveBeenCalled();
    });

    it('reuses existing Invoice if already created for the same request', async () => {
      const existingInvoice = {
        _id: 'inv_existing',
        invoiceNo: 'INV-EXISTING',
        total: 25000,
        currency: 'BDT',
        status: 'open'
      };

      const mockRequest = {
        _id: 'req_123',
        propertyId: { _id: 'prop_123' },
        tenantId: { _id: 'tenant_123' },
        ownerId: { _id: 'owner_123' }
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRequest)
      });

      Invoice.findOne.mockResolvedValue(existingInvoice);

      const existingPayment = {
        _id: 'pay_existing',
        status: 'pending'
      };
      Payment.findOne.mockResolvedValue(existingPayment);

      const result = await stripePaymentService.ensureInvoiceAndPaymentRecord({
        purpose: 'RENTAL_ADVANCE',
        requestId: 'req_123'
      });

      expect(result.invoice).toBe(existingInvoice);
      expect(result.payment).toBe(existingPayment);
    });
  });

  describe('createPaymentSession', () => {
    it('rejects payment creation if requesting user is not the billTo payer', async () => {
      const mockInvoice = {
        _id: 'inv_123',
        billTo: 'tenant_real',
        status: 'open',
        total: 20000,
        balance: 20000
      };
      const mockPayment = {
        _id: 'pay_123',
        status: 'pending'
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockInvoice)
          })
        })
      });
      Payment.findOne.mockResolvedValue(mockPayment);

      await expect(stripePaymentService.createPaymentSession({
        purpose: 'MONTHLY_RENT',
        invoiceId: 'inv_123',
        userId: 'attacker_user_id'
      })).rejects.toThrow('Not authorized to make payment for this invoice');
    });

    it('rejects payment if invoice is already paid', async () => {
      const mockInvoice = {
        _id: 'inv_paid',
        billTo: 'tenant_123',
        status: 'paid',
        total: 20000,
        balance: 0
      };
      const mockPayment = {
        _id: 'pay_paid',
        status: 'completed'
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockInvoice)
          })
        })
      });
      Payment.findOne.mockResolvedValue(mockPayment);

      await expect(stripePaymentService.createPaymentSession({
        purpose: 'MONTHLY_RENT',
        invoiceId: 'inv_paid',
        userId: 'tenant_123'
      })).rejects.toThrow('This invoice has already been paid and verified');
    });

    it('creates Stripe checkout session using authoritative backend amount', async () => {
      const mockInvoice = {
        _id: 'inv_valid',
        invoiceNo: 'INV-202611-001',
        billTo: 'tenant_123',
        propertyId: 'prop_123',
        status: 'open',
        total: 25000,
        balance: 25000,
        currency: 'BDT'
      };
      const mockPayment = {
        _id: 'pay_valid',
        paymentId: 'PAY-VALID',
        status: 'pending',
        stripeDetails: {},
        history: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockInvoice)
          })
        })
      });
      Payment.findOne.mockResolvedValue(mockPayment);
      Property.findById.mockResolvedValue({
        displayName: 'Apartment 4B',
        address: 'Dhanmondi'
      });
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ email: 'tenant@example.com' })
      });

      // Mock Stripe client create session
      const mockStripeSession = {
        id: 'cs_test_mock_123',
        url: 'https://checkout.stripe.com/pay/cs_test_mock_123'
      };
      stripePaymentService.stripe = {
        checkout: {
          sessions: {
            create: jest.fn().mockResolvedValue(mockStripeSession)
          }
        }
      };

      const result = await stripePaymentService.createPaymentSession({
        purpose: 'MONTHLY_RENT',
        invoiceId: 'inv_valid',
        userId: 'tenant_123',
        reqOrigin: 'http://localhost:5174'
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('cs_test_mock_123');
      expect(result.url).toBe(mockStripeSession.url);
      expect(stripePaymentService.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'bdt',
                unit_amount: 2500000 // 25,000 * 100 poisha
              })
            })
          ],
          success_url: expect.stringContaining('http://localhost:5174/tenant/payment')
        })
      );
    });
  });

  describe('handlePaymentSuccess (Idempotency & Lifecycle)', () => {
    it('is idempotent: ignores already completed payments', async () => {
      const mockPayment = {
        _id: 'pay_done',
        status: 'completed'
      };
      Payment.findById.mockResolvedValue(mockPayment);

      const session = {
        id: 'cs_test_123',
        payment_intent: 'pi_test_123',
        metadata: { paymentId: 'pay_done' }
      };

      const result = await stripePaymentService.handlePaymentSuccess(session);
      expect(result.alreadyProcessed).toBe(true);
    });

    it('for RENTAL_ADVANCE: activates Tenancy and marks Property as Rented', async () => {
      const mockPayment = {
        _id: 'pay_adv',
        status: 'processing',
        history: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Payment.findById.mockResolvedValue(mockPayment);

      const mockInvoice = {
        _id: 'inv_adv',
        invoiceNo: 'INV-ADV-1',
        total: 30000,
        payments: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Invoice.findById.mockResolvedValue(mockInvoice);

      const mockRequest = {
        _id: 'req_123',
        propertyId: 'prop_123',
        ownerId: 'owner_123',
        advancePayment: { amount: 30000, currency: 'BDT' },
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Request.findById.mockResolvedValue(mockRequest);

      const mockProperty = {
        _id: 'prop_123',
        status: 'Processing',
        save: jest.fn().mockResolvedValue(true)
      };
      Property.findById.mockResolvedValue(mockProperty);

      Rent.findById.mockResolvedValue(null);
      Rent.findOne.mockResolvedValue(null);
      Rent.mockImplementation(() => ({
        _id: 'rent_new',
        save: jest.fn().mockResolvedValue(true)
      }));

      User.findById.mockResolvedValue({ _id: 'tenant_123', email: 'tenant@test.com' });

      const session = {
        id: 'cs_advance_123',
        payment_intent: 'pi_adv_123',
        metadata: {
          purpose: 'RENTAL_ADVANCE',
          paymentId: 'pay_adv',
          invoiceId: 'inv_adv',
          requestId: 'req_123',
          userId: 'tenant_123'
        }
      };

      const result = await stripePaymentService.handlePaymentSuccess(session);
      expect(result.success).toBe(true);
      expect(mockPayment.status).toBe('completed');
      expect(mockInvoice.status).toBe('paid');
      expect(mockProperty.status).toBe('Rented');
      expect(mockProperty.rentedAt).toBeDefined();
    });

    it('for PURCHASE_BOOKING_DEPOSIT: marks Property Processing without creating Rent lease', async () => {
      const mockPayment = {
        _id: 'pay_buy',
        status: 'processing',
        history: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Payment.findById.mockResolvedValue(mockPayment);

      const mockInvoice = {
        _id: 'inv_buy',
        invoiceNo: 'INV-BUY-1',
        total: 500000,
        payments: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Invoice.findById.mockResolvedValue(mockInvoice);

      const mockRequest = {
        _id: 'req_buy_123',
        propertyId: 'prop_buy_123',
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Request.findById.mockResolvedValue(mockRequest);

      const mockProperty = {
        _id: 'prop_buy_123',
        status: 'Available',
        save: jest.fn().mockResolvedValue(true)
      };
      Property.findById.mockResolvedValue(mockProperty);
      User.findById.mockResolvedValue({ _id: 'buyer_123', email: 'buyer@test.com' });

      const session = {
        id: 'cs_buy_123',
        payment_intent: 'pi_buy_123',
        metadata: {
          purpose: 'PURCHASE_BOOKING_DEPOSIT',
          paymentId: 'pay_buy',
          invoiceId: 'inv_buy',
          requestId: 'req_buy_123',
          userId: 'buyer_123'
        }
      };

      const result = await stripePaymentService.handlePaymentSuccess(session);
      expect(result.success).toBe(true);
      expect(mockProperty.status).toBe('Processing');
      expect(Rent).not.toHaveBeenCalled(); // Crucial: no rental lease created!
    });
  });

  describe('handlePaymentFailure', () => {
    it('marks payment as failed and prevents tenancy activation', async () => {
      const mockPayment = {
        _id: 'pay_fail',
        status: 'processing',
        history: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Payment.findOne.mockResolvedValue(mockPayment);

      await stripePaymentService.handlePaymentFailure({
        id: 'pi_failed_123',
        last_payment_error: { message: 'Card declined' }
      });

      expect(mockPayment.status).toBe('failed');
      expect(mockPayment.save).toHaveBeenCalled();
    });
  });
});
