# Production Build Guide

This guide explains how the Ask Euno frontend is optimized for production deployment.

## Build Optimizations

### 1. **Minification**
- **JavaScript**: Vite automatically minifies all JavaScript using esbuild in production mode
- **CSS**: PostCSS with cssnano removes comments, normalizes whitespace, and optimizes rules
- **HTML**: Vite minifies the HTML output

### 2. **Tree Shaking**
- Removes unused code from the final bundle
- Eliminates dead code from dependencies
- React production build excludes development warnings

### 3. **Tailwind CSS Purging**
The `tailwind.config.ts` content configuration automatically removes unused styles:
```typescript
content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"]
```
This scans all source files and includes only the CSS classes actually used.

### 4. **Code Splitting**
Vite automatically:
- Splits vendor code from application code
- Creates separate chunks for large dependencies
- Lazy loads routes and components where applicable

### 5. **Asset Optimization**
- Images under 4KB are inlined as base64
- Larger assets are copied with hashed filenames for caching
- Fonts and images are optimized during build

## Build Commands

### Standard Production Build
```bash
npm run build
```

### Optimized Production Build Script
```bash
./scripts/build-production.sh
```

### Build with Analysis
```bash
# Build and analyze bundle sizes
NODE_ENV=production npm run build
npx vite-bundle-visualizer
```

## Environment Variables

For production builds, ensure these are set:
```bash
NODE_ENV=production
VITE_API_URL=https://api.askeuno.com  # If using separate API
```

## Build Output Structure

```
dist/
├── public/
│   ├── index.html          # Minified HTML entry point
│   ├── js/
│   │   ├── index-[hash].js # Main application bundle
│   │   ├── vendor-[hash].js # Vendor dependencies
│   │   └── ...             # Additional chunks
│   ├── css/
│   │   └── index-[hash].css # Minified, purged CSS
│   └── assets/
│       ├── images/         # Optimized images
│       └── fonts/          # Font files
├── index.js                # Backend server bundle
└── build-report.txt        # Build statistics
```

## Performance Metrics

After optimization, typical build characteristics:
- **Initial JS bundle**: < 200KB (gzipped)
- **CSS bundle**: < 50KB (gzipped) with Tailwind purging
- **Total build size**: < 1MB excluding images
- **First Contentful Paint**: < 1.5s on 3G networks

## Verification Checklist

✅ **Before Production**
- [ ] No console.log statements in production build
- [ ] No source maps included
- [ ] All assets have cache-busting hashes
- [ ] CSS is minified and purged
- [ ] JavaScript is minified and tree-shaken
- [ ] Build completes without warnings

✅ **Testing Production Build**
```bash
# 1. Build for production
npm run build

# 2. Preview locally
npm run preview

# 3. Check bundle sizes
ls -lah dist/public/js/
ls -lah dist/public/css/

# 4. Test in browser
# - Open http://localhost:4173
# - Check Network tab for asset sizes
# - Verify no console errors
# - Test all features work correctly
```

## Deployment Platforms

### Replit
```bash
npm run build
# Deploy via Replit interface
```

### AWS Amplify
```yaml
version: 1
frontend:
  phases:
    build:
      commands:
        - npm ci
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

### Nginx
```nginx
server {
    listen 80;
    server_name askeuno.com;
    root /var/www/acre/dist/public;
    
    # Enable gzip
    gzip on;
    gzip_types text/css application/javascript application/json;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Monitoring Production

After deployment, monitor:
1. **Bundle Size**: Keep main bundle under 250KB
2. **Load Time**: Target < 3s on 3G
3. **Lighthouse Score**: Aim for 90+ performance
4. **Error Rate**: Monitor console errors
5. **Cache Hit Rate**: Verify assets are cached

## Continuous Optimization

1. **Regular Audits**
   ```bash
   npx lighthouse https://askeuno.com --view
   ```

2. **Bundle Analysis**
   ```bash
   npx vite-bundle-visualizer
   ```

3. **Dependency Updates**
   - Keep dependencies updated
   - Remove unused packages
   - Consider lighter alternatives

4. **Code Reviews**
   - Check for unnecessary imports
   - Lazy load heavy components
   - Use dynamic imports for routes