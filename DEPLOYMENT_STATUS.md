# AWS App Runner Deployment - In Progress

## Current Status
**Last Updated:** February 14, 2026

### Issue
App Runner deployment is failing during the start command phase. The build succeeds, but the service fails to start.

### What's Working ✅
- GitHub connection to App Runner is configured
- Source code is being pulled successfully
- `apprunner.yaml` configuration file is validated
- Application builds successfully (`npm ci` and `npm run build` both work)

### Current Problem ❌
**Error:** `Invalid start command. CannotStartContainerError: exec: "NODE_ENV=production": executable file not found in $PATH`

**Last Fix Attempted:**
- Removed `NODE_ENV=production` from the command (since it's already set in env section)
- Changed command to: `node dist/index.js`

**Current Configuration:**
```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    pre-build:
      - npm ci --include=dev
    build:
      - npm run build
run:
  command: node dist/index.js
  network:
    port: 5000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

### Next Steps to Fix
1. Verify the `dist/index.js` file exists after build
2. Check if the command path is correct (might need full path or different format)
3. Consider using `npm start` instead if package.json has a start script
4. Check CloudWatch logs for more detailed error messages
5. Verify environment variables are being set correctly

### Service Details
- **Service Name:** `askeuno-backend`
- **Region:** `us-east-2` (Ohio)
- **Service URL:** `https://amrc6sauhf.us-east-2.awsapprunner.com`
- **GitHub Repo:** `DylanFeger/askeuno`
- **Branch:** `main`

### Related Files
- `apprunner.yaml` - App Runner configuration file
- `package.json` - Contains build scripts
- `server/index.ts` - Main server entry point

---
**Status:** ⏸️ Paused - Ready to resume when needed
