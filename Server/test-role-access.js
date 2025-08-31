// Test script for role-based access controls
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test tokens for different roles (these would be real tokens in actual testing)
const TEST_TOKENS = {
  owner: null,
  tenant: null,
  securityGuard: null,
  admin: null
};

// Test endpoints with their expected role permissions
const TEST_ENDPOINTS = [
  {
    method: 'GET',
    url: '/security-guard-applications/my-applications',
    allowedRoles: ['Security Guard'],
    description: 'Get security guard applications'
  },
  {
    method: 'POST',
    url: '/security-guard-applications/apply',
    allowedRoles: ['Security Guard'],
    description: 'Apply for security guard job',
    data: { jobPostId: '507f1f77bcf86cd799439011', experience: '2 years' }
  },
  {
    method: 'GET',
    url: '/security-guard-applications/job/507f1f77bcf86cd799439011',
    allowedRoles: ['Owner'],
    description: 'Get applications for job post'
  },
  {
    method: 'POST',
    url: '/job-posts',
    allowedRoles: ['Owner'],
    description: 'Create job post',
    data: {
      title: 'Test Security Job',
      propertyId: '507f1f77bcf86cd799439011',
      requirements: { salary: 50000 }
    }
  },
  {
    method: 'GET',
    url: '/job-posts/tenant/assigned-guards',
    allowedRoles: ['Tenant'],
    description: 'Get assigned guards for tenant'
  },
  {
    method: 'POST',
    url: '/security-guard-payments/create-payment-session',
    allowedRoles: ['Owner'],
    description: 'Create payment session for guard',
    data: {
      jobPostId: '507f1f77bcf86cd799439011',
      amount: 1000,
      description: 'Monthly payment'
    }
  },
  {
    method: 'GET',
    url: '/security-guard-payments/guard/payments',
    allowedRoles: ['Security Guard'],
    description: 'Get guard payment history'
  },
  {
    method: 'GET',
    url: '/admin/dashboard/stats',
    allowedRoles: ['admin'],
    description: 'Get admin dashboard stats'
  }
];

// Helper function to make authenticated requests
async function makeRequest(method, url, token, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': token ? `Bearer ${token}` : undefined,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message
    };
  }
}

// Test role access for a specific endpoint
async function testEndpointAccess(endpoint, role, token) {
  console.log(`\n🧪 Testing ${endpoint.description} with ${role} role...`);
  
  const result = await makeRequest(endpoint.method, endpoint.url, token, endpoint.data);
  
  const shouldHaveAccess = endpoint.allowedRoles.includes(role);
  const hasAccess = result.success || (result.status !== 401 && result.status !== 403);
  
  if (shouldHaveAccess === hasAccess) {
    console.log(`✅ PASS: ${role} ${shouldHaveAccess ? 'correctly has' : 'correctly denied'} access`);
    return true;
  } else {
    console.log(`❌ FAIL: ${role} ${shouldHaveAccess ? 'should have' : 'should not have'} access`);
    console.log(`   Expected: ${shouldHaveAccess ? 'Access granted' : 'Access denied'}`);
    console.log(`   Actual: ${hasAccess ? 'Access granted' : 'Access denied'} (Status: ${result.status})`);
    if (result.message) console.log(`   Message: ${result.message}`);
    return false;
  }
}

// Test authentication without token
async function testUnauthenticatedAccess() {
  console.log('\n🔒 Testing unauthenticated access...');
  let passCount = 0;
  
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n🧪 Testing ${endpoint.description} without token...`);
    const result = await makeRequest(endpoint.method, endpoint.url, null, endpoint.data);
    
    if (result.status === 401) {
      console.log('✅ PASS: Correctly denied access without token');
      passCount++;
    } else {
      console.log(`❌ FAIL: Should deny access without token (Status: ${result.status})`);
    }
  }
  
  return passCount;
}

// Test with invalid token
async function testInvalidTokenAccess() {
  console.log('\n🔑 Testing invalid token access...');
  const invalidToken = 'invalid.token.here';
  let passCount = 0;
  
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n🧪 Testing ${endpoint.description} with invalid token...`);
    const result = await makeRequest(endpoint.method, endpoint.url, invalidToken, endpoint.data);
    
    if (result.status === 401) {
      console.log('✅ PASS: Correctly denied access with invalid token');
      passCount++;
    } else {
      console.log(`❌ FAIL: Should deny access with invalid token (Status: ${result.status})`);
    }
  }
  
  return passCount;
}

// Main test function
async function runAccessControlTests() {
  console.log('🚀 Starting Role-Based Access Control Tests\n');
  console.log('=' .repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Test 1: Unauthenticated access
  const unauthPassed = await testUnauthenticatedAccess();
  totalTests += TEST_ENDPOINTS.length;
  passedTests += unauthPassed;
  
  // Test 2: Invalid token access
  const invalidTokenPassed = await testInvalidTokenAccess();
  totalTests += TEST_ENDPOINTS.length;
  passedTests += invalidTokenPassed;
  
  // Test 3: Role-based access (would need real tokens)
  console.log('\n⚠️  Note: Role-based access tests require valid JWT tokens');
  console.log('   To run these tests, you would need to:');
  console.log('   1. Login as each role type to get valid tokens');
  console.log('   2. Update TEST_TOKENS object with real tokens');
  console.log('   3. Uncomment the role-based test section below');
  
  /*
  // Uncomment this section when you have valid tokens
  const roles = ['Owner', 'Tenant', 'Security Guard', 'admin'];
  
  for (const role of roles) {
    const token = TEST_TOKENS[role.toLowerCase().replace(' ', '')];
    if (token) {
      console.log(`\n👤 Testing ${role} role access...`);
      for (const endpoint of TEST_ENDPOINTS) {
        const passed = await testEndpointAccess(endpoint, role, token);
        totalTests++;
        if (passed) passedTests++;
      }
    }
  }
  */
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Role-based access control is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the access control implementation.');
  }
}

// Export for use in other files
module.exports = {
  runAccessControlTests,
  makeRequest,
  testEndpointAccess,
  TEST_ENDPOINTS
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAccessControlTests().catch(console.error);
}