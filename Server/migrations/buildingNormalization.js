const mongoose = require('mongoose');
const Property = require('../models/Property');
const Building = require('../models/Building');
const BuildingSummary = require('../models/BuildingSummary');

/**
 * Migration script for Building normalization
 * This script helps transition existing property data to the new Building-Property structure
 */

class BuildingNormalizationMigration {
  constructor() {
    this.buildingMap = new Map(); // Cache for created buildings
  }

  /**
   * Main migration function
   */
  async migrate() {
    try {
      console.log('🚀 Starting Building normalization migration...');
      
      // Step 1: Analyze existing properties
      const properties = await Property.find({});
      console.log(`📊 Found ${properties.length} properties to analyze`);
      
      // Step 2: Group properties by address to identify buildings
      const addressGroups = this.groupPropertiesByAddress(properties);
      console.log(`🏢 Identified ${addressGroups.size} unique addresses`);
      
      // Step 3: Create buildings for multi-unit addresses
      await this.createBuildings(addressGroups);
      
      // Step 4: Update properties with building references
      await this.updatePropertiesWithBuildings(properties);
      
      // Step 5: Generate building summaries
      await this.generateBuildingSummaries();
      
      console.log('✅ Building normalization migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Group properties by full address
   */
  groupPropertiesByAddress(properties) {
    const addressGroups = new Map();
    
    properties.forEach(property => {
      // Create a normalized address key
      const addressKey = this.normalizeAddress({
        street: property.street || property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode
      });
      
      if (!addressGroups.has(addressKey)) {
        addressGroups.set(addressKey, {
          address: {
            street: property.street || property.address,
            city: property.city,
            state: property.state,
            zipCode: property.zipCode
          },
          properties: []
        });
      }
      
      addressGroups.get(addressKey).properties.push(property);
    });
    
    return addressGroups;
  }

  /**
   * Normalize address for consistent grouping
   */
  normalizeAddress(address) {
    const street = (address.street || '').toLowerCase().trim();
    const city = (address.city || '').toLowerCase().trim();
    const state = (address.state || '').toLowerCase().trim();
    const zipCode = (address.zipCode || '').toString().trim();
    
    return `${street}|${city}|${state}|${zipCode}`;
  }

  /**
   * Create buildings for addresses with multiple units or specific property types
   */
  async createBuildings(addressGroups) {
    console.log('🏗️ Creating buildings...');
    
    for (const [addressKey, group] of addressGroups) {
      const { address, properties } = group;
      
      // Create building if:
      // 1. Multiple properties at same address, OR
      // 2. Property type suggests it's part of a building (apartment_unit, floor, etc.)
      const shouldCreateBuilding = properties.length > 1 || 
        properties.some(p => ['apartment_unit', 'floor', 'condo', 'penthouse'].includes(p.propertyType));
      
      if (shouldCreateBuilding) {
        const building = await this.createBuilding(address, properties);
        this.buildingMap.set(addressKey, building._id);
        console.log(`🏢 Created building: ${building.name} at ${building.address.street}`);
      }
    }
  }

  /**
   * Create a single building
   */
  async createBuilding(address, properties) {
    // Generate building name
    const buildingName = this.generateBuildingName(address, properties);
    
    // Aggregate amenities from properties
    const amenities = this.aggregateAmenities(properties);
    
    // Determine building type
    const buildingType = this.determineBuildingType(properties);
    
    const buildingData = {
      name: buildingName,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: 'Bangladesh' // Default country
      },
      buildingType,
      amenities,
      totalFloors: this.calculateTotalFloors(properties),
      totalUnits: properties.length,
      yearBuilt: this.extractYearBuilt(properties),
      description: `Migrated building with ${properties.length} units`,
      policies: {
        petPolicy: 'Contact management',
        smokingPolicy: 'Contact management',
        guestPolicy: 'Contact management'
      }
    };
    
    return await Building.create(buildingData);
  }

  /**
   * Generate building name from address
   */
  generateBuildingName(address, properties) {
    const streetName = address.street || 'Unknown Street';
    const propertyTypes = [...new Set(properties.map(p => p.propertyType || 'residential'))];
    
    if (propertyTypes.includes('apartment_unit') || propertyTypes.includes('condo')) {
      return `${streetName} Apartments`;
    } else if (propertyTypes.includes('office')) {
      return `${streetName} Office Complex`;
    } else if (propertyTypes.includes('retail')) {
      return `${streetName} Commercial Center`;
    } else {
      return `${streetName} Building`;
    }
  }

  /**
   * Aggregate amenities from properties
   */
  aggregateAmenities(properties) {
    const amenitiesSet = new Set();
    
    properties.forEach(property => {
      if (property.amenities && Array.isArray(property.amenities)) {
        property.amenities.forEach(amenity => amenitiesSet.add(amenity));
      }
    });
    
    return Array.from(amenitiesSet);
  }

  /**
   * Determine building type from properties
   */
  determineBuildingType(properties) {
    const types = properties.map(p => p.propertyType || 'residential');
    
    if (types.includes('apartment_unit') || types.includes('condo')) {
      return 'residential';
    } else if (types.includes('office')) {
      return 'commercial';
    } else if (types.includes('retail')) {
      return 'retail';
    } else {
      return 'mixed';
    }
  }

  /**
   * Calculate total floors from properties
   */
  calculateTotalFloors(properties) {
    const floors = properties
      .map(p => p.floorNumber || 1)
      .filter(f => f && f > 0);
    
    return floors.length > 0 ? Math.max(...floors) : 1;
  }

  /**
   * Extract year built from properties
   */
  extractYearBuilt(properties) {
    const years = properties
      .map(p => p.yearBuilt)
      .filter(y => y && y > 1900 && y <= new Date().getFullYear());
    
    return years.length > 0 ? Math.min(...years) : null;
  }

  /**
   * Update properties with building references
   */
  async updatePropertiesWithBuildings(properties) {
    console.log('🔗 Updating properties with building references...');
    
    for (const property of properties) {
      const addressKey = this.normalizeAddress({
        street: property.street || property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode
      });
      
      const buildingId = this.buildingMap.get(addressKey);
      
      const updates = {
        // Set property type if not already set
        propertyType: property.propertyType || this.inferPropertyType(property),
        
        // Set building reference if building was created
        ...(buildingId && { buildingId }),
        
        // Set floor and unit numbers if applicable
        ...(property.floorNumber && { floorNumber: property.floorNumber }),
        ...(property.unitNumber && { unitNumber: property.unitNumber }),
        
        // Ensure status is properly set
        status: property.status || 'Available'
      };
      
      await Property.findByIdAndUpdate(property._id, updates);
    }
    
    console.log(`✅ Updated ${properties.length} properties`);
  }

  /**
   * Infer property type from existing data
   */
  inferPropertyType(property) {
    const title = (property.title || '').toLowerCase();
    const description = (property.description || '').toLowerCase();
    
    if (title.includes('apartment') || title.includes('unit')) {
      return 'apartment_unit';
    } else if (title.includes('house') || title.includes('home')) {
      return 'house';
    } else if (title.includes('condo')) {
      return 'condo';
    } else if (title.includes('office')) {
      return 'office';
    } else if (title.includes('land') || title.includes('plot')) {
      return 'land';
    } else {
      return 'other';
    }
  }

  /**
   * Generate building summaries
   */
  async generateBuildingSummaries() {
    console.log('📊 Generating building summaries...');
    
    const buildings = await Building.find({});
    
    for (const building of buildings) {
      await BuildingSummary.updateForBuilding(building._id);
    }
    
    console.log(`✅ Generated summaries for ${buildings.length} buildings`);
  }

  /**
   * Rollback migration (for testing purposes)
   */
  async rollback() {
    console.log('🔄 Rolling back Building normalization migration...');
    
    try {
      // Remove building references from properties
      await Property.updateMany({}, { $unset: { buildingId: 1 } });
      
      // Delete all buildings and summaries
      await Building.deleteMany({});
      await BuildingSummary.deleteMany({});
      
      console.log('✅ Migration rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
}

// Export for use in migration scripts
module.exports = BuildingNormalizationMigration;

// CLI execution
if (require.main === module) {
  const migration = new BuildingNormalizationMigration();
  
  const command = process.argv[2];
  
  if (command === 'rollback') {
    migration.rollback()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    migration.migrate()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}