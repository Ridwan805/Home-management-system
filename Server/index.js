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
// Scheduled jobs service for automated tasks
const ScheduledJobsService = require('./services/scheduledJobs');
// Periodic property cleanup service for orphaned properties
// const PeriodicPropertyCleanup = require('./utils/periodicPropertyCleanup');

const app = express();

// Configure CORS to allow any origin from any port
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

// Add preflight handling for all routes
app.options('*', cors());

// Add specific preflight handling for API routes
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Handle OPTIONS requests for uploads
app.options('/uploads/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.sendStatus(200);
});

// Add specific headers for static file serving
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for image files
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Set Cross-Origin-Resource-Policy to allow cross-origin access
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Set Cross-Origin-Embedder-Policy to allow embedding
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Set Cache-Control to prevent caching issues
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  // Set proper content type for images
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    const ext = path.extname(req.path).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    res.header('Content-Type', mimeTypes[ext] || 'image/jpeg');
  }
  
  next();
});
// Use conditional JSON parser to avoid interfering with Stripe webhook raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') return next();
  return express.json()(req, res, next);
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 Incoming request: ${req.method} ${req.originalUrl}`);
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('Query parameters:', req.query);
  }
  if (req.headers.authorization) {
    console.log('Authorization header present');
  }
  next();
});

// MongoDB connection with fallback
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/dwellsync';

mongoose.connect(mongoUrl)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Connection URL:', mongoUrl);
    PaymentScheduler.start();
    InvoiceService.initializeCronJobs();
    ScheduledJobsService.init();
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
const maintenanceReportRoutes = require('./routes/maintenanceReport.routes');

const imageServingRoutes = require('./routes/imageServing.routes');
const jobPostRoutes = require('./routes/jobPost.routes');
const securityGuardApplicationRoutes = require('./routes/securityGuardApplication.routes');
const securityGuardPaymentRoutes = require('./routes/securityGuardPayment.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');


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
app.use('/api/maintenance-reports', maintenanceReportRoutes);

app.use('/api/images', imageServingRoutes);
app.use('/api/job-posts', jobPostRoutes);
app.use('/api/security-guard-applications', securityGuardApplicationRoutes);
app.use('/api/security-guard-payments', securityGuardPaymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);



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
// Add headers for tenant_pics static files
app.use('/tenant_pics', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});
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
  
  // Start periodic property cleanup (runs every 5 minutes)
  // PeriodicPropertyCleanup.start('*/5 * * * *');
  // console.log('🧹 Periodic property cleanup service started (every 5 minutes)');
});
