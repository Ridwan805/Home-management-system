const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const app = express();
// Configure CORS more robustly to ensure preflight works across browsers
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost',
  'http://127.0.0.1'
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In development, you can relax this further if needed
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// Explicitly handle preflight for API routes if needed (Express 5 does not accept '*' wildcard)
// app.options('/api/*', cors());
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
// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
// Ensure uploads directory exists and serve it statically
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/api', adminRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
