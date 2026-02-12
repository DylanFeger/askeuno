# Lightspeed Retail Integration - Setup & Testing Guide

## Overview

This guide will help you set up and test the Lightspeed Retail integration for Ask Euno. The integration allows users to connect their Lightspeed Retail accounts and analyze sales, product, and customer data through the AI chatbot.

## What Was Fixed

### ✅ Critical Issues Resolved

1. **Missing DataSource Creation**
   - **Problem**: OAuth callback only created `connectionManager` entry, not `dataSource`
   - **Fix**: Now creates both entries so chat system can use the connection
   - **Impact**: Users can now query Lightspeed data immediately after connecting

2. **No Initial Data Sync**
   - **Problem**: No data was synced after OAuth connection
   - **Fix**: Automatically syncs sales, products, and customers data on first connection
   - **Impact**: Data is immediately available for AI queries

3. **Token Management**
   - **Problem**: Tokens weren't refreshed properly during syncs
   - **Fix**: Added automatic token refresh before syncing
   - **Impact**: Connections stay active longer, fewer re-authentications needed

4. **Error Handling**
   - **Problem**: Errors weren't logged or tracked
   - **Fix**: Added comprehensive logging and Sentry error tracking
   - **Impact**: Easier debugging and issue resolution

5. **Better Logging**
   - **Problem**: Used `console.log` instead of proper logging
   - **Fix**: Replaced with Winston logger and Sentry
   - **Impact**: Production-ready error tracking

---

## Setup Instructions

### 1. Get Lightspeed Developer Credentials

