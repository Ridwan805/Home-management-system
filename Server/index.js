const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection with fallback
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/dwellsync';

mongoose.connect(mongoUrl)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Connection URL:', mongoUrl);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Please make sure MongoDB is running or check your connection string');
  });

// Import routes
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/properties');
const adminRoutes = require('./routes/admin.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const requestRoutes = require('./routes/request.routes');
const stripeRoutes = require('./routes/stripe.routes');
const uploadRoutes = require('./routes/upload.routes');
const notificationRoutes = require('./routes/notifications');
let requestManagementRoutes;
try {
  requestManagementRoutes = require('./routes/requestManagement.routes');
  console.log('🔧 RequestManagement routes module loaded successfully');
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

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
console.log('🔧 Mounting request-management routes at /api/request-management');
console.log('🔧 requestManagementRoutes value:', requestManagementRoutes);
console.log('🔧 requestManagementRoutes type:', typeof requestManagementRoutes);
// Request-management routes will be mounted after admin routes to avoid conflicts
// Ensure uploads directory exists and serve it statically
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Test endpoint to verify server is working (BEFORE admin routes)
app.get('/api/request-management/test-direct', (req, res) => {
  console.log('🔧 Direct test route hit!');
  res.json({ message: 'Direct test route working!', timestamp: new Date().toISOString() });
});

app.use('/api/admin', adminRoutes);

// Mount request-management routes after admin routes to avoid conflicts
console.log('🔧 Re-mounting request-management routes at /api/request-management');
app.use('/api/request-management', (req, res, next) => {
  console.log('🔧 Request to /api/request-management:', req.method, req.url);
  next();
}, requestManagementRoutes);

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
