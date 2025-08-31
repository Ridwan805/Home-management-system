const cron = require('node-cron');
const PropertyCleanupService = require('../services/propertyCleanupService');

/**
 * Periodic Property Cleanup Utility
 * 
 * This utility provides scheduled cleanup of orphaned properties that may have
 * been left in 'Rented' or 'Sold' status without active records.
 */
class PeriodicPropertyCleanup {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.cleanupStats = {
      totalRuns: 0,
      totalPropertiesChecked: 0,
      totalPropertiesReset: 0,
      lastError: null
    };
  }

  /**
   * Start the periodic cleanup scheduler
   * @param {string} cronExpression - Cron expression for scheduling (default: every 5 minutes)
   */
  start(cronExpression = '*/5 * * * *') {
    console.log(`🕐 Starting periodic property cleanup scheduler...`);
    console.log(`📅 Schedule: ${cronExpression} (every 5 minutes by default)`);
    
    // Schedule the cleanup task
    this.scheduledTask = cron.schedule(cronExpression, async () => {
      await this.runCleanup();
    }, {
      scheduled: true,
      timezone: 'Asia/Dhaka' // Bangladesh timezone
    });
    
    console.log(`✅ Periodic property cleanup scheduler started successfully`);
  }

  /**
   * Stop the periodic cleanup scheduler
   */
  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      console.log(`🛑 Periodic property cleanup scheduler stopped`);
    }
  }

  /**
   * Run the cleanup process manually
   */
  async runCleanup() {
    if (this.isRunning) {
      console.log(`⏳ Property cleanup already running, skipping this cycle...`);
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();
    
    try {
      console.log(`\n🧹 Starting scheduled property cleanup at ${this.lastRunTime.toISOString()}`);
      
      const results = await PropertyCleanupService.cleanupOrphanedProperties({
        triggeredBy: 'periodic-cleanup-scheduler',
        dryRun: false
      });
      
      // Update statistics
      this.cleanupStats.totalRuns++;
      this.cleanupStats.totalPropertiesChecked += results.propertiesChecked || 0;
      this.cleanupStats.totalPropertiesReset += results.propertiesReset || 0;
      this.cleanupStats.lastError = null;
      
      console.log(`✅ Scheduled cleanup completed:`);
      console.log(`   - Properties checked: ${results.propertiesChecked || 0}`);
      console.log(`   - Properties reset: ${results.propertiesReset || 0}`);
      console.log(`   - Duration: ${Date.now() - this.lastRunTime.getTime()}ms`);
      
      if (results.propertiesReset > 0) {
        console.log(`🔄 Reset properties: ${results.resetPropertyIds?.join(', ') || 'Unknown'}`);
      }
      
    } catch (error) {
      console.error(`❌ Error during scheduled property cleanup:`, error);
      this.cleanupStats.lastError = {
        message: error.message,
        timestamp: new Date()
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      ...this.cleanupStats,
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.scheduledTask ? this.scheduledTask.nextDate() : null
    };
  }

  /**
   * Run a dry-run cleanup to see what would be cleaned without making changes
   */
  async dryRun() {
    console.log(`🔍 Running property cleanup dry-run...`);
    
    try {
      const results = await PropertyCleanupService.cleanupOrphanedProperties({
        triggeredBy: 'manual-dry-run',
        dryRun: true
      });
      
      console.log(`📊 Dry-run results:`);
      console.log(`   - Properties that would be checked: ${results.propertiesChecked || 0}`);
      console.log(`   - Properties that would be reset: ${results.propertiesReset || 0}`);
      
      if (results.resetPropertyIds && results.resetPropertyIds.length > 0) {
        console.log(`   - Property IDs that would be reset: ${results.resetPropertyIds.join(', ')}`);
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error during dry-run:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const periodicCleanup = new PeriodicPropertyCleanup();

module.exports = periodicCleanup;

// If this file is run directly, start the cleanup scheduler
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  // Connect to MongoDB
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Start the scheduler
  periodicCleanup.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down periodic cleanup scheduler...');
    periodicCleanup.stop();
    mongoose.connection.close();
    process.exit(0);
  });
  
  console.log('🚀 Periodic property cleanup service is running...');
  console.log('Press Ctrl+C to stop');
}