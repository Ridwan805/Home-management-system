const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Serve images through API endpoint to bypass ORB
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists in uploads or tenant_pics or maintenance-reports
    let resolvedPath = imagePath;
    if (!fs.existsSync(resolvedPath)) {
      const altTenantPath = path.join(__dirname, '../tenant_pics', filename);
      const altReportsPath = path.join(__dirname, '../uploads/maintenance-reports', filename);
      if (fs.existsSync(altTenantPath)) {
        resolvedPath = altTenantPath;
      } else if (fs.existsSync(altReportsPath)) {
        resolvedPath = altReportsPath;
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      // Return a clean modern SVG placeholder instead of broken 404
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
      res.header('Content-Type', 'image/svg+xml');
      res.header('Cache-Control', 'public, max-age=3600');
      
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="roof" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#bg)"/>
        <g transform="translate(400, 210)" text-anchor="middle">
          <!-- House Icon -->
          <polygon points="0,-90 -90,0 -60,0 -60,80 60,80 60,0 90,0" fill="#334155" stroke="url(#roof)" stroke-width="6" stroke-linejoin="round"/>
          <rect x="-25" y="10" width="50" height="70" rx="4" fill="#1e293b"/>
          <circle cx="12" cy="45" r="4" fill="#38bdf8"/>
          <!-- Text -->
          <text y="130" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#f8fafc">Property Image</text>
          <text y="158" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" fill="#94a3b8">DwellSync Home Management</text>
        </g>
      </svg>`;
      return res.status(200).send(placeholderSvg);
    }
    
    // Set CORS headers to allow any origin
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Set headers to prevent ORB blocking
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('X-Content-Type-Options', 'nosniff');
    
    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const contentType = mimeTypes[ext] || 'image/jpeg';
    res.header('Content-Type', contentType);
    
    // Set cache headers
    res.header('Cache-Control', 'public, max-age=31536000');
    
    // Send the file
    res.sendFile(resolvedPath);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle OPTIONS requests
router.options('/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.sendStatus(200);
});

module.exports = router;