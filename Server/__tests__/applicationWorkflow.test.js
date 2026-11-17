const mongoose = require('mongoose');
const GuardrailsService = require('../services/guardrailsService');

describe('DwellSync 2.0 Application Workflows (Rent & Buy)', () => {
  const propertyId = new mongoose.Types.ObjectId().toString();
  const tenantId = new mongoose.Types.ObjectId().toString();

  describe('1. Apply for Rent — 5-Step Workflow Validation', () => {
    it('validates a complete modern 5-step rental application payload', () => {
      const modernRentData = {
        propertyId,
        tenantId,
        requestType: 'Rent',
        payload: {
          rentDetails: {
            preferredMoveInDate: '2026-12-01',
            leaseDuration: '12 Months (Standard)',
            occupantsCount: 2,
            specialRequests: 'Ground floor preference'
          },
          livingRequirements: {
            hasPets: true,
            petDetails: '1 Persian cat',
            hasVehicle: true,
            vehicleDetails: 'Sedan',
            parkingNeeded: true
          },
          employmentAffordability: {
            employmentStatus: 'Employed (Full-time)',
            employerName: 'Acme Software',
            jobRole: 'Senior Developer',
            monthlyIncome: 120000,
            additionalIncome: 15000
          },
          familyMembers: [
            { name: 'John Doe', relation: 'Primary Tenant', age: 30 },
            { name: 'Jane Doe', relation: 'Spouse', age: 28 }
          ],
          messageToOwner: 'We are quiet professionals excited about your property.'
        }
      };

      const result = GuardrailsService.validateRequestData(modernRentData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags missing preferred move-in date in rental workflow', () => {
      const invalidRentData = {
        propertyId,
        tenantId,
        requestType: 'Rent',
        payload: {
          rentDetails: {
            preferredMoveInDate: '',
            occupantsCount: 1
          },
          livingRequirements: {
            hasPets: false
          }
        }
      };

      const result = GuardrailsService.validateRequestData(invalidRentData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Preferred move-in date is required');
    });
  });

  describe('2. Apply to Buy — 4-Step Workflow Validation', () => {
    it('validates an individual buyer purchase proposal', () => {
      const individualBuyData = {
        propertyId,
        tenantId,
        requestType: 'Buy',
        payload: {
          purchaseProposal: {
            askingPrice: 15000000,
            offeredPrice: 14500000,
            financingMethod: 'Bank Mortgage / Pre-Approved Loan',
            purchaseTimeline: '30 – 60 Days',
            proposalNotes: 'Contingent on structural inspection'
          },
          buyerInfo: {
            buyerType: 'individual',
            fullName: 'Kabir Ahmed',
            email: 'kabir@test.com',
            phoneNumber: '+8801700000000'
          },
          messageToOwner: 'Formal offer for residential flat.'
        }
      };

      const result = GuardrailsService.validateRequestData(individualBuyData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates an organizational / corporate buyer purchase proposal', () => {
      const corporateBuyData = {
        propertyId,
        tenantId,
        requestType: 'Buy',
        payload: {
          purchaseProposal: {
            askingPrice: 50000000,
            offeredPrice: 48000000,
            financingMethod: 'Cash / Self-Financed',
            purchaseTimeline: 'Immediate (Within 30 Days)'
          },
          buyerInfo: {
            buyerType: 'organizational',
            organizationName: 'Global Real Estate Trust',
            registrationNumber: 'REG-987654',
            authorizedSignatory: 'Director Rahman',
            officialEmail: 'procurement@globaltrust.com'
          }
        }
      };

      const result = GuardrailsService.validateRequestData(corporateBuyData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags missing organization name for corporate buyer', () => {
      const invalidCorporateBuy = {
        propertyId,
        tenantId,
        requestType: 'Buy',
        payload: {
          purchaseProposal: {
            offeredPrice: 20000000
          },
          buyerInfo: {
            buyerType: 'organizational',
            organizationName: ''
          }
        }
      };

      const result = GuardrailsService.validateRequestData(invalidCorporateBuy);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization / Company name is required for corporate buyers');
    });

    it('validates land purchase without requiring pets, vehicles, or household occupancy', () => {
      const landBuyData = {
        propertyId,
        tenantId,
        requestType: 'Buy',
        payload: {
          purchaseProposal: {
            askingPrice: 30000000,
            offeredPrice: 29000000,
            financingMethod: 'Cash / Self-Financed',
            purchaseTimeline: '30 – 60 Days',
            intendedLandUse: 'Commercial Construction'
          },
          buyerInfo: {
            buyerType: 'individual',
            fullName: 'Farhan Chowdhury',
            email: 'farhan@test.com',
            phoneNumber: '+8801811111111'
          }
        }
      };

      const result = GuardrailsService.validateRequestData(landBuyData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Confirmed: No family members, belongings, or occupation errors thrown!
    });
  });

  describe('3. Backward Compatibility for Legacy 8-Step Payloads', () => {
    it('validates legacy 8-step application payloads seamlessly', () => {
      const legacyPayload = {
        propertyId,
        tenantId,
        requestType: 'Rent',
        payload: {
          familyMembers: [{ name: 'Legacy User', relation: 'Self', age: 25 }],
          occupation: {
            employmentType: 'employed',
            role: 'Analyst',
            yearsOfExperience: 3
          },
          financials: {
            monthlyIncome: 60000
          },
          letterToOwner: 'This is a valid legacy letter with more than twenty characters.'
        }
      };

      const result = GuardrailsService.validateRequestData(legacyPayload);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
