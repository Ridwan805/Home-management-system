# Payment and Invoice System

## Overview

This system automatically generates monthly invoices for tenants after they successfully pay their advance payment. Each invoice creates a corresponding payment object with "pending" status, which tenants can then pay online through Stripe.

## How It Works

### 1. Advance Payment Success
When a tenant successfully pays the advance payment:
- The Stripe webhook processes the payment
- Property status is updated to "Rented"
- A rent object is created for the tenant
- The first monthly invoice is automatically generated for the current month
- A corresponding payment object is created with "pending" status

### 2. Monthly Invoice Generation
- **Automatic**: Runs on the 1st of each month at 1:00 AM
- **Manual**: Can be triggered via API endpoint
- Creates invoices for all active rent contracts
- Each invoice gets a corresponding payment object

### 3. Payment Flow
1. Tenant sees pending invoice in their dashboard
2. Clicks "Pay Online" button
3. Redirected to Stripe checkout
4. After successful payment:
   - Payment status updated to "completed"
   - Invoice status updated to "paid"
   - Invoice moved from pending to payment history

## API Endpoints

### Get All Payment Data for Authenticated User
```
GET /api/payments/my-payments
```
Returns both pending invoices and payment history for the authenticated user.

### Get Pending Invoices for Specific Tenant
```
GET /api/payments/tenant/:tenantId/pending-invoices
```

### Get Payment History for Specific Tenant
```
GET /api/payments/tenant/:tenantId/payment-history
```

### Get All Payments for Specific Tenant
```
GET /api/payments/tenant/:tenantId/all
```

### Create Invoice Payment Session
```
POST /api/stripe/create-invoice-payment-session
```
Creates a Stripe checkout session for invoice payment.

## Data Models

### Invoice
- `invoiceNo`: Unique invoice number
- `rentId`: Reference to rent contract
- `propertyId`: Reference to property
- `billTo`: Tenant ID
- `billFrom`: Owner ID
- `period`: Billing period (start/end dates)
- `dueDate`: When payment is due
- `lineItems`: Array of invoice items
- `total`: Total amount due
- `status`: draft, open, paid, overdue, etc.

### Payment
- `paymentId`: Unique payment identifier
- `invoiceId`: Reference to invoice
- `rentId`: Reference to rent contract
- `type`: monthly_rent, advance_payment, etc.
- `status`: pending, completed, failed, etc.
- `amount`: Payment amount
- `currency`: Payment currency (default: BDT)
- `payerId`: Tenant ID
- `receiverId`: Owner ID
- `stripeDetails`: Stripe payment information

### Rent
- `propertyId`: Reference to property
- `ownerId`: Property owner ID
- `tenants`: Array of tenant IDs
- `rent.amount`: Monthly rent amount
- `rent.currency`: Rent currency
- `rent.dueDay`: Day of month when rent is due
- `billing.frequency`: monthly, quarterly, yearly
- `billing.nextInvoiceDate`: When next invoice should be generated

## Scheduled Jobs

### Monthly Invoice Generation
- **Schedule**: 1st of each month at 1:00 AM
- **Function**: `InvoiceService.generateMonthlyRentInvoices()`
- **Purpose**: Generate invoices for all active rent contracts

### Overdue Invoice Check
- **Schedule**: Daily at 3:00 AM
- **Function**: `InvoiceService.markOverdueInvoices()`
- **Purpose**: Mark invoices as overdue when past due date

## Frontend Components

### PaymentInfo.jsx
- **Location**: `vite-project/src/Dashboard/TenantDashboard/`
- **Features**:
  - Tab navigation between "Invoices" and "Payment History"
  - Display pending invoices with "Pay Online" buttons
  - Show payment history
  - Payment summary with outstanding balance
  - Refresh functionality

### Key Features
- **Invoice Tab**: Shows current pending monthly payments
- **Payment History Tab**: Shows all completed payments
- **Pay Online Button**: Redirects to Stripe checkout
- **Real-time Updates**: Automatically refreshes after payment success

## Security Guard Payment System

### Automatic Payment Generation
When a security guard is hired:
1. Security guard job status is set to 'Hired' or 'Active'
2. Monthly invoice is automatically created for their salary
3. Payment object is created in payments schema with 'pending' status
4. After payment is made, both invoice and payment status are updated

### Security Guard Payment Flow
1. Owner hires security guard through job application system
2. System automatically generates monthly salary invoice
3. Payment object created with 'pending' status
4. Owner can pay through Stripe integration
5. Upon successful payment, statuses are updated to 'completed'

## Configuration

### Environment Variables
- `STRIPE_SECRET_KEY`: Stripe secret key for payments
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for frontend
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- `FRONTEND_URL`: Frontend URL for payment redirects

### Cron Schedules
- Monthly invoice generation: `0 1 1 * *` (1st of month at 1:00 AM)
- Overdue check: `0 3 * * *` (Daily at 3:00 AM)
- Payment status check: `*/5 * * * *` (Every 5 minutes)

## Error Handling

### Webhook Failures
- PaymentScheduler runs every 5 minutes as a fallback
- Logs all errors for investigation
- Continues processing other payments if one fails

### Database Errors
- All database operations wrapped in try-catch
- Errors logged with context
- Graceful degradation when possible

## Security

### Authentication
- All payment endpoints require valid JWT token
- User can only access their own payment data
- Admin endpoints require admin role

### Payment Validation
- Stripe webhook signature verification
- Payment amount validation
- User authorization checks
- Duplicate payment prevention

## Monitoring

### Logs
- All payment operations logged with timestamps
- Error details logged for debugging
- Success operations logged for audit trail

### Metrics
- Payment success/failure rates
- Invoice generation counts
- Processing times
- Error frequencies

## Troubleshooting

### Common Issues

1. **Invoices not generating**
   - Check cron job status
   - Verify rent contracts are active
   - Check database connectivity

2. **Payments not processing**
   - Verify Stripe webhook configuration
   - Check webhook secret
   - Monitor webhook logs

3. **Frontend not loading data**
   - Check API endpoint availability
   - Verify authentication token
   - Check CORS configuration

### Debug Commands
```bash
# Check scheduled jobs status
curl http://localhost:5001/api/debug/scheduled-jobs

# Check payment scheduler status
curl http://localhost:5001/api/debug/payment-scheduler

# Manual invoice generation
curl -X POST http://localhost:5001/api/invoices/generate/monthly-rent
```
