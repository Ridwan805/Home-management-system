// Property Status Logger Utility
// Provides comprehensive logging for all automatic property status updates

const fs = require('fs').promises;
const path = require('path');

class PropertyStatusLogger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.logFile = path.join(this.logDir, 'property-status-updates.log');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  /**
   * Log a property status update
   * @param {Object} logData - The log data
   * @param {string} logData.propertyId - Property ID
   * @param {string} logData.previousStatus - Previous property status
   * @param {string} logData.newStatus - New property status
   * @param {string} logData.trigger - What triggered the update (e.g., 'rent-termination', 'request-cancelled')
   * @param {string} logData.triggeredBy - User ID or system identifier
   * @param {string} logData.source - Source of the update (e.g., 'Rent.post-save', 'Request.post-save')
   * @param {Object} logData.metadata - Additional metadata
   */
  async logStatusUpdate(logData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'INFO',
      type: 'PROPERTY_STATUS_UPDATE',
      ...logData
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      // Write to file
      await fs.appendFile(this.logFile, logLine);
      
      // Also log to console with emoji for visibility
      const emoji = this.getStatusEmoji(logData.newStatus);
      console.log(`${emoji} Property ${logData.propertyId}: ${logData.previousStatus} → ${logData.newStatus} (${logData.trigger})`);
      
    } catch (error) {
      console.error('Failed to write property status log:', error);
    }
  }

  /**
   * Log a property cleanup operation
   * @param {Object} logData - The log data
   * @param {string} logData.operation - Type of cleanup operation
   * @param {number} logData.propertiesChecked - Number of properties checked
   * @param {number} logData.orphanedFound - Number of orphaned properties found
   * @param {number} logData.propertiesFixed - Number of properties fixed
   * @param {Array} logData.errors - Array of errors encountered
   * @param {string} logData.triggeredBy - Who triggered the cleanup
   */
  async logCleanupOperation(logData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'INFO',
      type: 'PROPERTY_CLEANUP_OPERATION',
      ...logData
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(this.logFile, logLine);
      
      console.log(`🧹 Cleanup completed: ${logData.propertiesFixed}/${logData.orphanedFound} properties fixed (${logData.operation})`);
      
    } catch (error) {
      console.error('Failed to write cleanup operation log:', error);
    }
  }

  /**
   * Log an error in property status management
   * @param {Object} logData - The log data
   * @param {string} logData.propertyId - Property ID
   * @param {string} logData.operation - Operation that failed
   * @param {string} logData.error - Error message
   * @param {string} logData.source - Source of the error
   */
  async logError(logData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      type: 'PROPERTY_STATUS_ERROR',
      ...logData
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(this.logFile, logLine);
      
      console.error(`❌ Property status error: ${logData.operation} failed for property ${logData.propertyId} - ${logData.error}`);
      
    } catch (error) {
      console.error('Failed to write error log:', error);
    }
  }

  /**
   * Get emoji for property status
   * @param {string} status - Property status
   * @returns {string} Emoji representing the status
   */
  getStatusEmoji(status) {
    const statusEmojis = {
      'Available': '🟢',
      'Rented': '🔵',
      'Sold': '🔴',
      'Under Review': '🟡',
      'Maintenance': '🔧'
    };
    return statusEmojis[status] || '⚪';
  }

  /**
   * Get recent logs for monitoring
   * @param {number} lines - Number of recent lines to retrieve
   * @returns {Array} Array of recent log entries
   */
  async getRecentLogs(lines = 100) {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      const logLines = data.trim().split('\n').slice(-lines);
      return logLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
    } catch (error) {
      console.error('Failed to read recent logs:', error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new PropertyStatusLogger();