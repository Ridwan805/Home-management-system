// Use public DNS only on Windows machines where local ISP DNS may fail MongoDB Atlas SRV lookups
// In cloud environments (Linux/Render/Docker), let the OS system resolver handle DNS.
if (process.platform === 'win32' && process.env.NODE_ENV !== 'production') {
  try {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (dnsErr) {
    console.warn('⚠️ Could not set custom DNS servers:', dnsErr.message);
  }
}

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

// Configure CORS to allow specific origins from environment variables
const FRONTEND_URL = process.env.FRONTEND_URL;
const CLIENT_URL = process.env.CLIENT_URL;
const defaultLocal = 'http://localhost:5173'; // Vite dev default
const allowedOrigins = [FRONTEND_URL, CLIENT_URL, defaultLocal].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server, mobile clients, curl)
    if (!origin) return callback(null, true);
    
    let isAllowed = false;
    try {
      if (allowedOrigins.includes(origin)) {
        isAllowed = true;
      } else {
        const url = new URL(origin);
        const host = url.hostname;
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '0.0.0.0' ||
          host.endsWith('.vercel.app') ||
          host === 'vercel.app' ||
          host.endsWith('.onrender.com')
        ) {
          isAllowed = true;
        }
      }
    } catch (e) {
      isAllowed = allowedOrigins.includes(origin);
    }

    if (isAllowed) return callback(null, true);
    // Otherwise reject
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control', 'Access-Control-Request-Private-Network'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

// Add preflight handling for all routes
app.options('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Access-Control-Request-Private-Network');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.headers['access-control-request-private-network']) {
    res.header('Access-Control-Allow-Private-Network', 'true');
  }
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

// MongoDB connection with fallback and robust cloud sanitization
let rawMongoUrl = (process.env.MONGO_URL || '').trim();
if (rawMongoUrl.startsWith('MONGO_URL=')) {
  rawMongoUrl = rawMongoUrl.replace(/^MONGO_URL=/, '').trim();
}
rawMongoUrl = rawMongoUrl.replace(/^["']+|["']+$/g, '').trim();

const mongoUrl = rawMongoUrl || 'mongodb://localhost:27017/dwellsync';

const maskedUrl = mongoUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
console.log(`🔌 Connecting to MongoDB: ${maskedUrl}`);

mongoose.connect(mongoUrl, {
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of hanging indefinitely
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db ? mongoose.connection.db.databaseName : 'connected');
    PaymentScheduler.start();
    InvoiceService.initializeCronJobs();
    ScheduledJobsService.init();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Hint: Check MongoDB Atlas IP Access List (Whitelist 0.0.0.0/0 on cloud hosts like Render) and verify MONGO_URL in Render environment settings.');
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
const parcelLogRoutes = require('./routes/parcelLog.routes');
const visitorLogRoutes = require('./routes/visitorLog.routes');
const quickDialRoutes = require('./routes/quickDial.routes');


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
  const clientBuildPath = path.resolve(__dirname, '..', 'vite-project', 'dist');
  console.log('NODE_ENV=', process.env.NODE_ENV, 'distExists=', fs.existsSync(clientBuildPath), 'clientBuildPath=', clientBuildPath);
  if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
    console.log('Serving index.html from build');
    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
// Parcel log routes for parcel logging by security guards and tenants
app.use('/api/parcel-logs', parcelLogRoutes);
// Visitor log routes
app.use('/api/visitor-logs', visitorLogRoutes);
// Quick dial routes
app.use('/api/quick-dial', quickDialRoutes);



// Request-management routes will be mounted after admin routes to avoid conflicts
// Ensure uploads directory exists and serve it statically
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
// Fallback for missing uploads: serve placeholder through imageServingRoutes
app.use('/uploads', imageServingRoutes);

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

// Serve frontend build in production (Vite build output)
const clientBuildPath = path.resolve(__dirname, '..', 'vite-project', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
  console.log('📦 Serving frontend from', clientBuildPath);
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    // Let API routes be handled normally
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

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

const port = process.env.PORT || 5001; // Your local fallback port

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  
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
