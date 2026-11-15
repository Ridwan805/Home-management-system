const mongoose = require('mongoose');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Notice = require('../models/Notice');
const { sendTenantNoticeEmail } = require('../services/emailService');

/**
 * Helper: Find all property IDs owned by user
 */
const getOwnerPropertyIds = async (userId) => {
  const properties = await Property.find({
    $or: [
      { ownerUserId: userId },
      { owner: userId },
      { ownerId: userId }
    ]
  }).select('_id title address unitNumber propertyType specifications pricing status');
  return properties;
};

/**
 * 1. Get Owner's Tenants with Stats and Filters
 * GET /api/owner/tenants
 */
const getOwnerTenants = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, propertyId, status, paymentStatus } = req.query;

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

    // Build query for Rents associated with owner's properties or ownerId
    const rentQuery = {
      $or: [
        { propertyId: { $in: ownedPropertyIds } },
        { ownerId: userId }
      ],
      isDeleted: { $ne: true }
    };

    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      rentQuery.propertyId = propertyId;
    }

    if (status && status !== 'all') {
      rentQuery.status = status;
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

      if (rentInvoices.length > 0) {
        rentInvoices.forEach(inv => {
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

        const latestInv = rentInvoices[0];
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
        // If no invoices yet, check if rent is active
        latestInvoiceStatus = rent.status === 'Active' ? 'Pending' : 'Paid';
      }

      if (rent.status === 'Active') {
        totalOutstanding += rentOutstanding;
      }

      const record = {
        _id: rent._id,
        rentId: rent._id,
        tenantId: tenantUser._id,
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

    // Apply text search if provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      tenantRecords = tenantRecords.filter(t => 
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
      tenantRecords = tenantRecords.filter(t => t.paymentStatus.toLowerCase() === paymentStatus.toLowerCase());
    }

    const summary = {
      totalTenants: distinctTenantIds.size,
      occupiedApartments: occupiedPropertyIds.size,
      outstandingRent: totalOutstanding,
      activeNotices: activeNoticesCount
    };

    return res.status(200).json({
      success: true,
      summary,
      tenants: tenantRecords,
      properties: ownedProperties.map(p => ({
        _id: p._id,
        title: p.title || p.address,
        address: p.address,
        unitNumber: p.unitNumber || 'Unit 1',
        status: p.status
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching owner tenants:', error);
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
    const userId = req.user.userId;
    const rentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(rentId)) {
      return res.status(400).json({ success: false, message: 'Invalid tenant / tenancy ID' });
    }

    const rent = await Rent.findById(rentId)
      .populate('tenants', 'firstName lastName email phoneNumber name address createdAt')
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email phoneNumber name');

    if (!rent || rent.isDeleted) {
      return res.status(404).json({ success: false, message: 'Tenancy record not found' });
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
      totalBilled += (inv.total || 0);
      totalPaid += (inv.paidAmount || 0);
      const bal = inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.paidAmount || 0));
      if (bal > 0) balanceDue += bal;
    });

    return res.status(200).json({
      success: true,
      tenant: {
        rentId: rent._id,
        user: tenantUser,
        property: property,
        term: rent.term,
        rent: rent.rent,
        securityDeposit: rent.securityDeposit,
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
    console.error('❌ Error fetching tenant details:', error);
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
    const userId = req.user.userId;
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
    console.error('❌ Error updating tenant:', error);
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
    const userId = req.user.userId;
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

    // Create Payment Record
    const paymentId = 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const newPayment = new Payment({
      paymentId,
      payerId: tenantUser._id,
      receiverId: userId,
      propertyId: property._id,
      rentId: rent._id,
      invoiceId: targetInvoice._id,
      paymentType: 'monthly_rent',
      paymentMethod: paymentMethod || 'cash',
      amount: numAmount,
      currency: 'BDT',
      status: 'completed',
      metadata: {
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
      console.warn('⚠️ Could not send payment notification:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: newPayment,
      invoice: targetInvoice
    });

  } catch (error) {
    console.error('❌ Error recording manual payment:', error);
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
    const userId = req.user.userId;
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
    console.error('❌ Error fetching owner notices:', error);
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
    const userId = req.user.userId;
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
          console.warn(`⚠️ Could not create in-app notification for ${target.tenantEmail}:`, nErr.message);
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
    console.error('❌ Error creating/sending notice:', error);
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
    const userId = req.user.userId;
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
    console.error('❌ Error fetching notice details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notice details',
      error: error.message
    });
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
  getNoticeDetails
};
