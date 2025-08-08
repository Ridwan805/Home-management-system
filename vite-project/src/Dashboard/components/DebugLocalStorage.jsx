import React, { useEffect, useState } from 'react';

const DebugLocalStorage = () => {
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('dwellSyncUser');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Remove sensitive data like token for display
        const displayData = { ...parsedData };
        if (displayData.token) {
          displayData.token = displayData.token.substring(0, 15) + '...';
        }
        setUserData(displayData);
      }
    } catch (error) {
      console.error('Error parsing localStorage data:', error);
    }
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', marginTop: '20px' }}>
      <h3>Debug: localStorage Data</h3>
      {userData ? (
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(userData, null, 2)}
        </pre>
      ) : (
        <p>No user data found in localStorage</p>
      )}
    </div>
  );
};

export default DebugLocalStorage;