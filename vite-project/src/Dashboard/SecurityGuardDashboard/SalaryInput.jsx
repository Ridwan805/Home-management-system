import React from 'react';
import './UnderConstruction.css';

const SalaryInput = () => {
  return (
    <div className="under-construction">
      <div className="construction-content">
        <div className="construction-icon">💰</div>
        <h2 className="construction-title">Salary Input</h2>
        <p className="construction-message">
          This section is currently under construction. Soon you'll be able to:
        </p>
        <ul className="construction-features">
          <li>Record your hourly wages</li>
          <li>Track overtime hours</li>
          <li>Submit timesheet information</li>
          <li>View payment history</li>
          <li>Generate salary reports</li>
        </ul>
        <div className="construction-note">
          We're working hard to bring you this feature. Please check back soon!
        </div>
      </div>
    </div>
  );
};

export default SalaryInput;