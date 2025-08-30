const cron = require('node-cron');
const PropertyCleanupService = require('./propertyCleanupService');
const InvoiceService = require('./invoiceService');

class ScheduledJobsService {
  static init() {
    console.log('🕐 Initializing scheduled jobs...');
    
    // Run property cleanup daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Running scheduled property cleanup...');
        const result = await PropertyCleanupService.cleanupOrphanedProperties({
          triggeredBy: 'scheduled-job',
          source: 'daily-cleanup'
        });
        
        console.log(`✅ Scheduled cleanup completed: ${result.propertiesReset} properties reset out of ${result.propertiesChecked} checked`);
      } catch (error) {
        console.error('❌ Error in scheduled property cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Run monthly invoice generation on the 1st of each month at 1:00 AM
    cron.schedule('0 1 1 * *', async () => {
      try {
        console.log('🧾 Running scheduled monthly invoice generation...');
        await InvoiceService.generateMonthlyRentInvoices();
        console.log('✅ Monthly invoice generation completed');
      } catch (error) {
        console.error('❌ Error in scheduled invoice generation:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Mark overdue invoices daily at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('⏰ Running scheduled overdue invoice check...');
        await InvoiceService.markOverdueInvoices();
        console.log('✅ Overdue invoice check completed');
      } catch (error) {
        console.error('❌ Error in scheduled overdue invoice check:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    
    console.log('✅ Scheduled jobs initialized successfully');
  }
  
  static runManualCleanup() {
    return PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: 'manual-trigger',
      source: 'manual-cleanup'
    });
  }
}

module.exports = ScheduledJobsService;