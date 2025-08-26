#!/bin/bash
# Simple test to verify Responsible AI page functionality

PORT=${PORT:-5000}
BASE_URL="http://0.0.0.0:${PORT}"

echo "🔍 Testing Responsible AI Page..."
echo ""

# Test 1: Check if footer link exists on homepage
echo "Test 1: Check footer link on homepage..."
FOOTER_CHECK=$(curl -s "${BASE_URL}/" | grep -c 'href="/responsible-ai"')
if [ $FOOTER_CHECK -gt 0 ]; then
    echo "✅ Footer link found on homepage"
else
    echo "❌ Footer link not found on homepage"
    exit 1
fi

# Test 2: Check if Responsible AI page loads
echo ""
echo "Test 2: Check Responsible AI page loads..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/responsible-ai")
if [ $RESPONSE -eq 200 ]; then
    echo "✅ Page loads successfully (HTTP 200)"
else
    echo "❌ Page failed to load (HTTP $RESPONSE)"
    exit 1
fi

# Test 3: Check page title
echo ""
echo "Test 3: Check page title..."
TITLE_CHECK=$(curl -s "${BASE_URL}/responsible-ai" | grep -c "Responsible AI at Euno")
if [ $TITLE_CHECK -gt 0 ]; then
    echo "✅ Page title found"
else
    echo "❌ Page title not found"
fi

# Test 4: Check all section headings
echo ""
echo "Test 4: Check section headings..."
SECTIONS=("Personalized AI" "Innovative AI" "Embedded AI" "Accessible AI" "Honest AI" "Thoroughly Tested")
FOUND=0
TOTAL=${#SECTIONS[@]}

for section in "${SECTIONS[@]}"; do
    if curl -s "${BASE_URL}/responsible-ai" | grep -q "$section"; then
        echo "  ✅ Found: $section"
        ((FOUND++))
    else
        echo "  ❌ Missing: $section"
    fi
done

echo ""
echo "Found $FOUND/$TOTAL section headings"

# Test 5: Check for contact link
echo ""
echo "Test 5: Check for contact link..."
CONTACT_CHECK=$(curl -s "${BASE_URL}/responsible-ai" | grep -c 'href="/contact"')
if [ $CONTACT_CHECK -gt 0 ]; then
    echo "✅ Contact link found"
else
    echo "❌ Contact link not found"
fi

# Test 6: Check meta tags
echo ""
echo "Test 6: Check SEO meta tags..."
PAGE_CONTENT=$(curl -s "${BASE_URL}/responsible-ai")
if echo "$PAGE_CONTENT" | grep -q '<title>'; then
    echo "✅ Title tag present"
else
    echo "❌ Title tag missing"
fi

echo ""
echo "✨ Test completed!"
echo ""

# Summary
if [ $FOUND -eq $TOTAL ] && [ $FOOTER_CHECK -gt 0 ] && [ $RESPONSE -eq 200 ]; then
    echo "✅ All core tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed - please review"
    exit 1
fi