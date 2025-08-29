// REACTIVATED: PaymentScheduler service reactivated as guard layer
// Reason: Serves as fallback when webhooks fail or are delayed
// Date: Reactivated for redundancy and reliability

const cron = require('node-cron');
const PaymentStatusChecker = require('./paymentStatusChecker');

class PaymentScheduler {
  static isRunning = false;
  static task = null;
  
  // Start the payment status checker scheduler
  // Runs every 5 minutes to check for pending payments
  static start() {
    if (this.isRunning) {
      console.log('⏰ Payment scheduler is already running');
      return;
    }
    
    console.log('🚀 Starting payment status scheduler...');
    
    // Run every 5 minutes
    this.task = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('⏰ Running scheduled payment status check...');
        const result = await PaymentStatusChecker.checkPendingPayments();
        
        if (result.total > 0) {
          console.log(`✅ Scheduled check completed: ${result.total} payments checked (${result.checkedAdvance} advance, ${result.checkedFull} full)`);
        } else {
          console.log('✅ Scheduled check completed: No pending payments found');
        }
      } catch (error) {
        console.error('❌ Error in scheduled payment check:', error.message);
      }
    }, {
      scheduled: false // Don't start immediately
    });
    
    this.task.start();
    this.isRunning = true;
    
    console.log('✅ Payment scheduler started - will check pending payments every 5 minutes');
  }
  
  // Stop the payment status checker scheduler
  static stop() {
    if (!this.isRunning || !this.task) {
      console.log('⏰ Payment scheduler is not running');
      return;
    }
    
    this.task.stop();
    this.task = null;
    this.isRunning = false;
    
    console.log('🛑 Payment scheduler stopped');
  }
  
  // Get scheduler status
  static getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.task ? 'Every 5 minutes' : null
    };
  }
  
  // Run a manual check immediately
  static async runManualCheck() {
    try {
      console.log('🔍 Running manual payment status check...');
      const result = await PaymentStatusChecker.checkPendingPayments();
      console.log(`✅ Manual check completed: ${result.total} payments checked (${result.checkedAdvance} advance, ${result.checkedFull} full)`);
      return result;
    } catch (error) {
      console.error('❌ Error in manual payment check:', error.message);
      throw error;
    }
  }
  
  // Run a manual check for a specific payment type
  static async runManualCheckByType(paymentType = 'both') {
    try {
      console.log(`🔍 Running manual ${paymentType} payment status check...`);
      
      if (paymentType === 'both') {
        const result = await PaymentStatusChecker.checkPendingPayments();
        console.log(`✅ Manual check completed: ${result.total} payments checked (${result.checkedAdvance} advance, ${result.checkedFull} full)`);
        return result;
      } else {
        // For specific payment types, we would need to implement separate methods
        // For now, just run the full check and filter the results
        const result = await PaymentStatusChecker.checkPendingPayments();
        const filteredResult = {
          total: paymentType === 'advance' ? result.checkedAdvance : result.checkedFull,
          checkedAdvance: paymentType === 'advance' ? result.checkedAdvance : 0,
          checkedFull: paymentType === 'full' ? result.checkedFull : 0
        };
        console.log(`✅ Manual ${paymentType} check completed: ${filteredResult.total} payments checked`);
        return filteredResult;
      }
    } catch (error) {
      console.error(`❌ Error in manual ${paymentType} payment check:`, error.message);
      throw error;
    }
  }
}


module.exports = PaymentScheduler;