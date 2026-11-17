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
