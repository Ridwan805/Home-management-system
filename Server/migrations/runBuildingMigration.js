#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BuildingNormalizationMigration = require('./buildingNormalization');

/**
 * Building Migration Runner
 * Executes the building normalization migration with proper database connection
 */

class BuildingMigrationRunner {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/dwellsync';
      
      await mongoose.connect(mongoUrl);
      this.isConnected = true;
      
      console.log('✅ Connected to MongoDB successfully');
      console.log('Database:', mongoose.connection.db.databaseName);
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  /**
   * Run the building normalization migration
   */
  async runMigration() {
    const migration = new BuildingNormalizationMigration();
    
    try {
      console.log('🚀 Starting Building Normalization Migration...');
      console.log('=' .repeat(60));
      
      await migration.migrate();
      
      console.log('=' .repeat(60));
      console.log('✅ Building normalization completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Rollback the building normalization migration
   */
  async rollbackMigration() {
    const migration = new BuildingNormalizationMigration();
    
    try {
      console.log('🔄 Starting Building Normalization Rollback...');
      console.log('=' .repeat(60));
      
      await migration.rollback();
      
      console.log('=' .repeat(60));
      console.log('✅ Building normalization rollback completed!');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Display migration status
   */
  async checkStatus() {
    try {
      const Building = require('../models/Building');
      const Property = require('../models/Property');
      const BuildingSummary = require('../models/BuildingSummary');
      
      const buildingCount = await Building.countDocuments();
      const propertyCount = await Property.countDocuments();
      const propertiesWithBuildings = await Property.countDocuments({ buildingId: { $exists: true } });
      const summaryCount = await BuildingSummary.countDocuments();
      
      console.log('📊 Migration Status:');
      console.log('=' .repeat(40));
      console.log(`Buildings created: ${buildingCount}`);
      console.log(`Total properties: ${propertyCount}`);
      console.log(`Properties linked to buildings: ${propertiesWithBuildings}`);
      console.log(`Building summaries: ${summaryCount}`);
      console.log(`Migration progress: ${propertyCount > 0 ? Math.round((propertiesWithBuildings / propertyCount) * 100) : 0}%`);
      
    } catch (error) {
      console.error('❌ Failed to check status:', error.message);
      throw error;
    }
  }

  /**
   * Main execution function
   */
  async execute(command) {
    try {
      await this.connect();
      
      switch (command) {
        case 'migrate':
        case 'up':
          await this.runMigration();
          break;
          
        case 'rollback':
        case 'down':
          await this.rollbackMigration();
          break;
          
        case 'status':
        case 'check':
          await this.checkStatus();
          break;
          
        default:
          console.log('📖 Usage:');
          console.log('  node runBuildingMigration.js migrate   - Run the migration');
          console.log('  node runBuildingMigration.js rollback  - Rollback the migration');
          console.log('  node runBuildingMigration.js status    - Check migration status');
          break;
      }
      
    } catch (error) {
      console.error('💥 Execution failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new BuildingMigrationRunner();
  const command = process.argv[2] || 'help';
  
  runner.execute(command)
    .then(() => {
      console.log('🎉 Operation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Operation failed:', error.message);
      process.exit(1);
    });
}

module.exports = BuildingMigrationRunner;