const mongoose = require('mongoose');
const Property = require('../models/Property');
const Request = require('../models/Request');
const Payment = require('../models/Payment');

/**
 * Migration: Add state machine fields to existing documents
 * This migration adds the new state machine fields to existing Property, Request, and Payment documents
 */
async function up() {
  console.log('Starting migration: Add state machine fields...');
  
  try {
    // Update Properties with state machine fields
    console.log('Updating Property documents...');
    const propertyUpdateResult = await Property.updateMany(
      { 
        $or: [
          { state: { $exists: false } },
          { stateHistory: { $exists: false } },
          { ownerUserId: { $exists: false } }
        ]
      },
      {
        $set: {
          state: 'Available', // Default state for existing properties
          stateHistory: [{
            state: 'Available',
            timestamp: new Date(),
            triggeredBy: 'migration',
            metadata: { reason: 'Initial state from migration' }
          }]
        },
        $rename: {
          ownerId: 'ownerUserId' // Rename ownerId to ownerUserId for consistency
        }
      }
    );
    console.log(`Updated ${propertyUpdateResult.modifiedCount} Property documents`);

    // Update Requests with state machine fields
    console.log('Updating Request documents...');
    const requestUpdateResult = await Request.updateMany(
      {
        $or: [
          { state: { $exists: false } },
          { stateHistory: { $exists: false } },
          { requestType: { $exists: false } }
        ]
      },
      {
        $set: {
          state: function() {
            // Map existing status to new state field
            const statusMap = {
              'Pending': 'Pending',
              'Approved': 'Approved',
              'Rejected': 'Rejected',
              'Paid/Completed': 'Paid/Completed',
              'Canceled': 'Canceled',
              'Expired': 'Expired',
              'Approved – Pay Advance': 'Approved – Pay Advance',
              'Payment Submitted': 'Payment Submitted'
            };
            return statusMap[this.status] || 'Pending';
          },
          requestType: 'Rent', // Default to Rent for existing requests
          stateHistory: [{
            state: function() {
              const statusMap = {
                'Pending': 'Pending',
                'Approved': 'Approved',
                'Rejected': 'Rejected',
                'Paid/Completed': 'Paid/Completed',
                'Canceled': 'Canceled',
                'Expired': 'Expired',
                'Approved – Pay Advance': 'Approved – Pay Advance',
                'Payment Submitted': 'Payment Submitted'
              };
              return statusMap[this.status] || 'Pending';
            },
            timestamp: new Date(),
            triggeredBy: 'migration',
            metadata: { reason: 'Initial state from migration' }
          }]
        }
      }
    );
    console.log(`Updated ${requestUpdateResult.modifiedCount} Request documents`);

    // Update Payments with state machine fields
    console.log('Updating Payment documents...');
    const paymentUpdateResult = await Payment.updateMany(
      {
        $or: [
          { state: { $exists: false } },
          { stateHistory: { $exists: false } },
          { paymentType: { $exists: false } }
        ]
      },
      {
        $set: {
          state: function() {
            // Map existing status to new state field
            const statusMap = {
              'Pending': 'Pending',
              'Processing': 'Processing',
              'Completed': 'Completed',
              'Failed': 'Failed',
              'Refunded': 'Refunded',
              'Canceled': 'Canceled'
            };
            return statusMap[this.status] || 'Pending';
          },
          paymentType: 'Rent', // Default to Rent for existing payments
          stateHistory: [{
            state: function() {
              const statusMap = {
                'Pending': 'Pending',
                'Processing': 'Processing',
                'Completed': 'Completed',
                'Failed': 'Failed',
                'Refunded': 'Refunded',
                'Canceled': 'Canceled'
              };
              return statusMap[this.status] || 'Pending';
            },
            timestamp: new Date(),
            triggeredBy: 'migration',
            metadata: { reason: 'Initial state from migration' }
          }]
        }
      }
    );
    console.log(`Updated ${paymentUpdateResult.modifiedCount} Payment documents`);

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: Add state machine fields...');
  
  try {
    // Remove state machine fields from Properties
    await Property.updateMany(
      {},
      {
        $unset: {
          state: '',
          stateHistory: ''
        },
        $rename: {
          ownerUserId: 'ownerId' // Rename back to ownerId
        }
      }
    );

    // Remove state machine fields from Requests
    await Request.updateMany(
      {},
      {
        $unset: {
          state: '',
          stateHistory: '',
          requestType: ''
        }
      }
    );

    // Remove state machine fields from Payments
    await Payment.updateMany(
      {},
      {
        $unset: {
          state: '',
          stateHistory: '',
          paymentType: ''
        }
      }
    );

    console.log('Rollback completed successfully!');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };