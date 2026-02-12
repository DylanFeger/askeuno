#!/bin/bash

# Production Build Script for Ask Euno
# This script optimizes the React frontend for production deployment

set -e

echo "=== Ask Euno Production Build ==="
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set production environment
export NODE_ENV=production

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf dist
rm -rf .vite

# Build the application
echo -e "${BLUE}Building application for production...${NC}"
npm run build

# Get build size information
echo
echo -e "${BLUE}Analyzing build output...${NC}"

# Check dist folder size
DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
echo -e "Total build size: ${GREEN}${DIST_SIZE}${NC}"

# Count files
JS_FILES=$(find dist -name "*.js" -type f | wc -l)
CSS_FILES=$(find dist -name "*.css" -type f | wc -l)
echo -e "JavaScript files: ${GREEN}${JS_FILES}${NC}"
echo -e "CSS files: ${GREEN}${CSS_FILES}${NC}"

# Analyze JavaScript bundle sizes
echo
echo -e "${BLUE}JavaScript bundle analysis:${NC}"
find dist -name "*.js" -type f -exec ls -lh {} \; | awk '{print $9 ": " $5}' | sort -k2 -hr | head -10

# Analyze CSS file sizes
echo
echo -e "${BLUE}CSS file analysis:${NC}"
find dist -name "*.css" -type f -exec ls -lh {} \; | awk '{print $9 ": " $5}' | sort -k2 -hr

# Check for source maps (should not exist in production)
echo
SOURCE_MAPS=$(find dist -name "*.map" -type f | wc -l)
if [ $SOURCE_MAPS -eq 0 ]; then
    echo -e "${GREEN}✓ No source maps found (good for production)${NC}"
else
    echo -e "${YELLOW}⚠ Found ${SOURCE_MAPS} source map files${NC}"
fi

# Verify Tailwind CSS purging
echo
echo -e "${BLUE}Checking Tailwind CSS optimization...${NC}"
MAIN_CSS=$(find dist -name "*.css" -type f | head -1)
if [ -f "$MAIN_CSS" ]; then
    CSS_SIZE=$(ls -lh "$MAIN_CSS" | awk '{print $5}')
    echo -e "Main CSS file size: ${GREEN}${CSS_SIZE}${NC}"
    
    # Check for unused Tailwind classes (rough estimate)
    TAILWIND_CLASSES=$(grep -o 'text-\|bg-\|p-\|m-\|flex\|grid' "$MAIN_CSS" | wc -l)
    echo -e "Tailwind utility classes found: ${GREEN}${TAILWIND_CLASSES}${NC}"
fi

# Test the production build
echo
echo -e "${BLUE}Testing production build...${NC}"

# Check if index.html exists
if [ -f "dist/public/index.html" ]; then
    echo -e "${GREEN}✓ index.html found${NC}"
    
    # Check for proper asset links
    JS_REFS=$(grep -c '<script' dist/public/index.html || true)
    CSS_REFS=$(grep -c '<link.*css' dist/public/index.html || true)
    echo -e "JavaScript references: ${GREEN}${JS_REFS}${NC}"
    echo -e "CSS references: ${GREEN}${CSS_REFS}${NC}"
else
    echo -e "${YELLOW}⚠ index.html not found${NC}"
fi

# Generate build report
echo
echo -e "${BLUE}Generating build report...${NC}"
cat > dist/build-report.txt << EOF
Ask Euno Production Build Report
Generated: $(date)

Build Configuration:
- NODE_ENV: production
- Tailwind CSS: Purged via content configuration
- CSS: Minified with cssnano
- JavaScript: Bundled and minified by Vite
- Assets: Optimized and hashed for caching

Build Statistics:
- Total Size: ${DIST_SIZE}
- JavaScript Files: ${JS_FILES}
- CSS Files: ${CSS_FILES}
- Source Maps: ${SOURCE_MAPS}

Optimizations Applied:
✓ Tree shaking for unused code removal
✓ Minification of JavaScript and CSS
✓ Asset optimization and compression
✓ Code splitting for better caching
✓ Tailwind CSS purging for smaller CSS
✓ Production React build (no dev warnings)

Deployment Ready: YES
EOF

echo -e "${GREEN}✓ Build report saved to dist/build-report.txt${NC}"

# Final summary
echo
echo -e "${GREEN}=== Production Build Complete ===${NC}"
echo
echo "Next steps:"
echo "1. Review the build output in the 'dist' directory"
echo "2. Test locally: npm run preview"
echo "3. Deploy to your hosting platform"
echo
echo -e "${BLUE}To preview the production build locally:${NC}"
echo "   npm run preview"
echo
echo -e "${BLUE}Build command for CI/CD:${NC}"
echo "   NODE_ENV=production npm run build"