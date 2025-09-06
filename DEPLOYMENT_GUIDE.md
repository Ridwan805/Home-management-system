# Deployment Guide for Home Management System

## Environment Variables Configuration

### Critical: Stripe Payment Redirect URLs

The application uses dynamic URL resolution for Stripe payment redirects. However, environment variables must be properly configured as fallbacks.

### For Render Deployment

When deploying to Render (https://dwellsync.onrender.com/), you MUST set these environment variables in your Render dashboard:

#### Backend Service Environment Variables:
```
FRONTEND_URL=https://dwellsync.onrender.com
CLIENT_URL=https://dwellsync.onrender.com
```

#### How to Set Environment Variables on Render:

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add/Update the following variables:
   - `FRONTEND_URL`: `https://dwellsync.onrender.com`
   - `CLIENT_URL`: `https://dwellsync.onrender.com`
5. Save and redeploy the service

### Why This Fixes the Localhost Redirect Issue

The application now uses a two-tier approach for Stripe redirects:

1. **Primary**: Dynamic `originUrl` from frontend requests
2. **Fallback**: Environment variables (`FRONTEND_URL`/`CLIENT_URL`)

When the environment variables are set to localhost, any payment request that doesn't include `originUrl` will redirect to localhost. Setting them to the production URL ensures proper redirects.

### Updated Controllers

The following controllers have been updated to support dynamic URLs:

- ✅ `stripe.controller.js` - Uses `originUrl || process.env.FRONTEND_URL`
- ✅ `securityGuardPayment.controller.js` - Uses `originUrl || process.env.FRONTEND_URL`
- ✅ `invoice.controller.js` - Uses `originUrl || process.env.FRONTEND_URL`
- ✅ `securityGuardPayment.routes.js` - Uses `originUrl || process.env.CLIENT_URL`

### Frontend Updates

The following frontend components send `originUrl: window.location.origin`:

- ✅ `MyRequests.jsx` - Tenant payment requests
- ✅ `PaymentInfo.jsx` - Invoice payments
- ✅ `Payment.jsx` - Security guard payments

### Testing the Fix

1. Deploy with updated environment variables
2. Make a payment through the deployed site
3. Verify redirect goes to `https://dwellsync.onrender.com` instead of `localhost:5173`

### Local Development

For local development, keep the `.env` file with localhost URLs:
```
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

### Production Checklist

- [ ] Set `FRONTEND_URL=https://dwellsync.onrender.com` on Render
- [ ] Set `CLIENT_URL=https://dwellsync.onrender.com` on Render
- [ ] Redeploy backend service
- [ ] Test payment flow end-to-end
- [ ] Verify redirects go to production URL

## Other Environment Variables

Ensure all other environment variables are properly set on Render:

- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `PORT` - Will be set automatically by Render