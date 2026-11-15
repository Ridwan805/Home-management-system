const cron = require('node-cron');
const Request = require('../models/Request');
const Property = require('../models/Property');
const Rent = require('../models/Rent');

class OfferExpiryService {
  static isRunning = false;
  static cronTask = null;

  /**
   * Start scheduled cron job to run every 5 minutes
   */
  static start() {
    // Run immediately on start
    this.checkAndExpireOverdueOffers();

    // Schedule every 5 minutes
    this.cronTask = cron.schedule('*/5 * * * *', async () => {
      await this.checkAndExpireOverdueOffers();
    });
    console.log('⏰ OfferExpiryService cron scheduled (every 5 minutes)');
  }

  static stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
  }

  /**
   * Authoritatively checks and expires overdue offers
   * Idempotent and safe to call on demand
   */
  static async checkAndExpireOverdueOffers() {
    if (this.isRunning) {
      console.log('⏰ Offer expiry check already in progress, skipping concurrent run');
      return { skipped: true };
    }

    this.isRunning = true;
    try {
      const now = new Date();

      // Find requests with active/pending offers whose payment deadline has passed and are not paid
      const overdueRequests = await Request.find({
        status: { $in: ['Approved – Pay Advance', 'Submitted', 'Under Review', 'Offer Sent'] },
        'offer.paymentDeadline': { $lt: now },
        'offer.status': { $in: ['Sent', 'Awaiting Form', 'Awaiting Advance', 'Draft'] },
        isPaid: { $ne: true }
      });

      if (!overdueRequests || overdueRequests.length === 0) {
        return { expiredCount: 0 };
      }

      console.log(`⏰ Found ${overdueRequests.length} overdue offers to expire.`);
      let expiredCount = 0;

      for (const req of overdueRequests) {
        // Double check payment was not completed
        if (req.advancePayment?.isPaid || req.isPaid) {
          continue;
        }

        req.offer = req.offer || {};
        req.offer.status = 'Expired';
        req.status = 'Expired';

        if (req.reservation) {
          req.reservation.status = 'Expired';
          req.reservation.releasedAt = now;
        }

        req.timeline = req.timeline || [];
        req.timeline.push({
          event: 'Offer Expired & Unit Reservation Released',
          actor: req.ownerId,
          timestamp: now,
          note: `Payment deadline (${req.offer.paymentDeadline ? req.offer.paymentDeadline.toISOString() : 'N/A'}) passed without verified advance payment. Unit reservation released.`
        });

        await req.save();
        expiredCount++;

        // Release property status if no active rent and no other active reservation
        if (req.propertyId) {
          const activeRent = await Rent.findOne({
            propertyId: req.propertyId,
            status: 'Active',
            isDeleted: { $ne: true }
          });

          const otherActiveReservation = await Request.findOne({
            propertyId: req.propertyId,
            _id: { $ne: req._id },
            'reservation.status': 'Active',
            'reservation.expiresAt': { $gt: now }
          });

          if (!activeRent && !otherActiveReservation) {
            await Property.findByIdAndUpdate(req.propertyId, {
              status: 'Available',
              state: 'Available',
              $unset: { reservedAt: 1, reservedBy: 1 }
            });
            console.log(`🔓 Released property ${req.propertyId} back to Available`);
          }
        }
      }

      console.log(`⏰ Expired ${expiredCount} overdue offers successfully.`);
      return { expiredCount };
    } catch (err) {
      console.error('❌ Error in OfferExpiryService.checkAndExpireOverdueOffers:', err);
      return { expiredCount: 0, error: err.message };
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = OfferExpiryService;
