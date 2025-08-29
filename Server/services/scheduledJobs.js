const cron = require('node-cron');
const PropertyCleanupService = require('./propertyCleanupService');

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