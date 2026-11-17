const mongoose = require('mongoose');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Notice = require('../models/Notice');
const Request = require('../models/Request');
const { sendTenantNoticeEmail } = require('../services/emailService');
const { evaluateNoticeCompliance, addCalendarMonths } = require('../utils/dateUtils');
const StripePaymentService = require('../services/stripePaymentService');

/**
 * Robust helper: Resolve authentic user ID whether req.user is a Mongoose model or decoded token
 */
const resolveUserId = (user) => {
  if (!user) return null;
  return user._id ? user._id.toString() : (user.userId ? user.userId.toString() : (user.id ? user.id.toString() : null));
};

/**
 * Helper: Computes unread messages for a given participant
 * @param {Array} messages 
 * @param {string|ObjectId} userId 
 * @returns {number}
 */
const computeUnreadMessagesCount = (messages, userId) => {
  if (!Array.isArray(messages) || !userId) return 0;
  const targetIdStr = userId.toString();
  return messages.filter(msg => {
    const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
    // Messages sent by self are never unread for self
    if (senderIdStr === targetIdStr) return false;
    // Check per-user readBy list
    if (msg.readBy && msg.readBy.some(id => (id?._id || id)?.toString() === targetIdStr)) {
      return false;
    }
    // Backward compatibility for legacy single-boolean read status
    if ((!msg.readBy || msg.readBy.length === 0) && msg.isRead) {
      return false;
    }
    return true;
  }).length;
};

/**
 * Helper: Find all property IDs owned by user
 */
const getOwnerPropertyIds = async (userId) => {
  if (!userId) return [];
  const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  const userStr = userId.toString();

  const queryOr = [
    { ownerUserId: userStr },
    { owner: userStr },
    { ownerId: userStr }
  ];
  if (userObjId) {
    queryOr.push({ ownerUserId: userObjId });
    queryOr.push({ owner: userObjId });
    queryOr.push({ ownerId: userObjId });
  }

  const properties = await Property.find({
    $or: queryOr,
    isDeleted: { $ne: true }
  }).select('_id title address unitNumber propertyType specifications pricing status currentRentId');
  return properties;
};

/**
 * 1. Get Owner's Tenants with Stats and Filters
 * GET /api/owner/tenants
 */
