const mongoose = require('mongoose');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const Request = require('../models/Request');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Notice = require('../models/Notice');
const MaintenanceReport = require('../models/MaintenanceReport');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Helper to resolve user ID from decoded token or user model
 */
const resolveUserId = (user) => {
  if (!user) return null;
  return user._id ? user._id.toString() : (user.userId ? user.userId.toString() : (user.id ? user.id.toString() : null));
};

/**
 * GET /api/dashboard/overview
 * Fetches real MongoDB metrics for the unified dashboard:
 * - 4 Summary KPI Cards:
 *   1. Properties I Own (count)
 *   2. Homes I Rent (count)
 *   3. Rent to Pay (total BDT outstanding)
 *   4. Rent to Receive (total BDT outstanding)
 * - My Property Portfolio (Owned + Rented properties)
 * - Recent Activity Stream
 */
exports.getUnifiedDashboardOverview = async (req, res) => {
  try {
    const rawUserId = resolveUserId(req.user);
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userIdStr = rawUserId.toString();
    const userObjId = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : null;

    // 1. Fetch properties owned by user
    const ownerQuery = [
      { ownerUserId: userIdStr },
      { owner: userIdStr },
      { ownerId: userIdStr }
    ];
    if (userObjId) {
      ownerQuery.push({ ownerUserId: userObjId });
      ownerQuery.push({ owner: userObjId });
      ownerQuery.push({ ownerId: userObjId });
    }

    const ownedProperties = await Property.find({
      $or: ownerQuery,
      isDeleted: { $ne: true }
    })
      .populate('ownerUserId', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    const ownedPropIds = ownedProperties.map(p => p._id);
    const propertiesOwnedCount = ownedProperties.length;

    // 2. Fetch active tenancies rented by user
    const tenantQuery = [{ tenants: userIdStr }];
    if (userObjId) tenantQuery.push({ tenants: userObjId });

    const activeRents = await Rent.find({
      $or: tenantQuery,
      status: 'Active'
    })
      .populate({
        path: 'propertyId',
        populate: {
          path: 'ownerUserId',
          select: 'firstName lastName email phoneNumber'
        }
      })
      .populate('ownerId', 'firstName lastName email phoneNumber')
      .populate('requestId')
      .lean();

    const homesRentedCount = activeRents.length;

    // Also fetch historical purchase records for tenant
    let approvedPurchases = [];
    try {
      approvedPurchases = await Request.find({
        tenantId: userObjId || userIdStr,
        requestType: { $in: ['Buy', 'Purchase'] },
        status: { $in: ['Approved', 'AdvancePaid', 'Paid/Completed', 'Completed', 'Processing'] }
      })
        .populate({
          path: 'propertyId',
          populate: { path: 'ownerUserId', select: 'firstName lastName email phoneNumber' }
        })
        .lean();
    } catch (e) {
      approvedPurchases = [];
    }

    // 3. Calculate "Rent to Pay" (User as Tenant)
    // Find outstanding invoices for tenant
    const tenantInvoices = await Invoice.find({
      $or: [
        { billTo: userObjId || userIdStr },
        { tenantId: userObjId || userIdStr }
      ],
      status: { $in: ['pending', 'open', 'partially_paid', 'overdue'] }
    }).lean();

    let rentToPay = 0;
    tenantInvoices.forEach(inv => {
      const balance = Number(inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.amountPaid || inv.paidAmount || 0)));
      if (balance > 0) rentToPay += balance;
    });

    // 4. Calculate "Rent to Receive" (User as Owner)
    // Find active tenancies on owned properties
    const ownerActiveRents = await Rent.find({
      propertyId: { $in: ownedPropIds },
      status: 'Active'
    }).lean();

    const ownerInvoices = await Invoice.find({
      $or: [
        { billFrom: userObjId || userIdStr },
        { ownerId: userObjId || userIdStr },
        { propertyId: { $in: ownedPropIds } }
      ],
      status: { $in: ['pending', 'open', 'partially_paid', 'overdue'] }
    }).lean();

    let rentToReceive = 0;
    ownerInvoices.forEach(inv => {
      const balance = Number(inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.amountPaid || inv.paidAmount || 0)));
      if (balance > 0) rentToReceive += balance;
    });

    // Also check if owner has active tenancies with overdue balances that don't have open invoices
    if (rentToReceive === 0 && ownerActiveRents.length > 0) {
      // Cross check with invoices
      const hasPendingInvoices = ownerInvoices.some(i => i.status !== 'paid');
      if (!hasPendingInvoices) {
        // Rent is up to date
      }
    }


    // 5. Build Unified Property Portfolio
    // Format owned properties
    const portfolioOwned = ownedProperties.map(p => {
      const matchingRent = ownerActiveRents.find(r => r.propertyId?.toString() === p._id.toString());
      return {
        _id: p._id,
        id: p._id,
        title: p.title || p.address || 'Property',
        address: p.address || p.location?.address || 'Address on file',
        propertyType: p.propertyType || 'apartment',
        listingType: p.listingType || 'For Rent',
        status: p.status || 'Available',
        price: p.pricing?.rent || p.price || 0,
        currency: 'BDT',
        images: Array.isArray(p.media?.photos) && p.media.photos.length > 0 ? p.media.photos : (Array.isArray(p.images) ? p.images : []),
        specifications: {
          bedrooms: p.specifications?.bedrooms || p.bedrooms || 0,
          bathrooms: p.specifications?.bathrooms || p.bathrooms || 0,
          squareFootage: p.specifications?.squareFootage || p.squareFootage || 0,
          unitNumber: p.unitNumber || p.specifications?.unitNumber || ''
        },
        portfolioType: 'owned',
        relationship: 'owner',
        hasActiveTenant: !!matchingRent,
        activeRentId: matchingRent ? matchingRent._id : null
      };
    });

    // Format rented properties
    const portfolioRented = activeRents.map(r => {
      const p = r.propertyId || {};
      const rentAmount = Number(typeof r.rent === 'number' ? r.rent : (r.rent?.amount || p.pricing?.rent || p.price || 0));
      const depositAmount = Number(typeof r.securityDeposit === 'number' ? r.securityDeposit : (r.securityDeposit?.amount || 0));
      return {
        _id: p._id || r._id,
        id: p._id || r._id,
        rentId: r._id,
        title: p.title || p.address || 'Rented Residence',
        address: p.address || p.location?.address || 'Address on file',
        propertyType: p.propertyType || 'apartment',
        listingType: 'For Rent',
        status: r.status === 'Active' ? 'Active Tenancy' : r.status,
        price: rentAmount,
        currency: 'BDT',
        securityDeposit: depositAmount,
        images: Array.isArray(p.media?.photos) && p.media.photos.length > 0 ? p.media.photos : (Array.isArray(p.images) ? p.images : []),
        specifications: {
          bedrooms: p.specifications?.bedrooms || p.bedrooms || 0,
          bathrooms: p.specifications?.bathrooms || p.bathrooms || 0,
          squareFootage: p.specifications?.squareFootage || p.squareFootage || 0,
          unitNumber: p.unitNumber || p.specifications?.unitNumber || ''
        },
        portfolioType: 'rented',
        relationship: 'tenant',
        owner: p.ownerUserId || r.ownerId || null,
        leaseDetails: {
          startDate: r.term?.startDate || r.createdAt,
          endDate: r.term?.endDate || null,
          status: r.status,
          requestId: r.requestId?._id || r.requestId
        }
      };
    });


    // Combine into full portfolio
    const portfolioAll = [...portfolioOwned, ...portfolioRented];

    // 6. Fetch Recent Activity Stream across real records
    const [recentRequests, recentPayments, recentInvoices, recentNotices, recentReports] = await Promise.allSettled([
      Request.find({
        $or: [
          { tenantId: userObjId || userIdStr },
          { ownerId: userObjId || userIdStr },
          { propertyId: { $in: ownedPropIds } }
        ]
      })
        .populate('propertyId', 'title address')
        .populate('tenantId', 'firstName lastName name email')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      Payment.find({
        $or: [
          { payerId: userObjId || userIdStr },
          { payeeId: userObjId || userIdStr },
          { userId: userObjId || userIdStr },
          { propertyId: { $in: ownedPropIds } }
        ]
      })
        .populate('propertyId', 'title address')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      Invoice.find({
        $or: [
          { tenantId: userObjId || userIdStr },
          { ownerId: userObjId || userIdStr },
          { propertyId: { $in: ownedPropIds } }
        ]
      })
        .populate('propertyId', 'title address')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      Notice.find({
        $or: [
          { tenantId: userObjId || userIdStr },
          { ownerId: userObjId || userIdStr },
          { propertyId: { $in: ownedPropIds } }
        ]
      })
        .populate('propertyId', 'title address')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      MaintenanceReport.find({
        $or: [
          { tenantId: userObjId || userIdStr },
          { ownerId: userObjId || userIdStr },
          { propertyId: { $in: ownedPropIds } }
        ]
      })
        .populate('propertyId', 'title address')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const activityList = [];

    // Format requests
    if (recentRequests.status === 'fulfilled' && Array.isArray(recentRequests.value)) {
      recentRequests.value.forEach(reqDoc => {
        const isApplicant = reqDoc.tenantId?._id?.toString() === userIdStr || reqDoc.tenantId?.toString() === userIdStr;
        activityList.push({
          id: `req_${reqDoc._id}`,
          type: 'application',
          title: isApplicant ? 'Application Submitted' : 'Application Received',
          subtitle: `${reqDoc.propertyId?.title || reqDoc.propertyId?.address || 'Property'} (${reqDoc.requestType || 'Rental'})`,
          date: reqDoc.createdAt,
          status: reqDoc.status || 'Pending',
          actionUrl: isApplicant ? '/dashboard/applications?tab=sent' : '/dashboard/applications?tab=received'
        });
      });
    }

    // Format payments
    if (recentPayments.status === 'fulfilled' && Array.isArray(recentPayments.value)) {
      recentPayments.value.forEach(p => {
        const isPayer = p.payerId?.toString() === userIdStr || p.userId?.toString() === userIdStr;
        activityList.push({
          id: `pay_${p._id}`,
          type: 'payment',
          title: isPayer ? `Rent Paid: ৳${(p.amount || 0).toLocaleString()}` : `Payment Received: ৳${(p.amount || 0).toLocaleString()}`,
          subtitle: p.propertyId?.title || p.propertyId?.address || 'Property Payment',
          date: p.paidAt || p.createdAt,
          status: p.status === 'completed' ? 'Paid' : (p.status || 'Completed'),
          actionUrl: '/dashboard/payments'
        });
      });
    }

    // Format invoices
    if (recentInvoices.status === 'fulfilled' && Array.isArray(recentInvoices.value)) {
      recentInvoices.value.forEach(inv => {
        activityList.push({
          id: `inv_${inv._id}`,
          type: 'invoice',
          title: `Invoice #${inv.invoiceNumber || inv._id.toString().slice(-6)}`,
          subtitle: `${inv.propertyId?.title || inv.propertyId?.address || 'Property'} — ৳${(inv.total || 0).toLocaleString()}`,
          date: inv.createdAt,
          status: inv.status === 'paid' ? 'Paid' : (inv.status === 'overdue' ? 'Overdue' : 'Pending'),
          actionUrl: '/dashboard/invoices'
        });
      });
    }

    // Format notices
    if (recentNotices.status === 'fulfilled' && Array.isArray(recentNotices.value)) {
      recentNotices.value.forEach(notice => {
        activityList.push({
          id: `not_${notice._id}`,
          type: 'notice',
          title: notice.title || 'Move-Out Notice',
          subtitle: notice.propertyId?.title || notice.propertyId?.address || 'Tenancy Notice',
          date: notice.createdAt,
          status: notice.status || 'Active',
          actionUrl: '/dashboard/notices'
        });
      });
    }

    // Format maintenance reports
    if (recentReports.status === 'fulfilled' && Array.isArray(recentReports.value)) {
      recentReports.value.forEach(rep => {
        activityList.push({
          id: `rep_${rep._id}`,
          type: 'maintenance',
          title: `Maintenance: ${rep.title || rep.issueType || 'Report'}`,
          subtitle: rep.propertyId?.title || rep.propertyId?.address || 'Maintenance Issue',
          date: rep.createdAt,
          status: rep.status || 'Pending',
          actionUrl: '/dashboard/maintenance'
        });
      });
    }

    // Sort combined activities by date descending and take top 10
    activityList.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivities = activityList.slice(0, 10);

    // 7. Unread counts
    let unreadNotificationsCount = 0;
    try {
      unreadNotificationsCount = await Notification.countDocuments({
        userId: userObjId || userIdStr,
        isRead: false
      });
    } catch (e) {
      unreadNotificationsCount = 0;
    }

    // Get current user details
    const currentUserDoc = await User.findById(userObjId || userIdStr).select('firstName lastName name email phoneNumber address role').lean();

    return res.status(200).json({
      success: true,
      user: currentUserDoc,
      summary: {
        propertiesOwned: propertiesOwnedCount,
        homesRented: homesRentedCount,
        rentToPay,
        rentToReceive,
        totalPortfolioCount: portfolioAll.length,
        unreadNotifications: unreadNotificationsCount
      },
      portfolio: {
        all: portfolioAll,
        owned: portfolioOwned,
        rented: portfolioRented,
        purchases: approvedPurchases
      },
      recentActivities
    });

  } catch (error) {
    console.error('Error fetching unified dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard overview data',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/financials
 * Dedicated Financial Overview endpoint for the unified Tenant + Owner dashboard.
 * Delivers verified data for:
 * 1. 4 Summary Metric Cards (Rent Received, Rent to Receive, Rent to Pay, Security Deposits)
 * 2. Cash Flow Chart (Rent Received vs Rent Paid across monthly intervals)
 * 3. Upcoming Payments Panel (Real upcoming / overdue obligations for tenant)
 * 4. Recent Financial Activity Ledger (Categorized transactions with filter tabs)
 * 5. Net Cash Flow & Financial Summary Panel
 */
exports.getFinancialOverview = async (req, res) => {
  try {
    const rawUserId = resolveUserId(req.user);
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userIdStr = rawUserId.toString();
    const userObjId = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : null;
    const period = req.query.period || '6months'; // '30days' | '3months' | '6months' | '12months' | 'all'

    // Determine start date filter based on selected period
    const now = new Date();
    let periodStartDate = new Date();
    if (period === '30days') {
      periodStartDate.setDate(now.getDate() - 30);
    } else if (period === '3months') {
      periodStartDate.setMonth(now.getMonth() - 3);
    } else if (period === '12months') {
      periodStartDate.setFullYear(now.getFullYear() - 1);
    } else if (period === 'all') {
      periodStartDate = new Date(0);
    } else {
      // Default: 6 months
      periodStartDate.setMonth(now.getMonth() - 6);
    }

    // Previous period start date for trend comparison
    const periodDurationMs = now.getTime() - periodStartDate.getTime();
    const prevPeriodStartDate = new Date(periodStartDate.getTime() - periodDurationMs);

    // 1. Fetch properties owned by user
    const ownerQuery = [
      { ownerUserId: userIdStr },
      { owner: userIdStr },
      { ownerId: userIdStr }
    ];
    if (userObjId) {
      ownerQuery.push({ ownerUserId: userObjId }, { owner: userObjId }, { ownerId: userObjId });
    }

    const ownedProperties = await Property.find({
      $or: ownerQuery,
      isDeleted: { $ne: true }
    }).select('_id title address propertyType listingType pricing unitNumber').lean();

    const ownedPropIds = ownedProperties.map(p => p._id);

    // 2. Fetch active tenancies on owned properties (User as Owner)
    const ownedTenancies = await Rent.find({
      propertyId: { $in: ownedPropIds }
    })
      .populate('propertyId', 'title address unitNumber')
      .populate('tenants', 'firstName lastName name email phoneNumber')
      .lean();

    // Calculate Security Deposits held for owned rental properties
    let securityDepositsHeld = 0;
    let activeDepositCount = 0;
    const depositRecords = [];

    ownedTenancies.forEach(r => {
      if (r.status === 'Active' && r.securityDeposit) {
        const heldAmount = Number(r.securityDeposit.held !== undefined ? r.securityDeposit.held : (r.securityDeposit.amount || 0));
        if (heldAmount > 0) {
          securityDepositsHeld += heldAmount;
          activeDepositCount += 1;
          const tenantName = Array.isArray(r.tenants) && r.tenants[0] 
            ? (r.tenants[0].firstName ? `${r.tenants[0].firstName} ${r.tenants[0].lastName || ''}`.trim() : r.tenants[0].name || r.tenants[0].email)
            : 'Active Tenant';

          depositRecords.push({
            id: `DEP-${r._id}`,
            date: r.term?.startDate || r.createdAt,
            propertyName: r.propertyId?.title || r.propertyId?.address || 'Property',
            unitNumber: r.propertyId?.unitNumber || '',
            type: 'Security Deposit',
            category: 'deposit',
            from: tenantName,
            to: 'Escrow (Held by Owner)',
            amount: heldAmount,
            currency: 'BDT',
            status: 'Held',
            invoiceId: null,
            invoiceNo: null,
            receiptUrl: null
          });
        }
      }
    });

    // 3. Outstanding Receivables (Rent to Receive from tenants on owned properties)
    const ownerInvoices = await Invoice.find({
      $or: [
        { propertyId: { $in: ownedPropIds } },
        { billFrom: userObjId || userIdStr },
        { ownerId: userObjId || userIdStr }
      ]
    })
      .populate('propertyId', 'title address unitNumber')
      .populate('billTo', 'firstName lastName name email phoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    let rentToReceive = 0;
    let pendingReceivableCount = 0;

    ownerInvoices.forEach(inv => {
      if (['pending', 'open', 'partially_paid', 'overdue'].includes(inv.status)) {
        const bal = Number(inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.amountPaid || 0)));
        if (bal > 0) {
          rentToReceive += bal;
          pendingReceivableCount += 1;
        }
      }
    });

    // 4. User as Tenant: Active tenancies & Rent to Pay obligations
    const tenantQuery = [{ tenants: userIdStr }];
    if (userObjId) tenantQuery.push({ tenants: userObjId });

    const tenantTenancies = await Rent.find({
      $or: tenantQuery,
      status: 'Active'
    })
      .populate('propertyId', 'title address unitNumber pricing')
      .populate('ownerId', 'firstName lastName name email phoneNumber')
      .lean();

    // Fetch unpaid tenant invoices
    const tenantInvoices = await Invoice.find({
      $or: [
        { billTo: userObjId || userIdStr },
        { tenantId: userObjId || userIdStr }
      ]
    })
      .populate('propertyId', 'title address unitNumber')
      .populate('billFrom', 'firstName lastName name email phoneNumber')
      .sort({ dueDate: 1 })
      .lean();

    let rentToPay = 0;
    let nextDueDate = null;
    const upcomingPayments = [];

    tenantInvoices.forEach(inv => {
      if (['pending', 'open', 'partially_paid', 'overdue'].includes(inv.status)) {
        const bal = Number(inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.amountPaid || 0)));
        if (bal > 0) {
          rentToPay += bal;
          const due = inv.dueDate ? new Date(inv.dueDate) : null;
          if (due && (!nextDueDate || due < nextDueDate)) {
            nextDueDate = due;
          }

          upcomingPayments.push({
            id: inv._id,
            invoiceNo: inv.invoiceNo,
            propertyId: inv.propertyId?._id || inv.propertyId,
            propertyName: inv.propertyId?.title || inv.propertyId?.address || 'Rented Unit',
            unitNumber: inv.propertyId?.unitNumber || '',
            paymentType: inv.paymentPurpose === 'MONTHLY_RENT' ? 'Monthly Rent' : (inv.lineItems?.[0]?.description || 'Property Invoice'),
            amount: bal,
            currency: 'BDT',
            dueDate: inv.dueDate,
            status: inv.status === 'overdue' ? 'Overdue' : 'Due Soon',
            isPayable: true,
            invoiceId: inv._id
          });
        }
      }
    });

    // If tenant has active tenancies without an open invoice, add upcoming monthly rent
    if (upcomingPayments.length === 0 && tenantTenancies.length > 0) {
      tenantTenancies.forEach(r => {
        const p = r.propertyId || {};
        const amount = Number(r.rent?.amount || p.pricing?.rent || 0);
        if (amount > 0) {
          const nextDue = new Date();
          const dueDay = r.rent?.dueDay || 1;
          if (nextDue.getDate() > dueDay) {
            nextDue.setMonth(nextDue.getMonth() + 1);
          }
          nextDue.setDate(dueDay);

          if (!nextDueDate || nextDue < nextDueDate) {
            nextDueDate = nextDue;
          }

          upcomingPayments.push({
            id: `RENT-${r._id}`,
            invoiceNo: null,
            propertyId: p._id || r.propertyId,
            propertyName: p.title || p.address || 'Rented Residence',
            unitNumber: p.unitNumber || '',
            paymentType: 'Monthly Rent',
            amount,
            currency: 'BDT',
            dueDate: nextDue.toISOString(),
            status: 'Upcoming',
            isPayable: false,
            invoiceId: null
          });
        }
      });
    }

    // 5. Query All Real Payments matching the user
    // Verified completed statuses only
    const COMPLETED_STATUSES = ['completed', 'paid', 'succeeded'];

    const allPayments = await Payment.find({
      $or: [
        { payeeId: userObjId || userIdStr },
        { receiverId: userObjId || userIdStr },
        { payerId: userObjId || userIdStr },
        { userId: userObjId || userIdStr },
        { propertyId: { $in: ownedPropIds } }
      ]
    })
      .populate('propertyId', 'title address unitNumber')
      .populate('payerId', 'firstName lastName name email')
      .populate('payeeId', 'firstName lastName name email')
      .sort({ createdAt: -1 })
      .lean();

    // Separate verified payments into:
    // A) Rent Received (Income as Owner)
    // B) Rent Paid (Expense as Tenant)
    // Exclude security deposits and purchase payments from rental income
    let totalRentReceived = 0;
    let prevPeriodRentReceived = 0;
    let totalRentPaid = 0;

    const ledgerTransactions = [];

    allPayments.forEach(p => {
      const isCompleted = COMPLETED_STATUSES.includes((p.status || '').toLowerCase());
      const pDate = new Date(p.paidAt || p.createdAt || Date.now());
      const isInCurrentPeriod = pDate >= periodStartDate;
      const isInPrevPeriod = pDate >= prevPeriodStartDate && pDate < periodStartDate;

      const isOwnerPayee = (p.payeeId && (p.payeeId._id?.toString() === userIdStr || p.payeeId.toString() === userIdStr)) ||
                           (p.receiverId && (p.receiverId.toString() === userIdStr)) ||
                           (p.propertyId && ownedPropIds.some(opId => opId.toString() === p.propertyId._id?.toString() || opId.toString() === p.propertyId.toString()));

      const isTenantPayer = (p.payerId && (p.payerId._id?.toString() === userIdStr || p.payerId.toString() === userIdStr)) ||
                            (p.userId && (p.userId.toString() === userIdStr));

      const isRentalType = ['monthly_rent', 'advance_payment'].includes(p.type) ||
                           ['MONTHLY_RENT', 'RENTAL_ADVANCE'].includes(p.paymentPurpose);

      // Payer and payee display names
      const payerName = p.payerId 
        ? (p.payerId.firstName ? `${p.payerId.firstName} ${p.payerId.lastName || ''}`.trim() : p.payerId.name || p.payerId.email)
        : 'Tenant';
      const payeeName = p.payeeId
        ? (p.payeeId.firstName ? `${p.payeeId.firstName} ${p.payeeId.lastName || ''}`.trim() : p.payeeId.name || p.payeeId.email)
        : 'Property Owner';

      // Determine transaction category and update totals
      if (isOwnerPayee && isCompleted && isRentalType) {
        if (isInCurrentPeriod) totalRentReceived += (p.amount || 0);
        if (isInPrevPeriod) prevPeriodRentReceived += (p.amount || 0);
      }

      if (isTenantPayer && isCompleted && isRentalType) {
        if (isInCurrentPeriod) totalRentPaid += (p.amount || 0);
      }

      // Add to transaction ledger
      let category = 'other';
      if (p.paymentPurpose === 'PURCHASE_BOOKING_DEPOSIT') {
        category = 'deposit';
      } else if (isOwnerPayee) {
        category = 'received';
      } else if (isTenantPayer) {
        category = 'paid';
      }

      const propTitle = p.propertyId?.title || p.propertyId?.address || 'Property Transaction';

      ledgerTransactions.push({
        id: p.paymentId || `PAY-${p._id}`,
        rawId: p._id,
        date: pDate.toISOString(),
        propertyName: propTitle,
        unitNumber: p.propertyId?.unitNumber || '',
        type: p.paymentPurpose === 'PURCHASE_BOOKING_DEPOSIT' ? 'Purchase Booking Deposit' : (p.type === 'monthly_rent' ? 'Monthly Rent' : (p.type === 'advance_payment' ? 'Rental Advance' : 'Rental Payment')),
        category,
        from: isTenantPayer ? 'You' : payerName,
        to: isOwnerPayee ? 'You' : payeeName,
        amount: p.amount || 0,
        currency: p.currency || 'BDT',
        status: isCompleted ? 'Completed' : (p.status === 'failed' ? 'Failed' : (p.status === 'cancelled' ? 'Cancelled' : 'Processing')),
        invoiceId: p.invoiceId || null,
        invoiceNo: null,
        receiptUrl: p.receiptData?.receiptUrl || (p.stripeDetails?.receiptUrl || null)
      });
    });

    // Also add open/overdue invoices to ledger as 'outstanding'
    const combinedInvoices = [...ownerInvoices, ...tenantInvoices];
    const seenInvoiceIds = new Set();

    combinedInvoices.forEach(inv => {
      const invIdStr = inv._id.toString();
      if (seenInvoiceIds.has(invIdStr)) return;
      seenInvoiceIds.add(invIdStr);

      if (['pending', 'open', 'partially_paid', 'overdue'].includes(inv.status)) {
        const bal = Number(inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.amountPaid || 0)));
        const isBilledToMe = inv.billTo?._id?.toString() === userIdStr || inv.billTo?.toString() === userIdStr;
        const tenantName = inv.billTo 
          ? (inv.billTo.firstName ? `${inv.billTo.firstName} ${inv.billTo.lastName || ''}`.trim() : inv.billTo.name || inv.billTo.email)
          : 'Tenant';
        const ownerName = inv.billFrom 
          ? (inv.billFrom.firstName ? `${inv.billFrom.firstName} ${inv.billFrom.lastName || ''}`.trim() : inv.billFrom.name || inv.billFrom.email)
          : 'Property Owner';

        ledgerTransactions.push({
          id: inv.invoiceNo || `INV-${inv._id}`,
          rawId: inv._id,
          date: inv.issuedAt || inv.createdAt,
          propertyName: inv.propertyId?.title || inv.propertyId?.address || 'Property Invoice',
          unitNumber: inv.propertyId?.unitNumber || '',
          type: inv.paymentPurpose === 'MONTHLY_RENT' ? 'Monthly Rent Due' : (inv.lineItems?.[0]?.description || 'Invoice Due'),
          category: 'outstanding',
          from: isBilledToMe ? 'You' : tenantName,
          to: isBilledToMe ? ownerName : 'You',
          amount: bal,
          currency: 'BDT',
          status: inv.status === 'overdue' ? 'Overdue' : 'Pending',
          invoiceId: inv._id,
          invoiceNo: inv.invoiceNo,
          receiptUrl: null
        });
      }
    });

    // Add security deposit records to ledger
    depositRecords.forEach(dep => {
      ledgerTransactions.push(dep);
    });

    // Sort ledger by date descending
    ledgerTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate percentage change for Rent Received vs previous period
    let rentReceivedChange = 'Verified collections';
    if (prevPeriodRentReceived > 0) {
      const diff = totalRentReceived - prevPeriodRentReceived;
      const pct = Math.round((diff / prevPeriodRentReceived) * 100);
      rentReceivedChange = pct >= 0 ? `+${pct}% from previous period` : `${pct}% from previous period`;
    } else if (totalRentReceived > 0) {
      rentReceivedChange = 'Active verified collections';
    }

    // 6. Generate Monthly Cash Flow Data for Chart
    // Build an array of months covering the selected period
    const monthCount = period === '30days' ? 1 : (period === '3months' ? 3 : (period === '12months' ? 12 : 6));
    const cashFlowMonthly = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      const monthLabel = `${monthName} ${year}`;

      // Sum received and paid for this specific month
      let mReceived = 0;
      let mPaid = 0;

      allPayments.forEach(p => {
        const isCompleted = COMPLETED_STATUSES.includes((p.status || '').toLowerCase());
        if (!isCompleted) return;

        const isRentalType = ['monthly_rent', 'advance_payment'].includes(p.type) ||
                             ['MONTHLY_RENT', 'RENTAL_ADVANCE'].includes(p.paymentPurpose);
        if (!isRentalType) return;

        const pDate = new Date(p.paidAt || p.createdAt || Date.now());
        if (pDate.getFullYear() === year && pDate.getMonth() === monthIdx) {
          const isOwnerPayee = (p.payeeId && (p.payeeId._id?.toString() === userIdStr || p.payeeId.toString() === userIdStr)) ||
                               (p.receiverId && (p.receiverId.toString() === userIdStr)) ||
                               (p.propertyId && ownedPropIds.some(opId => opId.toString() === p.propertyId._id?.toString() || opId.toString() === p.propertyId.toString()));

          const isTenantPayer = (p.payerId && (p.payerId._id?.toString() === userIdStr || p.payerId.toString() === userIdStr)) ||
                                (p.userId && (p.userId.toString() === userIdStr));

          if (isOwnerPayee) mReceived += (p.amount || 0);
          if (isTenantPayer) mPaid += (p.amount || 0);
        }
      });

      cashFlowMonthly.push({
        month: monthLabel,
        received: mReceived,
        paid: mPaid,
        net: mReceived - mPaid
      });
    }

    // 7. Net Rental Cash Flow (Income minus Expenses for selected period)
    const netRentalCashFlow = totalRentReceived - totalRentPaid;

    return res.status(200).json({
      success: true,
      period,
      summary: {
        rentReceived: totalRentReceived,
        rentReceivedChange,
        rentToReceive,
        pendingReceivableCount,
        rentToPay,
        nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
        securityDepositsHeld,
        activeDepositCount
      },
      cashFlowSummary: {
        totalRentReceived,
        totalRentPaid,
        outstandingReceivables: rentToReceive,
        outstandingPayables: rentToPay,
        netRentalCashFlow
      },
      cashFlowMonthly,
      upcomingPayments,
      transactions: ledgerTransactions
    });

  } catch (error) {
    console.error('Error fetching financial overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load financial overview data',
      error: error.message
    });
  }
};
