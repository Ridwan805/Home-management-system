const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
// PaymentScheduler service reactivated as guard layer for webhook failures
const PaymentScheduler = require('./services/paymentScheduler');
// Invoice service for automatic invoice generation
const InvoiceService = require('./services/invoiceService');
<<<<<<< Updated upstream
=======
// Scheduled jobs service for automated tasks
const ScheduledJobsService = require('./services/scheduledJobs');
// Notification service for subscription reminders and account status changes
const notificationService = require('./services/notificationService');
// Periodic property cleanup service for orphaned properties
const PeriodicPropertyCleanup = require('./utils/periodicPropertyCleanup');
>>>>>>> Stashed changes

const app = express();
app.use(cors());
// Use conditional JSON parser to avoid interfering with Stripe webhook raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') return next();
  return express.json()(req, res, next);
});

// MongoDB connection with fallback
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/dwellsync';

mongoose.connect(mongoUrl)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Connection URL:', mongoUrl);
<<<<<<< Updated upstream
=======
    PaymentScheduler.start();
    InvoiceService.initializeCronJobs();
    ScheduledJobsService.init();
    notificationService.initializeCronJobs();
>>>>>>> Stashed changes
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Please make sure MongoDB is running or check your connection string');
  });

// Import routes
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/properties');
const buildingRoutes = require('./routes/buildings');
const adminRoutes = require('./routes/admin.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const requestRoutes = require('./routes/request.routes');
const stripeRoutes = require('./routes/stripe.routes');
const uploadRoutes = require('./routes/upload.routes');
const notificationRoutes = require('./routes/notifications');
<<<<<<< Updated upstream
=======
const debugRoutes = require('./routes/debug');
const imageServingRoutes = require('./routes/imageServing.routes');
const jobPostRoutes = require('./routes/jobPost.routes');
const securityGuardApplicationRoutes = require('./routes/securityGuardApplication.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const adminSubscriptionRoutes = require('./routes/adminSubscription.routes');
>>>>>>> Stashed changes


let requestManagementRoutes;
try {
  requestManagementRoutes = require('./routes/requestManagement.routes');

} catch (error) {
  console.error('🚨 Error loading RequestManagement routes:', error);
  throw error;
}

// Global request logging middleware
app.use((req, res, next) => {
  console.log('🌐 Incoming request:', req.method, req.url);
  next();
});

// Simple root route for testing
app.get('/', (req, res) => {
  console.log('🏠 Root route hit!');
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Special route for Stripe webhook that needs raw body
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), require('./controllers/stripe.controller').handleWebhook);

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
<<<<<<< Updated upstream
=======
app.use('/api/debug', debugRoutes);
app.use('/api/images', imageServingRoutes);
app.use('/api/job-posts', jobPostRoutes);
app.use('/api/security-guard-applications', securityGuardApplicationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin/subscription', adminSubscriptionRoutes);

>>>>>>> Stashed changes


// Request-management routes will be mounted after admin routes to avoid conflicts
// Ensure uploads directory exists and serve it statically
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Ensure tenant_pics directory exists and serve it statically
const tenantPicsDir = path.resolve(__dirname, 'tenant_pics');
if (!fs.existsSync(tenantPicsDir)) {
  fs.mkdirSync(tenantPicsDir, { recursive: true });
}
app.use('/tenant_pics', express.static(tenantPicsDir));



app.use('/api/admin', adminRoutes);

// Mount request-management routes after admin routes to avoid conflicts
app.use('/api/request-management', requestManagementRoutes);



// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }
  
  // Handle other errors
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start PaymentScheduler as guard layer (runs every 5 minutes)
  PaymentScheduler.start();
  console.log('🛡️ PaymentScheduler guard layer activated');
  
  // Initialize invoice service cron jobs
  InvoiceService.initializeCronJobs();
  console.log('🧾 Invoice service cron jobs initialized');
<<<<<<< Updated upstream
=======
  
  // Initialize scheduled jobs service (includes admin subscription invoices)
  ScheduledJobsService.init();
  console.log('📅 Scheduled jobs service initialized');
  
  // Start periodic property cleanup (runs every 15 seconds)
  PeriodicPropertyCleanup.start('*/15 * * * * *');
  console.log('🧹 Periodic property cleanup service started');
>>>>>>> Stashed changes
});
