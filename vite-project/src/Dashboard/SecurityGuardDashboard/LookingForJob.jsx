import React from 'react';
import './UnderConstruction.css';

const LookingForJob = () => {
  return (
    <div className="under-construction">
      <div className="construction-content">
        <div className="construction-icon">🔍</div>
        <h2 className="construction-title">Looking for Job</h2>
        <p className="construction-message">
          This section is currently under construction. Soon you'll be able to:
        </p>
        <ul className="construction-features">
          <li>Browse available security guard positions</li>
          <li>Filter jobs by location and requirements</li>
          <li>Apply for positions directly</li>
          <li>Track your application status</li>
        </ul>
        <div className="construction-note">
          We're working hard to bring you this feature. Please check back soon!
        </div>
      </div>
    </div>
  );
};

export default LookingForJob;