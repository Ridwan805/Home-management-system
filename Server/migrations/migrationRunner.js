const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['completed', 'failed'], default: 'completed' }
});

const Migration = mongoose.model('Migration', migrationSchema);

class MigrationRunner {
  constructor() {
    this.migrationsDir = __dirname;
  }

  /**
   * Get all migration files in order
   */
  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.match(/^\d{3}_.*\.js$/) && file !== 'migrationRunner.js')
      .sort();
    
    return files;
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations() {
    try {
      const executed = await Migration.find({ status: 'completed' }).sort({ name: 1 });
      return executed.map(m => m.name);
    } catch (error) {
      console.log('Migration tracking collection not found, assuming no migrations executed');
      return [];
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations() {
    console.log('🚀 Starting migration process...');
    
    try {
      const allMigrations = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const pendingMigrations = allMigrations.filter(migration => 
        !executedMigrations.includes(migration)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
      pendingMigrations.forEach(migration => console.log(`   - ${migration}`));
      console.log('');

      for (const migrationFile of pendingMigrations) {
        await this.runSingleMigration(migrationFile);
      }

      console.log('🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runSingleMigration(migrationFile) {
    console.log(`⏳ Running migration: ${migrationFile}`);
    
    try {
      const migrationPath = path.join(this.migrationsDir, migrationFile);
      const migration = require(migrationPath);
      
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${migrationFile} does not export an 'up' function`);
      }

      // Execute the migration
      await migration.up();
      
      // Record successful execution
      await Migration.create({
        name: migrationFile,
        status: 'completed'
      });
      
      console.log(`✅ Migration completed: ${migrationFile}`);
      
    } catch (error) {
      console.error(`❌ Migration failed: ${migrationFile}`, error);
      
      // Record failed execution
      try {
        await Migration.create({
          name: migrationFile,
          status: 'failed'
        });
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }
      
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration() {
    console.log('🔄 Rolling back last migration...');
    
    try {
      const lastMigration = await Migration.findOne({ status: 'completed' })
        .sort({ executedAt: -1 });
      
      if (!lastMigration) {
        console.log('❌ No migrations to rollback');
        return;
      }

      console.log(`⏳ Rolling back: ${lastMigration.name}`);
      
      const migrationPath = path.join(this.migrationsDir, lastMigration.name);
      const migration = require(migrationPath);
      
      if (typeof migration.down !== 'function') {
        throw new Error(`Migration ${lastMigration.name} does not export a 'down' function`);
      }

      // Execute rollback
      await migration.down();
      
      // Remove from executed migrations
      await Migration.deleteOne({ _id: lastMigration._id });
      
      console.log(`✅ Rollback completed: ${lastMigration.name}`);
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  async showStatus() {
    console.log('📊 Migration Status:');
    console.log('==================');
    
    try {
      const allMigrations = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      if (allMigrations.length === 0) {
        console.log('No migration files found');
        return;
      }

      allMigrations.forEach(migration => {
        const status = executedMigrations.includes(migration) ? '✅ Executed' : '⏳ Pending';
        console.log(`${status} - ${migration}`);
      });
      
      console.log('');
      console.log(`Total: ${allMigrations.length} migrations`);
      console.log(`Executed: ${executedMigrations.length}`);
      console.log(`Pending: ${allMigrations.length - executedMigrations.length}`);
      
    } catch (error) {
      console.error('❌ Failed to show status:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  
  async function runCommand() {
    try {
      // Connect to MongoDB if not already connected
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/home-management');
        console.log('📡 Connected to MongoDB');
      }
      
      switch (command) {
        case 'up':
        case 'migrate':
          await runner.runMigrations();
          break;
          
        case 'down':
        case 'rollback':
          await runner.rollbackLastMigration();
          break;
          
        case 'status':
          await runner.showStatus();
          break;
          
        default:
          console.log('Usage:');
          console.log('  node migrationRunner.js migrate   - Run pending migrations');
          console.log('  node migrationRunner.js rollback  - Rollback last migration');
          console.log('  node migrationRunner.js status    - Show migration status');
          break;
      }
      
    } catch (error) {
      console.error('Command failed:', error);
      process.exit(1);
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('📡 Disconnected from MongoDB');
      }
    }
  }
  
  runCommand();
}

module.exports = MigrationRunner;