1. Go to [Lightspeed Developer Portal](https://developers.lightspeedhq.com/)
2. Sign in or create an account
3. Create a new application
4. Note down:
   - **Client ID**
   - **Client Secret**
   - **Redirect URI** (must match exactly)

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Lightspeed Retail OAuth (R-Series)
LS_CLIENT_ID=your_client_id_here
LS_CLIENT_SECRET=your_client_secret_here
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed

# Optional: Override default endpoints (usually not needed)
# LS_AUTH_URL=https://cloud.lightspeedapp.com/auth/oauth/authorize
# LS_TOKEN_URL=https://cloud.lightspeedapp.com/auth/oauth/token
# LS_API_BASE=https://api.lightspeedapp.com/API
```

**Important**: 
- The redirect URI must **exactly match** what you configured in Lightspeed Developer Portal
- For local testing, use: `http://localhost:5000/api/oauth/callback/lightspeed`
- For production, use: `https://askeuno.com/api/oauth/callback/lightspeed`

### 3. Test the Connection Flow

#### Step 1: Start the Connection
1. Go to `/connections` page
2. Click "Connect with OAuth" on the Lightspeed Retail card
3. You'll be redirected to Lightspeed authorization page

#### Step 2: Authorize
1. Sign in to your Lightspeed account
2. Review the permissions (read-only access)
3. Click "Authorize"

#### Step 3: Verify Connection
1. You'll be redirected back to `/chat?source=lightspeed`
2. Check the connections page - you should see "Lightspeed Account" as connected
3. The system will automatically sync initial data (sales, products, customers)

#### Step 4: Test Data Access
1. Go to chat page
2. Ask questions like:
   - "What are my top selling products?"
   - "Show me sales from last month"
   - "Who are my best customers?"

---

## Troubleshooting

### Issue: "Invalid state parameter"
**Cause**: Session expired or CSRF protection triggered  
**Solution**: 
- Try connecting again
- Make sure cookies are enabled
- Check that `SESSION_SECRET` is set

### Issue: "Failed to exchange authorization code"
**Possible Causes**:
1. **Redirect URI mismatch** - Must match exactly (including http/https, trailing slashes)
2. **Invalid client credentials** - Double-check `LS_CLIENT_ID` and `LS_CLIENT_SECRET`
3. **Code already used** - Authorization codes can only be used once

**Solution**:
- Verify redirect URI matches exactly in Lightspeed Developer Portal
- Check environment variables are loaded correctly
- Try disconnecting and reconnecting

### Issue: "Could not obtain account_id"
**Cause**: Lightspeed API didn't return account ID in token response  
**Solution**:
- Check API permissions in Lightspeed Developer Portal
- Verify scopes include `employee:inventory` and `employee:reports`
- Check server logs for detailed error messages

### Issue: "No data found" after connection
**Possible Causes**:
1. Store has no sales/products/customers yet
2. API permissions insufficient
3. Data sync failed silently

**Solution**:
- Check server logs for sync errors
- Verify store has data in Lightspeed
- Try manual sync: `POST /api/data-sources/:id/sync`

### Issue: Connection works but queries return no results
**Cause**: DataSource created but no data synced  
**Solution**:
- Check if initial sync completed (check logs)
- Manually trigger sync: `POST /api/data-sources/:id/sync`
- Verify data exists in Lightspeed account

---

## API Endpoints

### Start OAuth Flow
```
POST /api/lightspeed/start
Authorization: Required
Response: { redirect: "https://cloud.lightspeedapp.com/auth/oauth/authorize?..." }
```

### OAuth Callback (Handled Automatically)
```
GET /api/oauth/callback/lightspeed?code=...&state=...
No auth required (handled by session)
Redirects to: /chat?source=lightspeed
```

### Test Connection
```
GET /api/lightspeed/test
Authorization: Required
Response: { ok: true, accountId: "...", name: "Store Name" }
```

### Disconnect
```
DELETE /api/connections/lightspeed
Authorization: Required
Response: { ok: true }
```

### Sync Data
```
POST /api/data-sources/:id/sync
Authorization: Required
Response: { success: true, rowsUpdated: 150 }
```

---

## Data Schema

After connection, the following data types are available:

### Sales Data
- `sale_id`, `sale_number`, `sale_time`
- `total`, `total_tax`
- `customer_id`, `customer_name`
- `employee_id`, `register_id`, `shop_id`
- `completed`, `archived`, `voided`
- `line_items_count`, `payment_methods`

### Product Data
- `item_id`, `item_number`, `description`
- `custom_sku`, `system_sku`, `upc`
- `price`, `cost`, `weight`
- `category_id`, `category_name`, `brand`
- `manufacturer_sku`, `tax_class`
- `item_matrix_id`, `archived`

### Customer Data
- `customer_id`, `first_name`, `last_name`, `full_name`
- `email`, `phone`, `company`
- `customer_type_id`, `customer_type_name`
- `credit_limit`, `tax_category_id`
- `archived`

---

## Testing with Real Store Data

### Prerequisites
1. Lightspeed Retail account with active store
2. Store has sales, products, and customers
3. Developer credentials configured
4. Environment variables set

### Test Checklist

- [ ] OAuth flow completes successfully
- [ ] Connection appears in connections page
- [ ] DataSource is created (check database or API)
- [ ] Initial data sync completes (check logs)
- [ ] Data appears in chat queries
- [ ] Token refresh works (wait for expiration or force refresh)
- [ ] Manual sync works (`POST /api/data-sources/:id/sync`)
- [ ] Disconnect works (`DELETE /api/connections/lightspeed`)

### Sample Test Queries

Once connected, try these in the chat:

1. **Sales Analysis**
   - "What are my total sales this month?"
   - "Show me my top 10 products by sales"
   - "What's my average sale amount?"

2. **Product Insights**
   - "How many products do I have?"
   - "What are my most expensive products?"
   - "Which products are archived?"

3. **Customer Analysis**
   - "How many customers do I have?"
   - "Who are my top customers by name?"
   - "Show me customers with credit limits"

4. **Cross-Data Queries**
   - "Which customers buy the most expensive products?"
   - "What products are in my top sales?"
   - "Show me sales by customer type"

---

## Monitoring & Debugging

### Check Connection Status
```bash
# Via API
curl -X GET https://askeuno.com/api/lightspeed/test \
  -H "Cookie: connect.sid=your-session-cookie"

# Check database
SELECT * FROM connection_manager WHERE provider = 'lightspeed';
SELECT * FROM data_sources WHERE type = 'lightspeed';
```

### Check Sync Status
```bash
# Check data source status
SELECT id, name, status, row_count, last_sync_at, error_message 
FROM data_sources 
WHERE type = 'lightspeed';

# Check data rows
SELECT COUNT(*) FROM data_rows WHERE data_source_id = <id>;
```

### View Logs
```bash
# Application logs
tail -f logs/combined.log | grep -i lightspeed

# Error logs
tail -f logs/error.log | grep -i lightspeed
```

### Common Log Messages

**Success**:
```
[INFO] Lightspeed OAuth: Token exchange successful
[INFO] Starting initial Lightspeed data sync
[INFO] Initial Lightspeed data sync successful { rowCount: 150 }
[INFO] Lightspeed dataSource created { dataSourceId: 123 }
```

**Errors**:
```
[ERROR] Lightspeed OAuth: Token exchange failed { status: 400 }
[ERROR] Initial Lightspeed data sync failed { error: "..." }
[ERROR] Lightspeed token refresh failed
```

---

## Known Limitations

1. **Rate Limiting**: Lightspeed API has rate limits (check their docs)
2. **Data Limits**: Initial sync fetches 100 records per type (sales, products, customers)
3. **Sync Frequency**: Default is 60 minutes (configurable per data source)
4. **Token Expiration**: Tokens expire and need refresh (handled automatically)

---

## Next Steps

1. **Test with your store's data**
2. **Monitor logs** for any errors
3. **Try various queries** to ensure data is accessible
4. **Check Sentry** for any error reports
5. **Report issues** if you encounter problems

---

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test OAuth flow step by step
4. Check Lightspeed Developer Portal for API status
5. Review Sentry dashboard for error tracking

---

**Last Updated**: January 2025  
**Status**: Ready for Testing
