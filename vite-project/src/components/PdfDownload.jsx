import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './PdfDownload.css';

const PdfDownload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [downloadStatus, setDownloadStatus] = useState('preparing'); // preparing, downloading, success, error
  const [message, setMessage] = useState('Preparing your receipt...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const payment = searchParams.get('payment');

    if (payment === 'success' && sessionId) {
      handlePdfDownload(sessionId);
    } else if (payment === 'cancelled') {
      setDownloadStatus('error');
      setMessage('Payment was cancelled.');
      setTimeout(() => {
        navigate('/tenant/request-info');
      }, 3000);
    } else {
      setDownloadStatus('error');
      setMessage('Invalid payment session.');
      setTimeout(() => {
        navigate('/tenant/request-info');
      }, 3000);
    }
  }, [searchParams, navigate]);

  const handlePdfDownload = async (sessionId) => {
    try {
      setDownloadStatus('preparing');
      setMessage('Payment successful! Preparing your receipt...');
      setProgress(20);

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      setProgress(40);
      setMessage('Processing payment record...');

      let retryCount = 0;
      const maxRetries = 5;
      
      const attemptDownload = async () => {
        try {
          setMessage(`Generating receipt... (Attempt ${retryCount + 1}/${maxRetries})`);
          setProgress(60 + (retryCount * 8));
          
          const pdfUrl = `http://localhost:5001/api/pdf/generate-receipt?session_id=${sessionId}&originUrl=${encodeURIComponent(window.location.origin)}`;
          
          setDownloadStatus('downloading');
          setMessage('Receipt ready! Opening download page...');
          setProgress(90);
          
          // Open PDF generation page in current window and wait
          setMessage('Opening PDF generation page...');
          
          // Use window.location.href but don't immediately set success
          window.location.href = pdfUrl;
          
          // The PDF controller will handle the download and redirect
          // No need to set success here as the page will navigate away
          
          return true;
        } catch (error) {
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await attemptDownload();
          }
          throw error;
        }
      };
      
      await attemptDownload();
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setDownloadStatus('error');
      setMessage('Payment was successful, but there was an issue generating the receipt. Please check your requests page.');
      setProgress(100);
      
      // Redirect back to requests page after 5 seconds
      setTimeout(() => {
        navigate('/tenant/request-info');
      }, 5000);
    }
  };

  const getStatusIcon = () => {
    switch (downloadStatus) {
      case 'preparing':
      case 'downloading':
        return (
          <div className="spinner">
            <div className="spinner-circle"></div>
          </div>
        );
      case 'success':
        return (
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#10B981" />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#EF4444" />
              <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pdf-download-container">
      <div className="pdf-download-card">
        <div className="pdf-download-header">
          <h1>DwellSync</h1>
          <p>House Rental</p>
        </div>
        
        <div className="pdf-download-content">
          {getStatusIcon()}
          
          <h2 className="pdf-download-title">
            {downloadStatus === 'success' ? 'Download Complete!' : 
             downloadStatus === 'error' ? 'Download Failed' : 
             'Processing Payment'}
          </h2>
          
          <p className="pdf-download-message">{message}</p>
          
          {(downloadStatus === 'preparing' || downloadStatus === 'downloading') && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}
          
          {downloadStatus === 'success' && (
            <p className="redirect-message">
              Redirecting to your requests page...
            </p>
          )}
          
          {downloadStatus === 'error' && (
            <div className="error-actions">
              <button 
                className="btn-primary" 
                onClick={() => navigate('/tenant/request-info')}
              >
                Go to Requests
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfDownload;