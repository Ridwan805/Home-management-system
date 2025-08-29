import React, { useState, useEffect } from 'react';
import API from '../config/api';

const TestPropertyListing = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const testFetch = async () => {
      try {
        console.log('Starting property fetch test...');
        setLoading(true);
        
        // Check if user is logged in
        const userData = localStorage.getItem('dwellSyncUser');
        console.log('User data from localStorage:', userData ? 'Found' : 'Not found');
        
        if (!userData) {
          setError('No user data found in localStorage');
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userData);
        console.log('Parsed user:', { id: user.userId, role: user.role, hasToken: !!user.token });
        
        const headers = {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        };
        
        const url = API.baseUrl + API.endpoints.userProperties;
        console.log('Fetching from URL:', url);
        console.log('Headers:', headers);
        
        const response = await fetch(url, { headers });
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('Error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!data.success) {
          throw new Error(data.message || 'API returned success: false');
        }
        
        if (!Array.isArray(data.properties)) {
          throw new Error('Properties is not an array');
        }
        
        setProperties(data.properties);
        setDebugInfo({
          userRole: user.role,
          propertiesCount: data.properties.length,
          apiUrl: url,
          responseStatus: response.status
        });
        
      } catch (err) {
        console.error('Error in testFetch:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    testFetch();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Property Listing Test Page</h1>
      
      <div style={{ background: '#f0f0f0', padding: '10px', marginBottom: '20px' }}>
        <h3>Debug Information:</h3>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
      
      {loading && (
        <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '4px' }}>
          Loading properties...
        </div>
      )}
      
      {error && (
        <div style={{ background: '#ffebee', padding: '10px', borderRadius: '4px', color: '#c62828' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {!loading && !error && (
        <div>
          <h3>Properties Found: {properties.length}</h3>
          {properties.length === 0 ? (
            <div style={{ background: '#fff3e0', padding: '10px', borderRadius: '4px' }}>
              No properties found for this user.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {properties.map((property, index) => (
                <div key={property._id || index} style={{ 
                  border: '1px solid #ddd', 
                  padding: '10px', 
                  borderRadius: '4px',
                  background: '#fafafa'
                }}>
                  <h4>{property.title || property.address || 'Untitled Property'}</h4>
                  <p><strong>Price:</strong> ৳{property.price?.toLocaleString()}</p>
                  <p><strong>Status:</strong> {property.status}</p>
                  <p><strong>Type:</strong> {property.propertyType}</p>
                  <p><strong>Listing:</strong> {property.listingType}</p>
                  <p><strong>ID:</strong> {property._id}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestPropertyListing;