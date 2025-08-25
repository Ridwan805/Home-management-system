# Payment Gateway Port Redirection Test

This document outlines how to test the dynamic port redirection functionality for the payment gateway.

## Changes Made

1. **Backend Changes:**
   - Modified `stripe.controller.js` to accept `originUrl` in request body
   - Updated both `createPaymentSession` and `createFullPaymentSession` functions
   - Success and cancel URLs now use `req.body.originUrl` or fallback to `process.env.FRONTEND_URL`

2. **Frontend Changes:**
   - Updated `MyRequests.jsx` to send `window.location.origin` in payment session requests
   - This ensures the payment gateway knows which port to redirect back to

3. **Configuration Changes:**
   - Updated `.env` file to use port 5173 as default fallback
   - Added comments explaining dynamic port handling
   - Updated `vite.config.js` to support flexible port configuration

## How It Works

1. When a user initiates payment, the frontend sends the current `window.location.origin` to the backend
2. The backend uses this origin URL to construct the success and cancel redirect URLs
3. After payment completion (success or cancellation), Stripe redirects back to the original port
4. If no origin URL is provided, it falls back to the `FRONTEND_URL` environment variable

## Testing Steps

1. **Test with Default Port (5173):**
   ```bash
   cd vite-project
   npm run dev
   ```
   - Access the application at `http://localhost:5173`
   - Initiate a payment and verify redirect works

2. **Test with Custom Port (e.g., 3000):**
   ```bash
   cd vite-project
   npm run dev -- --port 3000
   ```
   - Access the application at `http://localhost:3000`
   - Initiate a payment and verify it redirects back to port 3000

3. **Test with Another Custom Port (e.g., 8080):**
   ```bash
   cd vite-project
   npm run dev -- --port 8080
   ```
   - Access the application at `http://localhost:8080`
   - Initiate a payment and verify it redirects back to port 8080

## Expected Behavior

- Payment should redirect back to the same port where it was initiated
- No more hardcoded port 5175 redirects
- Fallback to environment variable if origin URL is not provided
- Works with any available port

## Verification

Check the Stripe session creation logs to confirm the correct URLs are being used:
- Success URL should match the originating port
- Cancel URL should match the originating port
- URLs should be in format: `http://localhost:[PORT]/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}`