const getOwnerTenants = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { search, propertyId, status, paymentStatus } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const ownedProperties = await getOwnerPropertyIds(userId);
    const ownedPropertyIds = ownedProperties.map(p => p._id);

    if (ownedPropertyIds.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          totalTenants: 0,
          occupiedApartments: 0,
          outstandingRent: 0,
          activeNotices: 0
        },
        tenants: [],
        properties: []
      });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    const userStr = userId.toString();
    const ownerOrConditions = [
      { propertyId: { $in: ownedPropertyIds } },
      { ownerId: userStr }
    ];
    if (userObjId) {
      ownerOrConditions.push({ ownerId: userObjId });
    }

    // Build query for Rents associated with owner's properties or ownerId
    const rentQuery = {
      $or: ownerOrConditions,
      isDeleted: { $ne: true }
    };

    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      rentQuery.propertyId = propertyId;
    }

    if (status && status !== 'all') {
      rentQuery.status = new RegExp(`^${status}$`, 'i');
    }

    const rents = await Rent.find(rentQuery)
      .populate('tenants', 'firstName lastName email phoneNumber name address')
      .populate('propertyId', 'title address unitNumber floorNumber propertyType specifications pricing status')
      .sort({ createdAt: -1 });

    // Collect all rentIds to fetch invoices in batch
    const rentIds = rents.map(r => r._id);
    const invoices = await Invoice.find({
      $or: [
        { rentId: { $in: rentIds } },
        { propertyId: { $in: ownedPropertyIds } }
      ]
    }).sort({ dueDate: -1 });

    // Group invoices by rentId
    const invoicesByRent = {};
    invoices.forEach(inv => {
      const rId = inv.rentId ? inv.rentId.toString() : null;
      if (rId) {
        if (!invoicesByRent[rId]) invoicesByRent[rId] = [];
        invoicesByRent[rId].push(inv);
      }
    });

    // Count active notices sent by this owner in the past 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeNoticesCount = await Notice.countDocuments({
      ownerId: userId,
      status: 'sent',
      createdAt: { $gte: thirtyDaysAgo }
    });

    let totalOutstanding = 0;
    const distinctTenantIds = new Set();
    const occupiedPropertyIds = new Set();

    // Map rents to tenant dashboard records
    let tenantRecords = [];

    for (const rent of rents) {
      const property = rent.propertyId;
      const tenantUser = rent.tenants && rent.tenants[0] ? rent.tenants[0] : null;

      if (!property || !tenantUser) continue;

      if (rent.status === 'Active') {
        distinctTenantIds.add(tenantUser._id.toString());
        occupiedPropertyIds.add(property._id.toString());
      }

      const rentInvoices = invoicesByRent[rent._id.toString()] || [];
      
      let rentTotalBilled = 0;
      let rentTotalPaid = 0;
      let rentOutstanding = 0;
      let latestInvoiceStatus = 'Paid';
      let hasOverdue = false;

      const activeInvoices = rentInvoices.filter(inv => inv.status !== 'void');

      if (activeInvoices.length > 0) {
        activeInvoices.forEach(inv => {
          rentTotalBilled += (inv.total || 0);
          rentTotalPaid += (inv.paidAmount || 0);
          const balance = (inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.paidAmount || 0)));
          if (balance > 0) {
            rentOutstanding += balance;
            if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
              hasOverdue = true;
            }
          }
        });

        const latestInv = activeInvoices[0];
        const latestBal = latestInv.balance !== undefined ? latestInv.balance : (latestInv.total - latestInv.paidAmount);

        if (latestBal <= 0) {
          latestInvoiceStatus = 'Paid';
        } else if (hasOverdue) {
          latestInvoiceStatus = 'Overdue';
        } else if (latestInv.paidAmount > 0) {
          latestInvoiceStatus = 'Partially Paid';
        } else {
          latestInvoiceStatus = 'Pending';
        }
      } else {
        // If no active invoices yet, check if rent is active
        latestInvoiceStatus = rent.status === 'Active' ? 'Paid' : 'Pending';
      }

      if (rent.status === 'Active') {
        totalOutstanding += rentOutstanding;
      }

      // Resolve linked application / conversation record
      let matchingRequest = null;
      if (rent.requestId) {
        matchingRequest = await Request.findById(rent.requestId)
          .select('_id requestId status requestType messages ownerId')
          .populate('messages.senderId', 'firstName lastName email role');
      }
      if (!matchingRequest) {
        matchingRequest = await Request.findOne({
          $or: [
            { rentId: rent._id },
            { propertyId: property._id, tenantId: tenantUser._id }
          ]
        })
          .select('_id requestId status requestType messages ownerId')
          .populate('messages.senderId', 'firstName lastName email role')
          .sort({ createdAt: -1 });

        // Auto-link rent.requestId if missing
        if (matchingRequest && !rent.requestId) {
          rent.requestId = matchingRequest._id;
          await rent.save().catch(() => {});
        }
      }

      const unreadMessagesCount = matchingRequest
        ? computeUnreadMessagesCount(matchingRequest.messages, userId)
        : 0;
      const messagesCount = matchingRequest && Array.isArray(matchingRequest.messages)
        ? matchingRequest.messages.length
        : 0;

      const record = {
        _id: rent._id,
        relationshipId: `rent_${rent._id}`,
        clientType: 'tenant',
        listingType: 'For Rent',
        purchasePrice: 0,
        purchaseStatus: null,
        rentId: rent._id,
        tenantId: tenantUser._id,
        requestId: matchingRequest ? matchingRequest._id : (rent.requestId || null),
        requestHumanId: matchingRequest ? matchingRequest.requestId : null,
        requestStatus: matchingRequest ? matchingRequest.status : null,
        unreadMessagesCount,
        messagesCount,
        fullName: `${tenantUser.firstName || ''} ${tenantUser.lastName || ''}`.trim() || tenantUser.name || 'Tenant',
        firstName: tenantUser.firstName || '',
        lastName: tenantUser.lastName || '',
        email: tenantUser.email || '',
        phoneNumber: tenantUser.phoneNumber || '',
        address: tenantUser.address || '',
        propertyId: property._id,
        propertyName: property.title || property.address || 'Property',
        propertyAddress: property.address || '',
        propertyType: property.propertyType || 'Apartment',
        unitNumber: property.unitNumber || (property.specifications && property.specifications.unitNumber) || 'Unit 1',
        floorNumber: property.floorNumber || 1,
        monthlyRent: rent.rent?.amount || property.pricing?.monthlyRent || property.pricing?.rent || 0,
        currency: rent.rent?.currency || 'BDT',
        securityDeposit: rent.securityDeposit?.amount || 0,
        securityDepositDetails: rent.securityDeposit || null,
        advancePaymentVerified: Boolean(rent.advancePaymentVerified),
        reconciliationStatus: rent.reconciliationStatus || (rent.securityDeposit?.held > 0 && !rent.advancePaymentVerified ? 'legacy_direct_activation' : 'verified'),
        moveOut: rent.moveOut || null,
        leaseStartDate: rent.term?.startDate || rent.createdAt,
        leaseEndDate: rent.term?.endDate || null,
        leaseType: rent.term?.type || 'fixed',
        leaseStatus: rent.status || 'Active',
        paymentStatus: latestInvoiceStatus,
        outstandingBalance: rentOutstanding,
        totalPaid: rentTotalPaid,
        totalBilled: rentTotalBilled,
        invoicesCount: rentInvoices.length,
        notes: rent.notes || '',
        createdAt: rent.createdAt
      };

      tenantRecords.push(record);
    }

    // -------------------------------------------------------------------------
    // 2. Fetch and Map Purchase Clients (Buyers) for Owner's Properties / OwnerId
    // -------------------------------------------------------------------------
    const purchaseOrConditions = [
      { propertyId: { $in: ownedPropertyIds } },
      { ownerId: userStr }
    ];
    if (userObjId) {
      purchaseOrConditions.push({ ownerId: userObjId });
    }

    const purchaseQuery = {
      $and: [
        { $or: purchaseOrConditions },
        {
          $or: [
            { requestType: { $regex: /^buy$/i } },
            { listingType: 'For Sale' }
          ]
        },
        {
          status: {
            $in: [
              'Approved',
              'Approved – Pay Advance',
              'Payment Submitted',
              'AdvancePaid',
              'Confirmed for Sale',
              'Paid/Completed',
              'Completed',
              'Processing'
            ]
          }
        },
        { isDeleted: { $ne: true } }
      ]
    };

    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      purchaseQuery.$and.push({ propertyId: propertyId });
    }

    if (status && status !== 'all') {
      purchaseQuery.$and.push({ status: new RegExp(`^${status}$`, 'i') });
    }

    let purchaseRequests = [];
    try {
      const q = Request.find(purchaseQuery);
      if (q && typeof q.populate === 'function') {
        purchaseRequests = await q
          .populate('tenantId', 'firstName lastName email phoneNumber name address')
          .populate('propertyId', 'title address unitNumber floorNumber propertyType specifications pricing status listingType')
          .populate('messages.senderId', 'firstName lastName email role')
          .sort({ createdAt: -1 });
      }
    } catch (reqErr) {
      console.warn('[WARN] Could not query purchase requests in getOwnerTenants:', reqErr.message);
      purchaseRequests = [];
    }
    if (!Array.isArray(purchaseRequests)) purchaseRequests = [];

    const purchaseReqIds = purchaseRequests.map(r => r._id);
    const purchasePropIds = purchaseRequests.map(r => r.propertyId?._id || r.propertyId).filter(Boolean);

    let purchasePayments = [];
    if (purchaseReqIds.length > 0 || purchasePropIds.length > 0) {
      try {
        const pq = Payment.find({
          $or: [
            { requestId: { $in: purchaseReqIds } },
            { propertyId: { $in: purchasePropIds } }
          ],
          status: 'completed'
        });
        if (pq && typeof pq.sort === 'function') {
          purchasePayments = await pq.sort({ createdAt: -1 });
        }
      } catch (pmtErr) {
        console.warn('[WARN] Could not query purchase payments in getOwnerTenants:', pmtErr.message);
        purchasePayments = [];
      }
    }
    if (!Array.isArray(purchasePayments)) purchasePayments = [];

    const paymentsByRequestId = {};
    purchasePayments.forEach(p => {
      const rId = p.requestId ? p.requestId.toString() : null;
      if (rId) {
        if (!paymentsByRequestId[rId]) paymentsByRequestId[rId] = [];
        paymentsByRequestId[rId].push(p);
      }
    });

    let totalPurchaseOutstanding = 0;
    const distinctBuyerIds = new Set();
    const distinctClientIds = new Set(distinctTenantIds);

    let buyerRecords = [];

    for (const reqDoc of purchaseRequests) {
      const property = reqDoc.propertyId;
      const buyerUser = reqDoc.tenantId;

      if (!property || !buyerUser) continue;

      distinctBuyerIds.add(buyerUser._id.toString());
      distinctClientIds.add(buyerUser._id.toString());

      const reqIdStr = reqDoc._id.toString();
      const verifiedPayments = paymentsByRequestId[reqIdStr] || purchasePayments.filter(p =>
        (p.propertyId?.toString() === property._id?.toString() &&
         (p.payerId?.toString() === buyerUser._id?.toString() || p.userId?.toString() === buyerUser._id?.toString()))
      );

      const verifiedPaid = verifiedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const agreedPrice = Number(
        property.pricing?.sale ||
        property.previousSalePricing?.salePrice ||
        reqDoc.offer?.offeredPrice ||
        (property.listingType === 'For Sale' ? property.price : 0) ||
        reqDoc.offer?.advanceAmount ||
        reqDoc.advancePayment?.amount ||
        0
      );

      const remainingBalance = Math.max(0, agreedPrice - verifiedPaid);
      totalPurchaseOutstanding += remainingBalance;

      let purchaseStatus;
      const rawStatus = (reqDoc.status || '').trim();
      const isSold = property.status === 'Sold' || rawStatus.toLowerCase() === 'completed' || rawStatus.toLowerCase() === 'paid/completed';

      if (isSold) {
        purchaseStatus = 'Completed';
      } else if (verifiedPaid >= agreedPrice && agreedPrice > 0) {
        purchaseStatus = 'Fully Paid';
      } else if (verifiedPaid > 0 || rawStatus.toLowerCase() === 'advancepaid') {
        purchaseStatus = 'Advance Paid';
      } else if (rawStatus.toLowerCase() === 'approved' || rawStatus.toLowerCase() === 'approved – pay advance') {
        purchaseStatus = 'Approved';
      } else {
        purchaseStatus = rawStatus || 'Under Review';
      }

      let buyerPaymentStatus;
      if (remainingBalance === 0 && verifiedPaid > 0) {
        buyerPaymentStatus = 'Paid';
      } else if (verifiedPaid > 0) {
        buyerPaymentStatus = 'Partially Paid';
      } else {
        buyerPaymentStatus = 'Pending';
      }

      const unreadMessagesCount = computeUnreadMessagesCount(reqDoc.messages, userId);
      const messagesCount = Array.isArray(reqDoc.messages) ? reqDoc.messages.length : 0;

      const buyerRecord = {
        _id: reqDoc._id,
        relationshipId: `buy_${reqDoc._id}`,
        clientType: 'buyer',
        tenantId: buyerUser._id,
        buyerId: buyerUser._id,
        rentId: null,
        requestId: reqDoc._id,
        requestHumanId: reqDoc.requestId || `REQ-${reqDoc._id.toString().slice(-6)}`,
        requestStatus: rawStatus,
        unreadMessagesCount,
        messagesCount,
        fullName: `${buyerUser.firstName || ''} ${buyerUser.lastName || ''}`.trim() || buyerUser.name || 'Buyer',
        firstName: buyerUser.firstName || '',
        lastName: buyerUser.lastName || '',
        email: buyerUser.email || '',
        phoneNumber: buyerUser.phoneNumber || '',
        address: buyerUser.address || '',
        propertyId: property._id,
        propertyName: property.title || property.address || 'Property',
        propertyAddress: property.address || '',
        propertyType: property.propertyType || 'land',
        listingType: property.listingType || 'For Sale',
        unitNumber: property.unitNumber || (property.specifications && property.specifications.unitNumber) || 'Plot',
        floorNumber: property.floorNumber || null,
        purchasePrice: agreedPrice,
        currency: 'BDT',
        monthlyRent: 0,
        securityDeposit: 0,
        securityDepositDetails: null,
        advancePaid: verifiedPaid,
        remainingBalance,
        purchaseStatus,
        leaseStatus: purchaseStatus,
        paymentStatus: buyerPaymentStatus,
        outstandingBalance: remainingBalance,
        totalPaid: verifiedPaid,
        totalBilled: agreedPrice,
        invoicesCount: verifiedPayments.length,
        agreementDate: reqDoc.offer?.acceptedAt || reqDoc.createdAt,
        leaseStartDate: reqDoc.offer?.acceptedAt || reqDoc.createdAt,
        leaseEndDate: null,
        leaseType: 'purchase',
        deedStatus: isSold ? 'Transferred' : 'Pending Conveyance',
        verifiedPaymentsCount: verifiedPayments.length,
        notes: reqDoc.offer?.specialTerms || '',
        createdAt: reqDoc.createdAt
      };

      buyerRecords.push(buyerRecord);
    }

    let allClientRecords = [...tenantRecords, ...buyerRecords];

    // Apply text search if provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allClientRecords = allClientRecords.filter(t => 
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.phoneNumber.toLowerCase().includes(q) ||
        t.propertyName.toLowerCase().includes(q) ||
        t.propertyAddress.toLowerCase().includes(q) ||
        t.unitNumber.toLowerCase().includes(q)
      );
    }

    // Apply paymentStatus filter if provided
    if (paymentStatus && paymentStatus !== 'all') {
      allClientRecords = allClientRecords.filter(t => t.paymentStatus.toLowerCase() === paymentStatus.toLowerCase());
    }

    const summary = {
      totalClients: distinctClientIds.size,
      totalTenants: distinctTenantIds.size,
      propertyBuyers: distinctBuyerIds.size,
      occupiedApartments: occupiedPropertyIds.size,
      outstandingRent: totalOutstanding,
      outstandingPurchaseBalance: totalPurchaseOutstanding,
      totalOutstanding: totalOutstanding + totalPurchaseOutstanding,
      activeNotices: activeNoticesCount
    };

    return res.status(200).json({
      success: true,
      summary,
      tenants: allClientRecords,
      clients: allClientRecords,
      properties: ownedProperties.map(p => ({
        _id: p._id,
        title: p.title || p.address,
        address: p.address,
        unitNumber: p.unitNumber || 'Unit 1',
        status: p.status,
        listingType: p.listingType
      }))
    });

  } catch (error) {
    console.error('[ERROR] Error fetching owner tenants:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tenant directory',
      error: error.message
    });
  }
};

/**
 * 2. Get Detailed Tenant Profile
 * GET /api/owner/tenants/:id
 */
const getTenantDetails = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const rentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(rentId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant / tenancy ID' });
    }

    let rent = null;
    if (mongoose.Types.ObjectId.isValid(rentId)) {
      rent = await Rent.findById(rentId)
        .populate('tenants', 'firstName lastName email phoneNumber name address createdAt')
        .populate('propertyId')
        .populate('ownerId', 'firstName lastName email phoneNumber name');
    }

    if (!rent || rent.isDeleted) {
      // Check if ID is a Request (buyer record)
      const purchaseReq = await Request.findById(rentId)
        .populate('tenantId', 'firstName lastName email phoneNumber name address createdAt')
        .populate('propertyId')
        .populate('ownerId', 'firstName lastName email phoneNumber name')
        .populate('messages.senderId', 'firstName lastName email role');

      if (!purchaseReq || purchaseReq.isDeleted) {
        return res.status(404).json({ success: false, message: 'Client / tenancy record not found' });
      }

      const property = purchaseReq.propertyId;
      const isOwner = purchaseReq.ownerId?._id?.toString() === userId.toString() ||
                      property?.ownerUserId?.toString() === userId.toString() ||
                      property?.owner?.toString() === userId.toString();

      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this client record' });
      }

      const buyerUser = purchaseReq.tenantId;

      // Fetch Payments
      const payments = await Payment.find({
        $or: [
          { requestId: purchaseReq._id },
          { propertyId: property?._id, payerId: buyerUser?._id },
          { propertyId: property?._id, userId: buyerUser?._id }
        ]
      }).sort({ createdAt: -1 });

      const verifiedPayments = payments.filter(p => p.status === 'completed');
      const verifiedPaid = verifiedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const agreedPrice = Number(
        property?.pricing?.sale ||
        property?.previousSalePricing?.salePrice ||
        purchaseReq.offer?.offeredPrice ||
        (property?.listingType === 'For Sale' ? property?.price : 0) ||
        purchaseReq.offer?.advanceAmount ||
        purchaseReq.advancePayment?.amount ||
        0
      );

      const remainingBalance = Math.max(0, agreedPrice - verifiedPaid);

      let purchaseStatus;
      const rawStatus = (purchaseReq.status || '').trim();
      const isSold = property?.status === 'Sold' || rawStatus.toLowerCase() === 'completed' || rawStatus.toLowerCase() === 'paid/completed';

      if (isSold) {
        purchaseStatus = 'Completed';
      } else if (verifiedPaid >= agreedPrice && agreedPrice > 0) {
        purchaseStatus = 'Fully Paid';
      } else if (verifiedPaid > 0 || rawStatus.toLowerCase() === 'advancepaid') {
        purchaseStatus = 'Advance Paid';
      } else if (rawStatus.toLowerCase() === 'approved' || rawStatus.toLowerCase() === 'approved – pay advance') {
        purchaseStatus = 'Approved';
      } else {
        purchaseStatus = rawStatus || 'Under Review';
      }

      const notices = await Notice.find({
        ownerId: userId,
        $or: [
          { 'recipients.tenantId': buyerUser?._id },
          { recipientType: 'property_all', propertyId: property?._id }
        ]
      }).sort({ createdAt: -1 });

      const unreadMessagesCount = computeUnreadMessagesCount(purchaseReq.messages, userId);

      return res.status(200).json({
        success: true,
        clientType: 'buyer',
        tenant: {
          _id: purchaseReq._id,
          rentId: null,
          requestId: purchaseReq._id,
          requestHumanId: purchaseReq.requestId || `REQ-${purchaseReq._id.toString().slice(-6)}`,
          clientType: 'buyer',
          unreadMessagesCount,
          messagesCount: purchaseReq.messages?.length || 0,
          user: buyerUser,
          property: property,
          term: {
            type: 'purchase',
            startDate: purchaseReq.offer?.acceptedAt || purchaseReq.createdAt,
            agreementDate: purchaseReq.offer?.acceptedAt || purchaseReq.createdAt
          },
          rent: {
            amount: agreedPrice,
            currency: 'BDT'
          },
          purchaseData: {
            agreedPrice,
            advancePaid: verifiedPaid,
            remainingBalance,
            purchaseStatus,
            deedStatus: isSold ? 'Transferred' : 'Pending Conveyance',
            advancePayment: purchaseReq.advancePayment,
            offer: purchaseReq.offer,
            payload: purchaseReq.payload,
            timeline: purchaseReq.timeline
          },
          securityDeposit: { amount: 0, held: 0 },
          moveOut: null,
          leaseStatus: purchaseStatus,
          notes: purchaseReq.offer?.specialTerms || '',
          history: purchaseReq.timeline || []
        },
        financialSummary: {
          totalBilled: agreedPrice,
          totalPaid: verifiedPaid,
          balanceDue: remainingBalance,
          currency: 'BDT',
          paymentRate: agreedPrice > 0 ? Math.round((verifiedPaid / agreedPrice) * 100) : 100
        },
        invoices: [],
        payments,
        notices
      });
    }

    // Check ownership
    const property = rent.propertyId;
    const isOwner = rent.ownerId?._id?.toString() === userId.toString() ||
                    property?.ownerUserId?.toString() === userId.toString() ||
                    property?.owner?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this tenant record' });
    }

    const tenantUser = rent.tenants && rent.tenants[0] ? rent.tenants[0] : null;

    // Fetch Invoices
    const invoices = await Invoice.find({
      $or: [
        { rentId: rent._id },
        { propertyId: property._id, billTo: tenantUser?._id }
      ]
    }).populate('payments').sort({ dueDate: -1 });

    // Fetch Payments
    const payments = await Payment.find({
      $or: [
        { rentId: rent._id },
        { propertyId: property._id, payerId: tenantUser?._id }
      ]
    }).sort({ createdAt: -1 });

    // Fetch Notices sent to this tenant
    const notices = await Notice.find({
      ownerId: userId,
      $or: [
        { rentId: rent._id },
        { 'recipients.tenantId': tenantUser?._id },
        { recipientType: 'all_tenants' },
        { recipientType: 'property_all', propertyId: property._id }
      ]
    }).sort({ createdAt: -1 });

    // Financial calculations
    let totalBilled = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    invoices.forEach(inv => {
      if (inv.status === 'void') return;
      totalBilled += (inv.total || 0);
      totalPaid += (inv.paidAmount || 0);
      const bal = inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.paidAmount || 0));
      if (bal > 0) balanceDue += bal;
    });

    // Resolve linked Request for application conversation
    let matchingRequest = null;
    if (rent.requestId) {
      matchingRequest = await Request.findById(rent.requestId)
        .populate('messages.senderId', 'firstName lastName email role');
    }
    if (!matchingRequest) {
      matchingRequest = await Request.findOne({
        $or: [
          { rentId: rent._id },
          { propertyId: property._id, tenantId: tenantUser?._id }
        ]
      })
        .populate('messages.senderId', 'firstName lastName email role')
        .sort({ createdAt: -1 });

      if (matchingRequest && !rent.requestId) {
        rent.requestId = matchingRequest._id;
        await rent.save().catch(() => {});
      }
    }

    const unreadMessagesCount = matchingRequest
      ? computeUnreadMessagesCount(matchingRequest.messages, userId)
      : 0;

    return res.status(200).json({
      success: true,
      tenant: {
        rentId: rent._id,
        requestId: matchingRequest ? matchingRequest._id : (rent.requestId || null),
        requestHumanId: matchingRequest ? matchingRequest.requestId : null,
        unreadMessagesCount,
        messagesCount: matchingRequest?.messages?.length || 0,
        user: tenantUser,
        property: property,
        term: rent.term,
        rent: rent.rent,
        securityDeposit: rent.securityDeposit,
        moveOut: rent.moveOut || null,
        billing: rent.billing,
        leaseStatus: rent.status,
        notes: rent.notes,
        history: rent.history || []
      },
      financialSummary: {
        totalBilled,
        totalPaid,
        balanceDue,
        currency: rent.rent?.currency || 'BDT',
        paymentRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100
      },
      invoices,
      payments,
      notices
    });

  } catch (error) {
    console.error('[ERROR] Error fetching tenant details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tenant details',
      error: error.message
    });
  }
};

/**
 * 3. Add New Tenant (Disabled - Workflow Enforcement)
 * POST /api/owner/tenants
 * Manual tenant creation is disabled. Tenants must apply for properties from the
 * Tenant Dashboard, and owners can review and approve applications in Request Info.
 */
const createTenant = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Manual tenant creation is disabled. Tenants must apply for properties from the Tenant Dashboard, and owners can review and approve applications in Owner Dashboard → Request Info.'
  });
};

/**
 * 4. Update Tenancy
 * PUT /api/owner/tenants/:id
 */
const updateTenant = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const rentId = req.params.id;
    const {
      monthlyRent,
      securityDeposit,
      startDate,
      endDate,
      status: tenantStatus,
      unitNumber,
      notes,
      phoneNumber,
      firstName,
      lastName
    } = req.body;

    const rent = await Rent.findById(rentId).populate('propertyId');
    if (!rent || rent.isDeleted) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    // Check ownership
    const property = rent.propertyId;
    const isOwner = rent.ownerId?.toString() === userId.toString() ||
                    property?.ownerUserId?.toString() === userId.toString() ||
                    property?.owner?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this tenant' });
    }

    // Update rent terms
    if (monthlyRent !== undefined) rent.rent.amount = Number(monthlyRent);
    if (securityDeposit !== undefined) {
      rent.securityDeposit.amount = Number(securityDeposit);
      rent.securityDeposit.held = Number(securityDeposit);
    }
    if (startDate) rent.term.startDate = new Date(startDate);
    if (endDate !== undefined) {
      rent.term.endDate = endDate ? new Date(endDate) : null;
      rent.term.type = endDate ? 'fixed' : 'month_to_month';
    }
    if (notes !== undefined) rent.notes = notes;

    const previousStatus = rent.status;
    if (tenantStatus && tenantStatus !== rent.status) {
      rent.status = tenantStatus;
      // If terminated or expired, update property status to Available
      if (['Terminated', 'Expired'].includes(tenantStatus)) {
        property.status = 'Available';
        property.currentRentId = null;
        await property.save();
      } else if (tenantStatus === 'Active') {
        property.status = 'Rented';
        property.currentRentId = rent._id;
        await property.save();
      }
    }

    await rent.save();

    // Update Property unit number if provided
    if (unitNumber && unitNumber.trim() && property) {
      property.unitNumber = unitNumber.trim();
      await property.save();
    }

    // Update tenant contact info if provided
    if (rent.tenants && rent.tenants[0]) {
      const tenantUser = await User.findById(rent.tenants[0]);
      if (tenantUser) {
        if (phoneNumber !== undefined) tenantUser.phoneNumber = phoneNumber.trim();
        if (firstName) tenantUser.firstName = firstName.trim();
        if (lastName) tenantUser.lastName = lastName.trim();
        await tenantUser.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Tenant details updated successfully',
      rent
    });

  } catch (error) {
    console.error('[ERROR] Error updating tenant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tenant details',
      error: error.message
    });
  }
};

/**
 * 5. Record Manual Payment
 * POST /api/owner/tenants/:id/payments
 */
const recordManualPayment = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const rentId = req.params.id;
    const {
      amount,
      paymentMethod,
      paymentDate,
      invoiceId,
      referenceNote,
      rentMonth
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const rent = await Rent.findById(rentId).populate('propertyId').populate('tenants');
    if (!rent || rent.isDeleted) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    // Check ownership
    const property = rent.propertyId;
    const isOwner = rent.ownerId?.toString() === userId.toString() ||
                    property?.ownerUserId?.toString() === userId.toString() ||
                    property?.owner?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to record payment for this property' });
    }

    const tenantUser = rent.tenants && rent.tenants[0] ? rent.tenants[0] : null;
    if (!tenantUser) {
      return res.status(400).json({ success: false, message: 'No tenant linked to this tenancy' });
    }

    const numAmount = Number(amount);
    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    let targetInvoice = null;
    if (invoiceId && mongoose.Types.ObjectId.isValid(invoiceId)) {
      targetInvoice = await Invoice.findById(invoiceId);
    }

    if (!targetInvoice) {
      // Find the earliest open/overdue invoice for this rent
      targetInvoice = await Invoice.findOne({
        rentId: rent._id,
        status: { $in: ['open', 'partially_paid', 'overdue'] }
      }).sort({ dueDate: 1 });
    }

    // If no existing invoice, create one for the payment record
    if (!targetInvoice) {
      const monthLabel = rentMonth || payDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      targetInvoice = new Invoice({
        rentId: rent._id,
        propertyId: property._id,
        billTo: tenantUser._id,
        billFrom: userId,
        dueDate: payDate,
        lineItems: [
          {
            type: 'rent',
            description: `Rent Payment - ${monthLabel}`,
            quantity: 1,
            unitPrice: numAmount,
            amount: numAmount
          }
        ],
        subtotal: numAmount,
        total: numAmount,
        paidAmount: 0,
        balance: numAmount,
        status: 'open',
        auto: {
          generated: true,
          source: 'manual',
          generatedAt: new Date(),
          generatedBy: userId
        }
      });
      await targetInvoice.save();
    }

    // Disallow claiming Stripe payment via manual record
    if ((paymentMethod || '').toLowerCase() === 'stripe') {
      return res.status(400).json({
        success: false,
        message: 'Manual payment recording cannot claim Stripe. Tenants must complete online payments through Stripe Checkout.'
      });
    }

    // Create Payment Record
    const paymentId = 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const newPayment = new Payment({
      paymentId,
      payerId: tenantUser._id,
      receiverId: userId,
      propertyId: property._id,
      rentId: rent._id,
      invoiceId: targetInvoice._id,
      type: 'monthly_rent',
      method: paymentMethod || 'cash',
      description: referenceNote || `Administrative rent reconciliation for ${property.title || property.address}`,
      amount: numAmount,
      currency: 'BDT',
      status: 'completed',
      metadata: {
        isAdministrativeReconciliation: true,
        reconciliationNote: 'Administrative offline reconciliation only. Not an online Stripe transaction.',
        recordedBy: userId,
        recordedAt: new Date(),
        referenceNote: referenceNote || '',
        rentMonth: rentMonth || payDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      },
      receiptData: {
        paymentId,
        propertyTitle: property.title || property.address,
        propertyAddress: property.address,
        amount: numAmount,
        currency: 'BDT',
        paymentDate: payDate,
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: 'completed',
        transactionId: referenceNote || paymentId
      }
    });

    await newPayment.save();

    // Update target invoice
    targetInvoice.paidAmount = (targetInvoice.paidAmount || 0) + numAmount;
    targetInvoice.balance = Math.max(0, targetInvoice.total - targetInvoice.paidAmount);
    targetInvoice.status = targetInvoice.balance === 0 ? 'paid' : 'partially_paid';
    if (!targetInvoice.payments) targetInvoice.payments = [];
    targetInvoice.payments.push(newPayment._id);
    await targetInvoice.save();

    // Send in-app notification to tenant
    try {
      await Notification.create({
        userId: tenantUser._id,
        title: 'Payment Received',
        message: `Your owner recorded a payment of ৳${numAmount.toLocaleString()} for ${property.title || property.address} via ${(paymentMethod || 'cash').toUpperCase()}. Receipt: ${paymentId}.`,
        type: 'payment',
        relatedId: newPayment._id,
        relatedModel: 'Payment'
      });
    } catch (notifErr) {
      console.warn('[WARN] Could not send payment notification:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: newPayment,
      invoice: targetInvoice
    });

  } catch (error) {
    console.error('[ERROR] Error recording manual payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

/**
 * 6. Get Owner's Notices
 * GET /api/owner/notices
 */
const getOwnerNotices = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { propertyId, status, noticeType } = req.query;

    const query = { ownerId: userId };
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      query.propertyId = propertyId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (noticeType && noticeType !== 'all') {
      query.noticeType = noticeType;
    }

    const notices = await Notice.find(query)
      .populate('propertyId', 'title address unitNumber')
      .populate('tenantId', 'firstName lastName email phoneNumber name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notices
    });

  } catch (error) {
    console.error('[ERROR] Error fetching owner notices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notices',
      error: error.message
    });
  }
};

/**
 * 7. Create or Send Notice
 * POST /api/owner/notices
 */
const createOrSendNotice = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const {
      noticeType,
      recipientType,
      tenantId,
      propertyId,
      subject,
      message,
      priority = 'normal',
      dueDate,
      status: requestedStatus = 'sent',
      legalDisclaimerAcknowledged = false
    } = req.body;

    // Validation
    if (!noticeType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Notice type, subject, and message are required'
      });
    }

    // Eviction / Lease Termination check
    if (noticeType === 'eviction_warning' && !legalDisclaimerAcknowledged) {
      return res.status(400).json({
        success: false,
        message: 'Eviction and lease termination notices require explicit acknowledgment of legal procedures and jurisdiction requirements.'
      });
    }

    const ownedProperties = await getOwnerPropertyIds(userId);
    const ownedPropertyIds = ownedProperties.map(p => p._id.toString());

    // Resolve target recipients
    let targetTenants = [];

    if (recipientType === 'individual') {
      if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ success: false, message: 'Recipient tenant is required for individual notice' });
      }

      const tenantUser = await User.findById(tenantId);
      if (!tenantUser) {
        return res.status(404).json({ success: false, message: 'Target tenant not found' });
      }

      // Find property title and unit for this tenant
      let propTitle = 'Property';
      let propAddr = '';
      let unitNum = '';

      if (propertyId) {
        const prop = ownedProperties.find(p => p._id.toString() === propertyId.toString());
        if (prop) {
          propTitle = prop.title || prop.address;
          propAddr = prop.address;
          unitNum = prop.unitNumber || '';
        }
      }

      targetTenants.push({
        tenantId: tenantUser._id,
        tenantName: `${tenantUser.firstName || ''} ${tenantUser.lastName || ''}`.trim() || tenantUser.name,
        tenantEmail: tenantUser.email,
        unitNumber: unitNum,
        propertyAddress: propAddr
      });

    } else if (recipientType === 'property_all') {
      if (!propertyId || !ownedPropertyIds.includes(propertyId.toString())) {
        return res.status(400).json({ success: false, message: 'Valid owned property is required' });
      }

      const prop = ownedProperties.find(p => p._id.toString() === propertyId.toString());
      const activeRents = await Rent.find({
        propertyId,
        status: 'Active',
        isDeleted: { $ne: true }
      }).populate('tenants');

      activeRents.forEach(r => {
        if (r.tenants && r.tenants[0]) {
          const t = r.tenants[0];
          targetTenants.push({
            tenantId: t._id,
            tenantName: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name,
            tenantEmail: t.email,
            unitNumber: prop?.unitNumber || '',
            propertyAddress: prop?.address || ''
          });
        }
      });

    } else if (recipientType === 'all_tenants') {
      const activeRents = await Rent.find({
        propertyId: { $in: ownedPropertyIds },
        status: 'Active',
        isDeleted: { $ne: true }
      }).populate('tenants').populate('propertyId');

      activeRents.forEach(r => {
        if (r.tenants && r.tenants[0] && r.propertyId) {
          const t = r.tenants[0];
          const p = r.propertyId;
          targetTenants.push({
            tenantId: t._id,
            tenantName: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name,
            tenantEmail: t.email,
            unitNumber: p.unitNumber || '',
            propertyAddress: p.address || ''
          });
        }
      });
    }

    // Owner name for signature
    const ownerUser = await User.findById(userId);
    const ownerDisplayName = ownerUser ? `${ownerUser.firstName || ''} ${ownerUser.lastName || ''}`.trim() : 'Property Management';

    const deliveryHistory = [];
    let isFullySent = true;

    // If requestedStatus === 'sent', dispatch to each recipient
    if (requestedStatus === 'sent') {
      for (const target of targetTenants) {
        let inAppDelivered = false;
        let notifId = null;
        let emailSent = false;
        let emailStatus = 'pending';
        let emailId = '';
        let emailErr = '';

        // 1. In-App Notification
        try {
          const notif = await Notification.create({
            userId: target.tenantId,
            title: `[Notice] ${subject}`,
            message: message,
            type: noticeType === 'urgent' || priority === 'urgent' ? 'system' : 'general'
          });
          inAppDelivered = true;
          notifId = notif._id;
        } catch (nErr) {
          console.warn(`[WARN] Could not create in-app notification for ${target.tenantEmail}:`, nErr.message);
        }

        // 2. Resend Email Delivery
        try {
          if (target.tenantEmail) {
            const emailResult = await sendTenantNoticeEmail({
              to: target.tenantEmail,
              tenantName: target.tenantName,
              noticeType,
              subject,
              message,
              priority,
              dueDate,
              propertyTitle: target.propertyAddress || 'Your Residence',
              unitNumber: target.unitNumber,
              ownerName: ownerDisplayName
            });

            if (emailResult.success) {
              emailSent = true;
              emailStatus = 'sent';
              emailId = emailResult.emailId || '';
            } else {
              emailStatus = 'failed';
              emailErr = emailResult.error || 'Email dispatch failed';
              isFullySent = false;
            }
          } else {
            emailStatus = 'skipped';
          }
        } catch (eErr) {
          emailStatus = 'failed';
          emailErr = eErr.message;
          isFullySent = false;
        }

        deliveryHistory.push({
          tenantId: target.tenantId,
          tenantName: target.tenantName,
          tenantEmail: target.tenantEmail,
          unitNumber: target.unitNumber,
          propertyAddress: target.propertyAddress,
          inAppDelivered,
          inAppNotificationId: notifId,
          emailSent,
          emailDeliveryStatus: emailStatus,
          emailId,
          emailError: emailErr,
          deliveredAt: new Date()
        });
      }
    }

    const finalStatus = requestedStatus === 'draft' ? 'draft' : (isFullySent ? 'sent' : 'partially_sent');

    const notice = new Notice({
      ownerId: userId,
      propertyId: propertyId && mongoose.Types.ObjectId.isValid(propertyId) ? propertyId : null,
      recipientType,
      tenantId: tenantId && mongoose.Types.ObjectId.isValid(tenantId) ? tenantId : null,
      noticeType,
      priority,
      subject: subject.trim(),
      message: message.trim(),
      issuedDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: finalStatus,
      requiresConfirmation: noticeType === 'eviction_warning',
      legalDisclaimerAcknowledged: !!legalDisclaimerAcknowledged,
      legalDisclaimerText: noticeType === 'eviction_warning'
        ? 'Acknowledged: This notice is an official communication and does not constitute an illegal self-help eviction. Legal notice periods and eviction procedures remain subject to jurisdiction requirements.'
        : '',
      recipients: deliveryHistory
    });

    await notice.save();

    return res.status(201).json({
      success: true,
      message: requestedStatus === 'draft' ? 'Notice saved as draft' : 'Notice dispatched successfully',
      notice
    });

  } catch (error) {
    console.error('[ERROR] Error creating/sending notice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process notice',
      error: error.message
    });
  }
};

