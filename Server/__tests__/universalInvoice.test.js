const PDFService = require('../services/pdf/pdfService');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Property = require('../models/Property');

jest.mock('../models/Invoice');
jest.mock('../models/Payment');
jest.mock('../models/User');
jest.mock('../models/Property');

describe('Universal Invoice & PDF Template Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invoice PDF Generation', () => {
    it('generates a valid binary PDF buffer for an authorized invoice', async () => {
      const mockInvoice = {
        _id: 'inv_abc',
        invoiceNo: 'INV-202611-999',
        issuedAt: new Date(),
        dueDate: new Date(Date.now() + 86400000),
        paymentPurpose: 'MONTHLY_RENT',
        status: 'open',
        currency: 'BDT',
        total: 25000,
        subtotal: 25000,
        paidAmount: 0,
        balance: 25000,
        billTo: {
          _id: 'user_tenant',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        },
        billFrom: {
          _id: 'user_owner',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com'
        },
        propertyId: {
          _id: 'prop_abc',
          displayName: 'Dhanmondi Residence',
          address: 'House 24, Road 8A'
        },
        lineItems: [
          { description: 'Rent for November 2026', quantity: 1, unitPrice: 25000, amount: 25000 }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockInvoice)
              })
            })
          })
        })
      });

      const pdfBuffer = await PDFService.generateInvoicePDFBuffer('inv_abc', 'user_tenant');
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(500);
      // Valid PDF files start with %PDF-
      expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    it('denies access (403) to unauthorized users attempting to view another user invoice', async () => {
      const mockInvoice = {
        _id: 'inv_secret',
        billTo: { _id: 'legitimate_tenant' },
        billFrom: { _id: 'legitimate_owner' },
        propertyId: { _id: 'prop_1' }
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockInvoice)
              })
            })
          })
        })
      });

      Property.findById.mockResolvedValue({ ownerUserId: 'legitimate_owner' });
      User.findById.mockResolvedValue({ role: 'tenant' }); // not admin

      await expect(PDFService.generateInvoicePDFBuffer('inv_secret', 'unauthorized_stranger'))
        .rejects.toThrow('Unauthorized access to invoice');
    });
  });

  describe('Payment Receipt PDF Generation', () => {
    it('generates a valid binary PDF buffer for a completed payment', async () => {
      const mockPayment = {
        _id: 'pay_xyz',
        paymentId: 'PAY-202611-888',
        status: 'completed',
        amount: 30000,
        currency: 'BDT',
        paidAt: new Date(),
        method: 'stripe',
        paymentPurpose: 'RENTAL_ADVANCE',
        stripeDetails: { paymentIntentId: 'pi_test_receipt_123' },
        payerId: {
          _id: 'user_tenant',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        },
        payeeId: {
          _id: 'user_owner',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com'
        },
        propertyId: {
          displayName: 'Apartment 4B',
          address: 'House 24, Road 8A, Dhanmondi'
        },
        invoiceId: {
          invoiceNo: 'INV-202611-777'
        }
      };

      Payment.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockPayment)
                  })
                })
              })
            })
          })
        })
      });

      const receiptBuffer = await PDFService.generateReceiptPDFBuffer('pay_xyz', 'user_tenant');
      expect(Buffer.isBuffer(receiptBuffer)).toBe(true);
      expect(receiptBuffer.length).toBeGreaterThan(500);
      expect(receiptBuffer.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    it('rejects receipt generation for pending or unconfirmed payments', async () => {
      const mockPendingPayment = {
        _id: 'pay_pending',
        status: 'pending',
        payerId: { _id: 'user_tenant' }
      };

      Payment.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockPendingPayment)
                  })
                })
              })
            })
          })
        })
      });

      await expect(PDFService.generateReceiptPDFBuffer('pay_pending', 'user_tenant'))
        .rejects.toThrow('Receipt cannot be generated for an unconfirmed or pending payment');
    });
  });
});
