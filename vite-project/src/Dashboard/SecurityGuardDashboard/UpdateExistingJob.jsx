import React from 'react';
import './UnderConstruction.css';

const UpdateExistingJob = () => {
  return (
    <div className="under-construction">
      <div className="construction-content">
        <div className="construction-icon">📝</div>
        <h2 className="construction-title">Update Existing Job</h2>
        <p className="construction-message">
          This section is currently under construction. Soon you'll be able to:
        </p>
        <ul className="construction-features">
          <li>View your current job assignments</li>
          <li>Update job status and progress</li>
          <li>Submit daily reports</li>
          <li>Communicate with supervisors</li>
          <li>Request schedule changes</li>
        </ul>
        <div className="construction-note">
          We're working hard to bring you this feature. Please check back soon!
        </div>
      </div>
    </div>
  );
};

export default UpdateExistingJob;