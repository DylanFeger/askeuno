# 🌐 Ask Euno MVP - Custom Domain Setup Guide

**Target Domain**: askeuno.com  
**Platform**: AWS App Runner  
**Last Updated**: February 27, 2026

---

## 📋 Overview

This guide walks you through configuring the custom domain `askeuno.com` for your Ask Euno application deployed on AWS App Runner.

---

## ✅ Prerequisites

- [ ] AWS App Runner service created and running
- [ ] Domain `askeuno.com` registered (or access to DNS management)
- [ ] AWS account with App Runner access
- [ ] Access to domain DNS settings (via registrar or DNS provider)

---

## 🚀 Step-by-Step Setup

### Step 1: Add Custom Domain in AWS App Runner

1. **Navigate to AWS App Runner Console**
   - Go to https://console.aws.amazon.com/apprunner
   - Select your App Runner service

2. **Add Custom Domain**
   - Click on **"Custom domains"** tab
   - Click **"Add domain"** button
   - Enter your domain: `askeuno.com`
   - Click **"Add"**

3. **Get DNS Records**
   - AWS will provide you with DNS records to add
   - You'll see something like:
     ```
     Type: CNAME
     Name: askeuno.com
     Value: xyz123.us-east-1.awsapprunner.com
     ```
   - **Copy these values** - you'll need them in the next step

---

### Step 2: Configure DNS Records

#### Option A: Using Root Domain (askeuno.com)

If you want to use the root domain `askeuno.com`:

1. **Add CNAME Record** (if your DNS provider supports CNAME for root domain)
   - **Type**: `CNAME`
   - **Name**: `@` or `askeuno.com` (depends on your DNS provider)
   - **Value**: `xyz123.us-east-1.awsapprunner.com` (from Step 1)
   - **TTL**: `3600` (or default)

2. **Alternative: Use ALIAS Record** (if CNAME not supported for root)
   - Some DNS providers (Route 53, Cloudflare) support ALIAS/ANAME records
   - **Type**: `ALIAS` or `ANAME`
   - **Name**: `@` or `askeuno.com`
   - **Value**: `xyz123.us-east-1.awsapprunner.com`

#### Option B: Using Subdomain (www.askeuno.com)

If you prefer using `www.askeuno.com`:

1. **Add CNAME Record**
   - **Type**: `CNAME`
   - **Name**: `www`
   - **Value**: `xyz123.us-east-1.awsapprunner.com` (from Step 1)
   - **TTL**: `3600`

2. **Redirect Root to WWW** (Optional)
   - Add redirect rule in your DNS provider
   - Or use App Runner's redirect feature

---

### Step 3: SSL Certificate Configuration

**Good News**: AWS App Runner automatically provisions SSL certificates via AWS Certificate Manager (ACM).

1. **Automatic SSL Provisioning**
   - App Runner automatically requests SSL certificate
   - Certificate is issued by AWS Certificate Manager
   - No manual configuration needed

2. **Wait for Certificate**
   - SSL certificate provisioning takes **5-30 minutes**
   - Status will show as "Pending validation" initially
   - Check status in App Runner console

3. **Verify Certificate**
   - Once issued, status changes to "Active"
   - Your domain will automatically use HTTPS

---

### Step 4: Verify DNS Propagation

1. **Check DNS Propagation**
   - Use tools like https://dnschecker.org
   - Enter your domain: `askeuno.com`
   - Verify CNAME record points to App Runner

2. **Test Domain Access**
   - Wait 5-30 minutes for DNS propagation
   - Try accessing: `https://askeuno.com`
   - Verify SSL certificate is valid (green lock icon)

3. **Common DNS Propagation Times**
   - **Route 53**: 1-5 minutes
   - **Cloudflare**: 1-5 minutes
   - **Other providers**: 5-60 minutes
   - **Global propagation**: Up to 48 hours (usually much faster)

---

## 🔧 DNS Provider-Specific Instructions

### AWS Route 53

1. **Go to Route 53 Console**
   - Navigate to https://console.aws.amazon.com/route53
   - Select your hosted zone for `askeuno.com`

2. **Create Record**
   - Click **"Create record"**
   - **Record name**: Leave blank (for root) or `www` (for subdomain)
   - **Record type**: `CNAME`
   - **Value**: `xyz123.us-east-1.awsapprunner.com`
   - **TTL**: `300` (5 minutes)
   - Click **"Create records"**

### Cloudflare

1. **Go to Cloudflare Dashboard**
   - Navigate to https://dash.cloudflare.com
   - Select your domain `askeuno.com`

2. **Add DNS Record**
   - Go to **"DNS"** → **"Records"**
   - Click **"Add record"**
   - **Type**: `CNAME`
   - **Name**: `@` (for root) or `www` (for subdomain)
   - **Target**: `xyz123.us-east-1.awsapprunner.com`
   - **Proxy status**: ⚠️ **Turn OFF proxy** (gray cloud) for App Runner
   - **TTL**: `Auto`
   - Click **"Save"**

