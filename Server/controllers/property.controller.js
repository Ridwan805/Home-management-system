const Property = require('../models/Property');

// Get all properties (public route)
const getAllProperties = async (req, res) => {
  try {
    console.log('Query parameters:', req.query);
    
    // Build filter object
    const filter = {
      status: { 
        $in: ['Available', 'Sold', 'Rented', 'Not Available'] 
      }
    };
    
    // Add listingType filter if provided
     if (req.query.listingType && req.query.listingType !== 'All') {
       filter.listingType = req.query.listingType;
       console.log(`Filtering by listingType: ${req.query.listingType}`);
       console.log('Filter after adding listingType:', JSON.stringify(filter));
     }

     // Add price range filters if provided
     if (req.query.minPrice) {
       filter.price = { ...filter.price, $gte: Number(req.query.minPrice) };
     }
     if (req.query.maxPrice) {
       filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };
     }
     
     // Add bedroom filters if provided
     if (req.query.minBedrooms) {
       filter.bedrooms = { ...filter.bedrooms, $gte: Number(req.query.minBedrooms) };
     }
     if (req.query.maxBedrooms) {
       filter.bedrooms = { ...filter.bedrooms, $lte: Number(req.query.maxBedrooms) };
     }
     
     // Add location filters if provided
     if (req.query.city) {
       filter.city = { $regex: new RegExp(req.query.city, 'i') };
     }
     if (req.query.state) {
       filter.state = { $regex: new RegExp(req.query.state, 'i') };
     }
     if (req.query.zipCode) {
       filter.zipCode = { $regex: new RegExp(req.query.zipCode, 'i') };
     }
    
    console.log('Final filter (before query):', JSON.stringify(filter));
    const properties = await Property.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${properties.length} properties matching criteria`);
    console.log('Properties returned from DB:', properties.map(p => ({ id: p._id, listingType: p.listingType })));
    
    // Log the properties being sent in the response
    console.log('Sending properties with listingTypes:', properties.map(p => ({ id: p._id, listingType: p.listingType })));
    
    res.json(properties);
    console.log('Response sent with properties:', properties.map(p => ({ id: p._id, listingType: p.listingType })));
  } catch (err) {
    console.error('Error in getAllProperties:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Get top 5 properties for homepage
const getTopProperties = async (req, res) => {
  try {
    console.log('🔍 getTopProperties called - looking for Available properties...');
    
    const properties = await Property.find({ 
      status: 'Available' 
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`📊 Found ${properties.length} Available properties for homepage`);
    if (properties.length > 0) {
      console.log('Sample property:', JSON.stringify(properties[0], null, 2));
    }
    
    res.json(properties);
  } catch (err) {
    console.error('❌ Error in getTopProperties:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Get properties for a specific user
const getUserProperties = async (req, res) => {
  try {
    console.log('Fetching properties for user:', req.user.userId);
    console.log('User object from token:', JSON.stringify(req.user, null, 2));
    
    // First check if any properties exist with this owner
    const ownerProperties = await Property.find({ owner: req.user.userId });
    console.log('Properties with owner field:', ownerProperties.length);
    if (ownerProperties.length > 0) {
      console.log('Sample property with owner field:', JSON.stringify(ownerProperties[0], null, 2));
    }
    
    // Then check if any properties exist with this ownerId
    const ownerIdProperties = await Property.find({ ownerId: req.user.userId });
    console.log('Properties with ownerId field:', ownerIdProperties.length);
    if (ownerIdProperties.length > 0) {
      console.log('Sample property with ownerId field:', JSON.stringify(ownerIdProperties[0], null, 2));
    }
    
    // Use $or to match either owner or ownerId field
    const properties = await Property.find({
      $or: [
        { owner: req.user.userId },
        { ownerId: req.user.userId }
      ]
    }).sort({ createdAt: -1 });
    
    console.log('Found properties total:', properties.length);
    if (properties.length > 0) {
      console.log('Sample property:', JSON.stringify(properties[0], null, 2));
    } else {
      console.log('No properties found for this user');
      
      // Get all properties to check if there are any in the database
      const allProperties = await Property.find({});
      console.log('Total properties in database:', allProperties.length);
      if (allProperties.length > 0) {
        console.log('Sample property from database:', JSON.stringify(allProperties[0], null, 2));
      }
    }
    
    res.json(properties);
  } catch (err) {
    console.error('Error in getUserProperties:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};


const createProperty = async (req, res) => {
  try {
    // Combine fields from req.body and add ownerId and status
    const propertyData = {
      ...req.body,
      owner: req.user.userId,
      ownerId: req.user.userId,
      status: 'pending',
    };

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }
    propertyData.images = imageUrls;

    // Create new Property
    const property = new Property(propertyData);
    await property.save();

    res.status(201).json({
      message: 'Property created successfully and is pending admin approval',
      property
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};


// Get property by ID
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user owns the property
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    
    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Delete property
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user owns the property
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }
    
    await Property.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Update property status
const updatePropertyStatus = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user owns the property
    if (String(property.owner) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    // Only allow status updates
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Validate status values
    const validStatuses = ['Available', 'Not Available', 'Sold', 'Rented', 'pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    res.json({
      message: 'Property status updated successfully',
      property: updatedProperty
    });
  } catch (err) {
    console.error('Error updating property status:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = {
  getAllProperties,
  getTopProperties,
  getUserProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  updatePropertyStatus,
  deleteProperty
};