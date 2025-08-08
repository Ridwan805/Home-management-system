const http = require('http');

function testPatchEndpoint() {
  console.log('Testing PATCH endpoint for property status update...');
  
  const data = JSON.stringify({ status: 'Sold' });
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/properties/test-id',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response data:', responseData);
    });
  });
  
  req.on('error', (error) => {
    console.error('Test failed:', error);
  });
  
  req.write(data);
  req.end();
}

testPatchEndpoint(); 