/**
 * 8. Get Single Notice Details
 * GET /api/owner/notices/:id
 */
const getNoticeDetails = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const noticeId = req.params.id;

    const notice = await Notice.findOne({ _id: noticeId, ownerId: userId })
      .populate('propertyId', 'title address unitNumber')
      .populate('tenantId', 'firstName lastName email phoneNumber name');

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice record not found' });
    }

    return res.status(200).json({
      success: true,
      notice
    });

  } catch (error) {
    console.error('[ERROR] Error fetching notice details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notice details',
      error: error.message
    });
  }
};

/**
 * 9. Tenant submits Move-Out Notice
 * POST /api/owner/tenancy/:rentId/move-out-notice
 */
const submitMoveOutNotice = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { rentId } = req.params;
    const {
      intendedMoveOutDate,
      reason,
      forwardingPhone,
      forwardingEmail,
      forwardingAddress,
      remarks
    } = req.body;

    if (!intendedMoveOutDate) {
      return res.status(400).json({ success: false, message: 'Intended move-out date is required' });
    }

    const rent = await Rent.findById(rentId)
      .populate('propertyId', 'title address unitNumber')
      .populate('ownerId', 'firstName lastName email phoneNumber');

    if (!rent) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    // Verify tenant authorization
    const isTenant = rent.tenants.some(t => t.toString() === userId.toString());
    if (!isTenant) {
      return res.status(403).json({ success: false, message: 'Not authorized for this tenancy' });
    }

    if (rent.status !== 'Active') {
      return res.status(400).json({ success: false, message: `Cannot submit move-out notice for tenancy with status "${rent.status}"` });
    }

    // Prevent duplicate submission if an active move-out notice is already pending
    if (rent.moveOut?.noticeSubmitted && rent.moveOut?.status && !['none', 'Completed'].includes(rent.moveOut.status)) {
      return res.status(400).json({
        success: false,
        message: 'A move-out notice is already active for this tenancy. Please coordinate with your property owner.',
        moveOut: rent.moveOut
      });
    }

    const now = new Date();
    const targetDate = new Date(intendedMoveOutDate);
    const compliance = evaluateNoticeCompliance(now, targetDate, rent.term);

    if (compliance.diffDays < 1) {
      return res.status(400).json({ success: false, message: 'Move-out date must be in the future' });
    }

    rent.moveOut = rent.moveOut || {};
    rent.moveOut.noticeSubmitted = true;
    rent.moveOut.status = 'Notice Submitted';
    rent.moveOut.noticeDate = now;
    rent.moveOut.intendedMoveOutDate = targetDate;
    rent.moveOut.earliestCompliantDate = compliance.earliestCompliantDate;
    rent.moveOut.requiredNotice = compliance.requiredNoticeLabel;
    rent.moveOut.noticeDaysGiven = compliance.noticeDaysGiven;
    rent.moveOut.noticeMonthsGiven = compliance.noticeMonthsGiven;
    rent.moveOut.meetsRequirement = compliance.meetsRequirement;
    rent.moveOut.isShorterNotice = compliance.isShorterNotice;
    rent.moveOut.shortNoticeExplanation = compliance.shortNoticeExplanation;
    rent.moveOut.reason = reason ? reason.trim() : 'End of lease / Tenant requested relocation';
    rent.moveOut.forwardingPhone = forwardingPhone ? forwardingPhone.trim() : '';
    rent.moveOut.forwardingEmail = forwardingEmail ? forwardingEmail.trim() : '';
    rent.moveOut.forwardingAddress = forwardingAddress ? forwardingAddress.trim() : '';
    rent.moveOut.remarks = remarks ? remarks.trim() : '';
    rent.moveOut.ownerAcknowledged = false;
    rent.moveOut.settlementCompleted = false;

    if (!rent.moveOut.history) rent.moveOut.history = [];
    rent.moveOut.history.push({
      status: 'Notice Submitted',
      action: compliance.isShorterNotice
        ? 'Notice submitted (shorter than standard term, subject to owner review)'
        : 'Formal move-out notice submitted (compliant)',
      timestamp: now,
      actorRole: 'Tenant',
      actorId: userId,
      note: reason || remarks || 'Tenant submitted formal notice to vacate'
    });

    if (!rent.history) rent.history = [];
    rent.history.push({
      event: 'Move-Out Notice Submitted',
      status: rent.status,
      timestamp: now,
      note: `Tenant submitted move-out notice for ${targetDate.toLocaleDateString()}. Notice: ${compliance.noticeDaysGiven} days (${compliance.meetsRequirement ? 'Compliant' : 'Short notice'}).`,
      updatedBy: userId
    });

    await rent.save();

    // Notify Owner (idempotent notification)
    try {
      const tenantUser = await User.findById(userId);
      const tenantName = tenantUser ? `${tenantUser.firstName} ${tenantUser.lastName}`.trim() : 'Tenant';
      const ownerTargetId = rent.ownerId._id || rent.ownerId;
      
      await Notification.create({
        userId: ownerTargetId,
        title: `[Move-Out Notice] ${rent.propertyId?.title || 'Property Unit'}`,
        message: `${tenantName} has submitted a move-out notice for ${targetDate.toLocaleDateString()} (${compliance.noticeDaysGiven} days notice; ${compliance.meetsRequirement ? 'meets notice term' : 'shorter notice requested'}).`,
        type: 'general'
      });
    } catch (notifErr) {
      console.warn('Owner notification warning:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Move-out notice submitted successfully',
      rent,
      moveOut: rent.moveOut
    });
  } catch (error) {
    console.error('Error submitting move-out notice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. Owner acknowledges Move-Out Notice & schedules handover
 * POST /api/owner/tenants/:rentId/acknowledge-move-out
 */
const acknowledgeMoveOut = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { rentId } = req.params;
    const { handoverScheduledDate, notes } = req.body;

    const rent = await Rent.findById(rentId)
      .populate('propertyId', 'title address ownerUserId owner')
      .populate('tenants', 'firstName lastName email phoneNumber');

    if (!rent) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    const isOwner = rent.ownerId.toString() === userId.toString() ||
                    rent.propertyId?.ownerUserId?.toString() === userId.toString() ||
                    rent.propertyId?.owner?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!rent.moveOut?.noticeSubmitted) {
      return res.status(400).json({ success: false, message: 'No move-out notice has been submitted for this tenancy' });
    }

    const now = new Date();
    rent.moveOut.ownerAcknowledged = true;
    rent.moveOut.acknowledgedAt = now;
    if (handoverScheduledDate) {
      rent.moveOut.handoverScheduledDate = new Date(handoverScheduledDate);
      rent.moveOut.status = 'Inspection Scheduled';
    } else {
      rent.moveOut.status = 'Owner Acknowledged';
    }
    if (notes) {
      rent.moveOut.acknowledgmentNotes = notes;
      rent.moveOut.handoverNotes = notes;
    }

    if (!rent.moveOut.history) rent.moveOut.history = [];
    rent.moveOut.history.push({
      status: rent.moveOut.status,
      action: handoverScheduledDate
        ? `Owner acknowledged notice & scheduled inspection for ${new Date(handoverScheduledDate).toLocaleDateString()}`
        : 'Owner acknowledged move-out notice',
      timestamp: now,
      actorRole: 'Owner',
      actorId: userId,
      note: notes || 'Owner acknowledged move-out'
    });

    if (!rent.history) rent.history = [];
    rent.history.push({
      event: 'Move-Out Notice Acknowledged',
      status: rent.status,
      timestamp: now,
      note: `Owner acknowledged move-out notice.${handoverScheduledDate ? ` Inspection scheduled for ${new Date(handoverScheduledDate).toLocaleDateString()}` : ''}`,
      updatedBy: userId
    });

    await rent.save();

    // Notify tenant
    try {
      if (rent.tenants && rent.tenants.length > 0) {
        await Notification.create({
          userId: rent.tenants[0]._id,
          title: '[Move-Out Acknowledged] Handover Inspection Scheduled',
          message: `The owner has acknowledged your move-out notice.${handoverScheduledDate ? ` Handover inspection is scheduled for ${new Date(handoverScheduledDate).toLocaleDateString()}.` : ''}`,
          type: 'general'
        });
      }
    } catch (notifErr) {
      console.warn('Tenant notification warning:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Move-out notice acknowledged and handover inspection scheduled',
      rent
    });
  } catch (error) {
    console.error('Error acknowledging move-out:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 11. Owner records handover inspection
 * POST /api/owner/tenants/:rentId/record-handover
 */
const recordHandover = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { rentId } = req.params;
    const { handoverCompletedDate, handoverNotes } = req.body;

    const rent = await Rent.findById(rentId).populate('propertyId');
    if (!rent) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    const isOwner = rent.ownerId.toString() === userId.toString() ||
                    rent.propertyId?.ownerUserId?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const now = new Date();
    rent.moveOut = rent.moveOut || {};
    rent.moveOut.handoverCompletedDate = handoverCompletedDate ? new Date(handoverCompletedDate) : now;
    if (handoverNotes) {
      rent.moveOut.handoverNotes = handoverNotes;
    }
    rent.moveOut.status = 'Handover Completed';

    if (!rent.moveOut.history) rent.moveOut.history = [];
    rent.moveOut.history.push({
      status: 'Handover Completed',
      action: 'Property walkthrough and key handover completed',
      timestamp: now,
      actorRole: 'Owner',
      actorId: userId,
      note: handoverNotes || 'Handover inspection completed'
    });

    if (!rent.history) rent.history = [];
    rent.history.push({
      event: 'Handover Completed',
      status: rent.status,
      timestamp: now,
      note: 'Property walkthrough and key return completed. Proceeding to deposit settlement.',
      updatedBy: userId
    });

    await rent.save();

    return res.status(200).json({
      success: true,
      message: 'Handover inspection recorded successfully',
      rent
    });
  } catch (error) {
    console.error('Error recording handover:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 12. Owner settles security deposit deductions, processes refund, and terminates tenancy
 * POST /api/owner/tenants/:rentId/settle-deposit
 */
const settleDepositAndTerminate = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { rentId } = req.params;
    const {
      deductions = [],
      refundAmount = 0,
      method = 'Bank Transfer',
      transactionRef = '',
      note = '',
      terminateTenancy = true
    } = req.body;

    const rent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('tenants', 'firstName lastName email phoneNumber');

    if (!rent) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    const property = rent.propertyId;
    const isOwner = rent.ownerId.toString() === userId.toString() ||
                    property?.ownerUserId?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const depositHeld = Number(rent.securityDeposit?.amount || 0);

    // Reconcile outstanding unpaid invoices for this rent
    let unpaidInvoices = [];
    try {
      unpaidInvoices = (await Invoice.find({
        rentId: rent._id,
        status: { $in: ['unpaid', 'overdue', 'pending'] }
      })) || [];
    } catch (e) {
      unpaidInvoices = [];
    }
    const outstandingInvoicesTotal = Array.isArray(unpaidInvoices)
      ? unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
      : 0;

    // Calculate deductions
    let parsedDeductions = [];
    let totalDeductions = 0;
    if (Array.isArray(deductions)) {
      parsedDeductions = deductions.map(d => ({
        description: d.description || 'Deduction',
        amount: Number(d.amount || 0),
        reason: d.reason || d.category || 'General',
        deductedAt: d.date ? new Date(d.date) : new Date(),
        deductedBy: userId
      }));
      totalDeductions = parsedDeductions.reduce((sum, d) => sum + d.amount, 0);
    }

    const netRefundable = Math.max(0, depositHeld - totalDeductions);
    const parsedRefund = Number(refundAmount !== undefined ? refundAmount : netRefundable);

    let stripeRefundId = '';

    // Handle Stripe Refund if method is Stripe
    if (method && method.toLowerCase().includes('stripe')) {
      try {
        const originalPayment = await Payment.findOne({
          $or: [
            { requestId: rent.requestId, purpose: { $in: ['RENTAL_ADVANCE', 'SECURITY_DEPOSIT'] } },
            { rentId: rent._id, purpose: { $in: ['RENTAL_ADVANCE', 'SECURITY_DEPOSIT'] } }
          ],
          status: 'completed'
        });

        if (originalPayment && (originalPayment.stripeDetails?.paymentIntentId || originalPayment.externalRef)) {
          const refundResult = await StripePaymentService.processRefund({
            paymentId: originalPayment._id,
            amount: parsedRefund,
            reason: 'requested_by_customer',
            requestingUserId: userId
          });
          stripeRefundId = refundResult.refundId || '';
        } else {
          console.warn('No active Stripe charge found for original advance payment. Recording as verified manual refund.');
        }
      } catch (stripeErr) {
        console.warn('Stripe refund execution warning (recording refund details):', stripeErr.message);
      }
    }

    rent.securityDeposit = rent.securityDeposit || {};
    rent.securityDeposit.deductions = parsedDeductions;
    rent.securityDeposit.refundedAmount = (rent.securityDeposit.refundedAmount || 0) + parsedRefund;

    if (rent.securityDeposit.refundedAmount >= netRefundable) {
      rent.securityDeposit.refundStatus = 'completed';
      rent.securityDeposit.releasedAt = new Date();
    } else if (rent.securityDeposit.refundedAmount > 0) {
      rent.securityDeposit.refundStatus = 'partial';
    } else {
      rent.securityDeposit.refundStatus = 'none';
    }

    if (parsedRefund > 0) {
      if (!rent.securityDeposit.refundTransactions) {
        rent.securityDeposit.refundTransactions = [];
      }
      rent.securityDeposit.refundTransactions.push({
        amount: parsedRefund,
        method: stripeRefundId ? 'Stripe Online Refund' : method,
        transactionRef: stripeRefundId || transactionRef || `REF-${Date.now()}`,
        refundedAt: new Date(),
        note: note || (stripeRefundId ? `Stripe Refund ID: ${stripeRefundId}` : ''),
        processedBy: userId
      });
    }

    const now = new Date();
    rent.moveOut = rent.moveOut || {};
    rent.moveOut.settlementCompleted = true;
    rent.moveOut.settlementDate = now;
    rent.moveOut.status = 'Completed';
    rent.moveOut.refundStatus = rent.securityDeposit.refundStatus;
    rent.moveOut.refundStatement = {
      originalDeposit: depositHeld,
      reconciledInvoicesAmount: outstandingInvoicesTotal,
      totalDeductions,
      refundEligibleAmount: netRefundable,
      actualRefundedAmount: parsedRefund,
      refundMethod: stripeRefundId ? 'Stripe Online Refund' : method,
      stripeRefundId,
      transactionRef: stripeRefundId || transactionRef || `REF-${Date.now()}`,
      itemizedDeductions: parsedDeductions,
      preparedAt: now,
      completedAt: now,
      note
    };

    if (!rent.moveOut.history) rent.moveOut.history = [];
    rent.moveOut.history.push({
      status: 'Completed',
      action: 'Deposit settlement reconciled and refund issued',
      timestamp: now,
      actorRole: 'Owner',
      actorId: userId,
      note: `Original: ৳${depositHeld.toLocaleString()}, Deductions: ৳${totalDeductions.toLocaleString()}, Refunded: ৳${parsedRefund.toLocaleString()}`
    });

    if (!rent.history) rent.history = [];
    rent.history.push({
      event: 'Deposit Settled & Tenancy Ended',
      status: terminateTenancy ? 'Ended' : rent.status,
      timestamp: now,
      note: `Deposit settlement complete: ৳${parsedRefund.toLocaleString()} refunded.`,
      updatedBy: userId
    });

    // Terminate tenancy and release property ONLY IF terminateTenancy is true
    if (terminateTenancy) {
      rent.status = 'Ended';
      rent.term = rent.term || {};
      rent.term.actualEndDate = now;

      if (property) {
        property.status = 'Available';
        property.state = 'Available';
        property.currentRentId = null;
        property.rentedAt = null;
        property.reservedAt = null;
        property.reservedBy = null;
        if (!property.stateHistory) property.stateHistory = [];
        property.stateHistory.push({
          state: 'Available',
          status: 'Available',
          timestamp: now,
          note: `Tenancy ${rentId} concluded and deposit settled. Property returned to Available.`,
          updatedBy: userId
        });
        await property.save();
      }

      // Also update linked request timeline if any
      if (rent.requestId) {
        try {
          const linkedRequest = await Request.findById(rent.requestId);
          if (linkedRequest) {
            linkedRequest.timeline.push({
              event: 'Tenancy Concluded',
              actor: userId,
              timestamp: now,
              note: `Tenancy ended. Deposit settlement: ৳${depositHeld.toLocaleString()} original, ৳${totalDeductions.toLocaleString()} deductions, ৳${parsedRefund.toLocaleString()} refunded.`
            });
            await linkedRequest.save();
          }
        } catch (reqErr) {
          console.warn('Linked request update warning:', reqErr.message);
        }
      }
    }

    await rent.save();

    // Notify tenant
    try {
      if (rent.tenants && rent.tenants.length > 0) {
        await Notification.create({
          userId: rent.tenants[0]._id,
          title: '[Deposit Settlement] Tenancy Concluded',
          message: `Your security deposit settlement has been finalized. Original deposit: ৳${depositHeld.toLocaleString()}, Deductions: ৳${totalDeductions.toLocaleString()}, Net refunded: ৳${parsedRefund.toLocaleString()}. Tenancy has concluded.`,
          type: 'general'
        });
      }
    } catch (notifErr) {
      console.warn('Tenant notification warning:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Deposit settled and tenancy concluded successfully. Property released back to Available.',
      rent,
      property,
      refundStatement: rent.moveOut.refundStatement
    });
  } catch (error) {
    console.error('Error settling deposit and terminating tenancy:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. Owner or mutual agreement amendment (e.g. updating notice requirement from 30 to 60 days)
 * PATCH /api/owner/tenancy/:rentId/amend-terms
 */
const amendTenancyTerms = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);
    const { rentId } = req.params;
    const { noticeDays, noticePeriodMonths, amendmentNote } = req.body;

    const rent = await Rent.findById(rentId).populate('propertyId');
    if (!rent) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
    }

    const isOwner = rent.ownerId.toString() === userId.toString() ||
                    rent.propertyId?.ownerUserId?.toString() === userId.toString();
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    rent.term = rent.term || {};
    if (noticeDays !== undefined) rent.term.noticeDays = Number(noticeDays);
    if (noticePeriodMonths !== undefined) {
      rent.term.noticePeriodMonths = Number(noticePeriodMonths);
      rent.term.noticePeriodUnit = 'months';
    }

    if (!rent.history) rent.history = [];
    rent.history.push({
      event: 'Terms Amended',
      status: rent.status,
      timestamp: new Date(),
      note: amendmentNote || `Notice period amended to ${rent.term.noticePeriodMonths || 2} calendar months (${rent.term.noticeDays} days).`,
      updatedBy: userId
    });

    await rent.save();

    return res.status(200).json({
      success: true,
      message: 'Tenancy agreement terms amended successfully',
      term: rent.term
    });
  } catch (error) {
    console.error('Error amending terms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. Tenant retrieves active tenancy, lease terms, invoices, and move-out status
 * GET /api/owner/my-tenancy
 */
const getMyTenancy = async (req, res) => {
  try {
    const userId = resolveUserId(req.user);

    const rent = await Rent.findOne({
      tenants: userId,
      status: 'Active'
    })
      .populate('propertyId', 'title address unitNumber floorNumber specifications pricing price images')
      .populate('ownerId', 'firstName lastName email phoneNumber name');

    if (!rent) {
      return res.status(200).json({
        success: true,
        hasActiveTenancy: false,
        rent: null
      });
    }

    const invoices = await Invoice.find({ rentId: rent._id }).sort({ dueDate: -1 });

    return res.status(200).json({
      success: true,
      hasActiveTenancy: true,
      rent,
      invoices
    });
  } catch (error) {
    console.error('Error fetching tenant tenancy details:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOwnerTenants,
  getTenantDetails,
  createTenant,
  updateTenant,
  recordManualPayment,
  getOwnerNotices,
  createOrSendNotice,
  getNoticeDetails,
  submitMoveOutNotice,
  acknowledgeMoveOut,
  recordHandover,
  settleDepositAndTerminate,
  amendTenancyTerms,
  getMyTenancy
};
