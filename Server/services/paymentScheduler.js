const cron = require('node-cron');
const PaymentStatusChecker = require('./paymentStatusChecker');

class PaymentScheduler {
  static isRunning = false;
  static task = null;
  
  /**
   * Start the payment status checker scheduler
   * Runs every 30 seconds to check for pending payments
   */
  static start() {
    if (this.isRunning) {
      console.log('⏰ Payment scheduler is already running');
      return;
    }
    
    console.log('🚀 Starting payment status scheduler...');
    
    // Run every 30 seconds
    this.task = cron.schedule('*/30 * * * * *', async () => {
      try {
        console.log('⏰ Running scheduled payment status check...');
        const result = await PaymentStatusChecker.checkPendingPayments();
        
        if (result.checked > 0) {
          console.log(`✅ Scheduled check completed: ${result.checked} payments checked`);
        }
      } catch (error) {
        console.error('❌ Error in scheduled payment check:', error.message);
      }
    }, {
      scheduled: false // Don't start immediately
    });
    
    this.task.start();
    this.isRunning = true;
    
    console.log('✅ Payment scheduler started - will check pending payments every 30 seconds');
  }
  
  /**
   * Stop the payment status checker scheduler
   */
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
  
  /**
   * Get scheduler status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.task ? 'Every 30 seconds' : null
    };
  }
  
  /**
   * Run a manual check immediately
   */
  static async runManualCheck() {
    try {
      console.log('🔍 Running manual payment status check...');
      const result = await PaymentStatusChecker.checkPendingPayments();
      console.log(`✅ Manual check completed: ${result.checked} payments checked`);
      return result;
    } catch (error) {
      console.error('❌ Error in manual payment check:', error.message);
      throw error;
    }
  }
}

module.exports = PaymentScheduler;