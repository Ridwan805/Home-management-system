const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { authMiddleware: auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  getAllProperties,
  getTopProperties,
  getUserProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  getPropertyAssignments,
  getTenantAssignments,
  getPropertiesByBuilding,
  getPropertiesByFloor,
  getStandaloneProperties,
  searchProperties
} = require('../controllers/property.controller');

// Simple role guard using decoded token placed by auth middleware
function authorizeRole(roles) {
  return (req, res, next) => {
    // If no specific role data on token, continue (owner flows rely on ownership checks below)
    if (!roles || roles.length === 0) return next();
    try {
      const tokenRole = req.user?.role;
      if (!tokenRole) return res.status(403).json({ error: 'Forbidden' });
      const allowed = roles.map(r => String(r).toLowerCase());
      const normalized = String(tokenRole).toLowerCase();
      
      // Debug log to help troubleshoot role issues
      console.log('Role check:', { 
        userRole: tokenRole, 
        normalizedRole: normalized, 
        allowedRoles: allowed, 
        isAllowed: allowed.includes(normalized) 
      });
      
      if (!allowed.includes(normalized)) return res.status(403).json({ error: 'Forbidden' });
      return next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save into Server/uploads regardless of where the process was started
    cb(null, path.resolve(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

// GET /api/properties - Retrieve all properties with filtering
router.get('/', getAllProperties);

// GET /api/properties/top - Retrieve latest 5 Available properties for homepage
router.get('/top', getTopProperties);

// GET /api/properties/user - Retrieve properties for the logged-in user
router.get('/user', auth, getUserProperties);

// GET /api/properties/search - Advanced property search
router.get('/search', searchProperties);

<<<<<<< Updated upstream
=======
// GET /api/properties/check-combination - Check if building-unit-floor combination exists
// router.get('/check-combination', auth, checkCombination); // Function not implemented

>>>>>>> Stashed changes
// GET /api/properties/standalone - Get standalone properties
router.get('/standalone', getStandaloneProperties);

// GET /api/properties/building/:buildingId - Get properties by building
router.get('/building/:buildingId', getPropertiesByBuilding);

// GET /api/properties/building/:buildingId/floor/:floorNumber - Get properties by floor
router.get('/building/:buildingId/floor/:floorNumber', getPropertiesByFloor);

// GET /api/properties/assignments - Get property assignments for owners
router.get('/assignments', auth, authorizeRole(['owner', 'admin']), getPropertyAssignments);

// GET /api/properties/my-assignments - Get tenant's assigned properties
router.get('/my-assignments', auth, authorizeRole(['tenant', 'admin']), getTenantAssignments);

<<<<<<< Updated upstream
=======
// GET /api/properties/tenant/:propertyId/details - Get detailed property info with ownership history for tenants
// router.get('/tenant/:propertyId/details', auth, authorizeRole(['tenant', 'admin']), getTenantPropertyDetails); // Function not implemented

>>>>>>> Stashed changes
// GET /api/properties/:id - Retrieve a single property by ID
router.get('/:id', getPropertyById);

// POST /api/properties - Create a new property (owner/admin only) with file uploads
router.post(
  '/',
  auth,
  authorizeRole(['owner', 'admin']),
  upload.array('images', 10),
  createProperty
);

// PATCH /api/properties/:id - Update property (owner/admin only)
router.patch('/:id', auth, authorizeRole(['owner', 'admin']), updateProperty);

// PUT /api/properties/:id/status - Update property status (owner/admin only)
router.put('/:id/status', auth, authorizeRole(['owner', 'admin']), updatePropertyStatus);

// DELETE /api/properties/:id - Delete property (owner/admin only)
router.delete('/:id', auth, authorizeRole(['owner', 'admin']), deleteProperty);

// GET /api/properties/assignments - Get property assignments for owners
router.get('/assignments', auth, authorizeRole(['owner', 'admin']), getPropertyAssignments);

// GET /api/properties/my-assignments - Get tenant's assigned properties
router.get('/my-assignments', auth, authorizeRole(['tenant', 'admin']), getTenantAssignments);

module.exports = router;