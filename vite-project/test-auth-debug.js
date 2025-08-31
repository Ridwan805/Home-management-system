// Simple test script to debug authentication and API connectivity
const testAuth = () => {
  console.log('🔍 Testing authentication and API connectivity...');
  
  // Check localStorage for user data
  const user = JSON.parse(localStorage.getItem('dwellSyncUser') || 'null');
  console.log('👤 User data in localStorage:', {
    exists: !!user,
    userId: user?.userId,
    hasToken: !!user?.token,
    tokenLength: user?.token?.length,
    tokenPrefix: user?.token?.substring(0, 20) + '...'
  });
  
  if (!user || !user.token) {
    console.error('❌ No authentication data found. User needs to log in.');
    return false;
  }
  
  // Test API connectivity
  fetch('http://localhost:5001/api/payments/my-payments', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    return response.json();
  })
  .then(data => {
    console.log('✅ API Data received:', data);
    console.log('📄 Pending Invoices:', data.data?.pendingInvoices?.length || 0);
    console.log('💰 Payment History:', data.data?.paymentHistory?.length || 0);
  })
  .catch(error => {
    console.error('❌ API Error:', error);
  });
  
  return true;
};

// Run the test
testAuth();

// Instructions
console.log(`
📋 Debug Instructions:
1. Open browser developer tools (F12)
2. Navigate to the tenant payment page
3. Run this script in the console: testAuth()
4. Check the console output for authentication and API issues
`);