3. **Important**: Disable Cloudflare Proxy
   - App Runner requires direct connection
   - Gray cloud = DNS only (correct)
   - Orange cloud = Proxy (will cause issues)

### GoDaddy

1. **Go to GoDaddy DNS Management**
   - Log in to GoDaddy
   - Go to **"My Products"** → **"DNS"**

2. **Add CNAME Record**
   - Click **"Add"** in DNS records
   - **Type**: `CNAME`
   - **Host**: `@` (for root) or `www` (for subdomain)
   - **Points to**: `xyz123.us-east-1.awsapprunner.com`
   - **TTL**: `1 Hour`
   - Click **"Save"**

### Namecheap

1. **Go to Namecheap DNS Management**
   - Log in to Namecheap
   - Go to **"Domain List"** → **"Manage"** → **"Advanced DNS"**

2. **Add CNAME Record**
   - Click **"Add New Record"**
   - **Type**: `CNAME Record`
   - **Host**: `@` (for root) or `www` (for subdomain)
   - **Value**: `xyz123.us-east-1.awsapprunner.com`
   - **TTL**: `Automatic`
   - Click **"Save"**

---

## 🔒 SSL Certificate Troubleshooting

### Issue: Certificate Status "Pending validation"

**Solution**:
1. Verify DNS record is correctly configured
2. Wait 5-30 minutes for DNS propagation
3. Check DNS propagation using https://dnschecker.org
4. Ensure CNAME record points to correct App Runner endpoint

### Issue: Certificate Status "Failed"

**Solution**:
1. Verify DNS record is correct
2. Check domain ownership
3. Remove and re-add custom domain in App Runner
4. Contact AWS Support if issue persists

### Issue: "Certificate not found" error

**Solution**:
1. Wait for certificate provisioning (can take up to 30 minutes)
2. Verify DNS is properly configured
3. Check App Runner service status

---

## ✅ Verification Checklist

After setup, verify:

- [ ] DNS record added correctly
- [ ] DNS propagated (check with dnschecker.org)
- [ ] Domain accessible: `https://askeuno.com`
- [ ] SSL certificate active (green lock in browser)
- [ ] HTTPS redirects working
- [ ] Application loads correctly
- [ ] API endpoints accessible: `https://askeuno.com/api/health`

---

## 🔄 Redirecting HTTP to HTTPS

AWS App Runner automatically handles HTTPS, but you may want to redirect HTTP to HTTPS:

1. **App Runner Automatic Redirect**
   - App Runner automatically redirects HTTP to HTTPS
   - No additional configuration needed

2. **DNS-Level Redirect** (Optional)
   - Some DNS providers support HTTP→HTTPS redirect
   - Check your DNS provider's documentation

---

## 🌍 Multiple Domains (Optional)

If you want to support multiple domains:

1. **Add Additional Domains**
   - Add each domain in App Runner console
   - Configure DNS for each domain
   - SSL certificates provisioned automatically

2. **Common Setup**
   - `askeuno.com` (root domain)
   - `www.askeuno.com` (www subdomain)
   - Both point to same App Runner service

---

## 📝 Environment Variables Update

After domain is configured, update environment variables:

```bash
APP_URL=https://askeuno.com
FRONTEND_URL=https://askeuno.com
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed
```

Update these in AWS App Runner console → Configuration → Environment variables.

---

## 🚨 Common Issues

### Issue: "Domain not found" error

**Solution**:
- Verify DNS record is correct
- Wait for DNS propagation (5-60 minutes)
- Check DNS record using `dig askeuno.com` or `nslookup askeuno.com`

### Issue: SSL certificate not provisioning

**Solution**:
- Verify DNS record points to correct App Runner endpoint
- Ensure domain is accessible via DNS
- Wait up to 30 minutes for certificate provisioning
- Check App Runner service logs

### Issue: "Connection refused" or "Site can't be reached"

**Solution**:
- Verify App Runner service is running
- Check DNS record is correct
- Verify App Runner endpoint is correct
- Check App Runner service health

### Issue: Cloudflare proxy causing issues

**Solution**:
- **Disable Cloudflare proxy** (gray cloud icon)
- App Runner requires direct DNS connection
- Orange cloud (proxy) will cause connection issues

---

## 📚 Additional Resources

- [AWS App Runner Custom Domains](https://docs.aws.amazon.com/apprunner/latest/dg/manage-custom-domains.html)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html)
- [DNS Propagation Checker](https://dnschecker.org)

---

## ✅ Success Criteria

Your custom domain is successfully configured when:

- ✅ Domain `askeuno.com` resolves to App Runner
- ✅ SSL certificate is active (HTTPS works)
- ✅ Application loads at `https://askeuno.com`
- ✅ API endpoints work: `https://askeuno.com/api/health`
- ✅ No SSL warnings in browser
- ✅ Environment variables updated with new domain

---

**Status**: Complete ✅  
**Next**: Configure auto-deployment
