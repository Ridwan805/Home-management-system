const puppeteer = require('puppeteer');
const path = require('path');

// Test configuration
const FRONTEND_URL = 'http://localhost:5173'; // Vite dev server default port
const TEST_ROUTES = [
  {
    path: '/dashboard',
    description: 'Owner Dashboard',
    allowedRoles: ['Owner'],
    expectedRedirect: '/login' // for unauthenticated users
  },
  {
    path: '/tenant/profile',
    description: 'Tenant Profile',
    allowedRoles: ['Tenant'],
    expectedRedirect: '/login'
  },
  {
    path: '/security-guard/profile',
    description: 'Security Guard Profile',
    allowedRoles: ['Security Guard'],
    expectedRedirect: '/login'
  },
  {
    path: '/admin',
    description: 'Admin Dashboard',
    allowedRoles: ['admin'],
    expectedRedirect: '/login'
  }
];

// Test unauthenticated access to protected routes
async function testUnauthenticatedRouting() {
  console.log('🌐 Testing Frontend Route Protection (Unauthenticated)\n');
  console.log('=' .repeat(60));
  
  let browser;
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Clear any existing localStorage
    await page.evaluateOnNewDocument(() => {
      localStorage.clear();
    });
    
    for (const route of TEST_ROUTES) {
      totalTests++;
      console.log(`\n🧪 Testing ${route.description} (${route.path})...`);
      
      try {
        // Navigate to the protected route
        await page.goto(`${FRONTEND_URL}${route.path}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });
        
        // Wait a bit for any redirects to complete
        await page.waitForTimeout(2000);
        
        // Check current URL
        const currentUrl = page.url();
        const currentPath = new URL(currentUrl).pathname;
        
        if (currentPath === route.expectedRedirect) {
          console.log(`✅ PASS: Correctly redirected to ${route.expectedRedirect}`);
          passedTests++;
        } else {
          console.log(`❌ FAIL: Expected redirect to ${route.expectedRedirect}, but got ${currentPath}`);
        }
        
      } catch (error) {
        console.log(`❌ FAIL: Error testing ${route.path} - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Browser setup failed:', error.message);
    console.log('\n⚠️  Note: This test requires the frontend to be running on http://localhost:5173');
    console.log('   To run this test:');
    console.log('   1. Start the frontend: npm run dev (in vite-project directory)');
    console.log('   2. Ensure puppeteer is installed: npm install puppeteer');
    return { passedTests: 0, totalTests: 0, error: true };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return { passedTests, totalTests, error: false };
}

// Test role-based access with mock authentication
async function testRoleBasedRouting() {
  console.log('\n👤 Testing Frontend Role-Based Routing\n');
  console.log('=' .repeat(60));
  
  let browser;
  let passedTests = 0;
  let totalTests = 0;
  
  const testUsers = [
    { role: 'Owner', token: 'mock-owner-token', userId: 'owner123' },
    { role: 'Tenant', token: 'mock-tenant-token', userId: 'tenant123' },
    { role: 'Security Guard', token: 'mock-guard-token', userId: 'guard123' },
    { role: 'admin', token: 'mock-admin-token', userId: 'admin123' }
  ];
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    for (const user of testUsers) {
      console.log(`\n👤 Testing as ${user.role}...`);
      
      const page = await browser.newPage();
      
      // Set mock authentication in localStorage
      await page.evaluateOnNewDocument((userData) => {
        localStorage.setItem('dwellSyncUser', JSON.stringify({
          userName: `test${userData.role.toLowerCase()}`,
          token: userData.token,
          role: userData.role,
          userId: userData.userId
        }));
      }, user);
      
      for (const route of TEST_ROUTES) {
        totalTests++;
        
        try {
          await page.goto(`${FRONTEND_URL}${route.path}`, { 
            waitUntil: 'networkidle0',
            timeout: 10000 
          });
          
          await page.waitForTimeout(2000);
          
          const currentUrl = page.url();
          const currentPath = new URL(currentUrl).pathname;
          
          const shouldHaveAccess = route.allowedRoles.includes(user.role);
          const hasAccess = currentPath === route.path;
          
          if (shouldHaveAccess === hasAccess) {
            console.log(`  ✅ ${route.description}: ${shouldHaveAccess ? 'Access granted' : 'Access denied'} ✓`);
            passedTests++;
          } else {
            console.log(`  ❌ ${route.description}: Expected ${shouldHaveAccess ? 'access' : 'denial'}, got ${hasAccess ? 'access' : 'denial'}`);
            console.log(`     Current path: ${currentPath}`);
          }
          
        } catch (error) {
          console.log(`  ❌ ${route.description}: Error - ${error.message}`);
        }
      }
      
      await page.close();
    }
    
  } catch (error) {
    console.error('❌ Browser setup failed:', error.message);
    return { passedTests: 0, totalTests: 0, error: true };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return { passedTests, totalTests, error: false };
}

// Main test runner
async function runFrontendRoutingTests() {
  console.log('🚀 Starting Frontend Routing Tests\n');
  
  // Test 1: Unauthenticated access
  const unauthResults = await testUnauthenticatedRouting();
  
  if (!unauthResults.error) {
    // Test 2: Role-based access
    const roleResults = await testRoleBasedRouting();
    
    if (!roleResults.error) {
      const totalPassed = unauthResults.passedTests + roleResults.passedTests;
      const totalTests = unauthResults.totalTests + roleResults.totalTests;
      
      console.log('\n' + '=' .repeat(60));
      console.log('📊 FRONTEND ROUTING TEST SUMMARY');
      console.log('=' .repeat(60));
      console.log(`✅ Passed: ${totalPassed}/${totalTests} tests`);
      console.log(`❌ Failed: ${totalTests - totalPassed}/${totalTests} tests`);
      
      if (totalPassed === totalTests) {
        console.log('\n🎉 All frontend routing tests passed!');
      } else {
        console.log('\n⚠️  Some frontend routing tests failed. Please review the results above.');
      }
    }
  }
}

// Export for use in other test files
module.exports = {
  runFrontendRoutingTests,
  testUnauthenticatedRouting,
  testRoleBasedRouting
};

// Run tests if this file is executed directly
if (require.main === module) {
  runFrontendRoutingTests().catch(console.error);
}