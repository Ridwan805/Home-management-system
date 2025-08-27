const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/authorizeRole');
const {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingProperties,
  getBuildingSummary,
  updateBuildingSummary,
  searchBuildingsByLocation
} = require('../controllers/building.controller');

// GET /api/buildings - Retrieve all buildings with filtering
router.get('/', getAllBuildings);

// GET /api/buildings/search - Search buildings by location
router.get('/search', searchBuildingsByLocation);

// GET /api/buildings/:id - Retrieve a single building by ID
router.get('/:id', getBuildingById);

// GET /api/buildings/:id/properties - Get properties within a building
router.get('/:id/properties', getBuildingProperties);

// GET /api/buildings/:id/summary - Get building summary
router.get('/:id/summary', getBuildingSummary);

// POST /api/buildings - Create a new building (admin only)
router.post('/', auth, authorizeRole(['admin']), createBuilding);

// PATCH /api/buildings/:id - Update a building (admin/manager only)
router.patch('/:id', auth, authorizeRole(['admin']), updateBuilding);

// PUT /api/buildings/:id/summary - Update building summary (admin only)
router.put('/:id/summary', auth, authorizeRole(['admin']), updateBuildingSummary);

// DELETE /api/buildings/:id - Delete a building (admin only)
router.delete('/:id', auth, authorizeRole(['admin']), deleteBuilding);

module.exports = router;