# Database Migrations

This directory contains database migration scripts for the Home Management System. Migrations help you safely update your database schema and data when upgrading the application.

## Overview

The migration system includes:
- **State Machine Fields Migration**: Adds new state machine fields to existing Property, Request, and Payment documents
- **Summary Models Initialization**: Creates UserLedgerSummary and RentBalance documents from existing data
- **Migration Runner**: Tracks and executes migrations in order

## Migration Files

### 001_add_state_machine_fields.js
Adds state machine functionality to existing models:
- Adds `state`, `stateHistory` fields to Property, Request, and Payment models
- Renames `ownerId` to `ownerUserId` in Property model for consistency
- Sets default states based on existing status values
- Adds `requestType` field to Request model (defaults to 'Rent')
- Adds `paymentType` field to Payment model (defaults to 'Rent')

### 002_initialize_summary_models.js
Initializes summary models with existing data:
- Creates UserLedgerSummary documents for all users
- Calculates totals from existing payments and invoices
- Creates RentBalance documents for active rent contracts
- Computes balances from existing invoice and payment data

## Usage

### Prerequisites
1. Ensure MongoDB is running
2. Set the `MONGODB_URI` environment variable or use default `mongodb://localhost:27017/home-management`
3. Navigate to the migrations directory

### Running Migrations

```bash
# Navigate to migrations directory
cd Server/migrations

# Run all pending migrations
node migrationRunner.js migrate

# Check migration status
node migrationRunner.js status

# Rollback the last migration (if needed)
node migrationRunner.js rollback
```

### Migration Commands

- `migrate` or `up`: Runs all pending migrations in order
- `rollback` or `down`: Rolls back the last executed migration
- `status`: Shows which migrations have been executed and which are pending

## Migration Process

1. **Backup your database** before running migrations
2. Run `node migrationRunner.js status` to see pending migrations
3. Run `node migrationRunner.js migrate` to execute pending migrations
4. Verify the migration results in your database

## Migration Tracking

The system automatically tracks executed migrations in a `migrations` collection. Each migration record includes:
- `name`: Migration file name
- `executedAt`: Execution timestamp
- `status`: 'completed' or 'failed'

## Safety Features

- **Idempotent**: Migrations can be run multiple times safely
- **Tracking**: Prevents re-execution of completed migrations
- **Rollback**: Each migration includes a rollback function
- **Error Handling**: Failed migrations are recorded and don't block future runs

## Creating New Migrations

1. Create a new file with format: `XXX_description.js` (where XXX is the next sequential number)
2. Export `up` and `down` functions:

```javascript
async function up() {
  // Migration logic here
  console.log('Running migration...');
}

async function down() {
  // Rollback logic here
  console.log('Rolling back migration...');
}

module.exports = { up, down };
```

## Important Notes

- **Always backup your database** before running migrations
- Test migrations on a development environment first
- Migrations modify existing data - ensure you understand the changes
- The migration runner connects to MongoDB using the same connection string as your application
- Failed migrations are logged but don't prevent future migration attempts

## Troubleshooting

### Migration Fails
1. Check the error message in the console
2. Verify database connectivity
3. Ensure required models are properly imported
4. Check for data inconsistencies that might prevent migration

### Rollback Issues
1. Ensure the migration has a proper `down` function
2. Some changes (like data transformations) may not be fully reversible
3. Consider manual cleanup if automatic rollback fails

### Connection Issues
1. Verify `MONGODB_URI` environment variable
2. Ensure MongoDB is running and accessible
3. Check network connectivity and authentication

## Example Output

```
🚀 Starting migration process...
📋 Found 2 pending migrations:
   - 001_add_state_machine_fields.js
   - 002_initialize_summary_models.js

⏳ Running migration: 001_add_state_machine_fields.js
Starting migration: Add state machine fields...
Updating Property documents...
Updated 15 Property documents
Updating Request documents...
Updated 8 Request documents
Updating Payment documents...
Updated 12 Payment documents
Migration completed successfully!
✅ Migration completed: 001_add_state_machine_fields.js

⏳ Running migration: 002_initialize_summary_models.js
Starting migration: Initialize summary models...
Initializing UserLedgerSummary documents...
Created 25 UserLedgerSummary documents
Initializing RentBalance documents...
Created 18 RentBalance documents
Migration completed successfully!
✅ Migration completed: 002_initialize_summary_models.js

🎉 All migrations completed successfully!
```