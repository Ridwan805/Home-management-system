const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Get a token first
async function testAPI() {
  try {
    // Login to get a token
    console.log('Logging in to get token...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'ridwanurrahman214@gmail.com',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${errorData.message || 'Unknown error'}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('Login successful, got token');

    // Now fetch properties using the token
    console.log('Fetching properties...');
    const propertiesResponse = await fetch('http://localhost:5000/api/Properties/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!propertiesResponse.ok) {
      const errorData = await propertiesResponse.json();
      throw new Error(`Failed to fetch properties: ${errorData.message || 'Unknown error'}`);
    }

    const properties = await propertiesResponse.json();
    console.log(`Found ${properties.length} properties`);
    if (properties.length > 0) {
      console.log('First property:', JSON.stringify(properties[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();