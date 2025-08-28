const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/authorizeRole');
const {
  getAllBuildings,
  getBuildingsByOwner,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingPropertiesByFloor,
  getBuildingSummary,
  updateBuildingSummaries,
  searchBuildingsByLocation,
  approveBuilding,
  rejectBuilding,
  getPendingBuildings
} = require('../controllers/building.controller');

// GET /api/buildings - Retrieve all buildings with filtering
router.get('/', getAllBuildings);

// GET /api/buildings/owner - Get buildings by owner (authenticated)
router.get('/owner', auth, getBuildingsByOwner);

// GET /api/buildings/search - Search buildings by location
router.get('/search', searchBuildingsByLocation);

// GET /api/buildings/:id - Retrieve a single building by ID
router.get('/:id', getBuildingById);

// GET /api/buildings/:id/properties - Get properties within a building
router.get('/:id/properties', getBuildingPropertiesByFloor);

// GET /api/buildings/:id/summary - Get building summary
router.get('/:id/summary', getBuildingSummary);

// POST /api/buildings - Create a new building (admin and property owners)
router.post('/', auth, authorizeRole(['admin', 'property_owner']), createBuilding);

// PATCH /api/buildings/:id - Update a building (admin/manager/owner)
router.patch('/:id', auth, updateBuilding);

// PUT /api/buildings/:id/summary - Update building summary (admin/owner)
router.put('/:id/summary', auth, updateBuildingSummaries);

// DELETE /api/buildings/:id - Delete a building (admin/owner)
router.delete('/:id', auth, deleteBuilding);

// Admin approval routes
// GET /api/buildings/admin/pending - Get pending buildings for approval (admin only)
router.get('/admin/pending', auth, authorizeRole(['admin']), getPendingBuildings);

// PUT /api/buildings/:id/approve - Approve a building (admin only)
router.put('/:id/approve', auth, authorizeRole(['admin']), approveBuilding);

// PUT /api/buildings/:id/reject - Reject a building (admin only)
router.put('/:id/reject', auth, authorizeRole(['admin']), rejectBuilding);

module.exports = router;