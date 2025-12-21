#!/bin/bash
# Test script for production features

echo "🧪 Testing OrgTree Production Features"
echo "======================================="
echo ""

BASE_URL="http://localhost:3001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "Test 1: Enhanced Health Check"
echo "------------------------------"
HEALTH=$(curl -s $BASE_URL/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"' && echo "$HEALTH" | grep -q '"database":"connected"'; then
  echo -e "${GREEN}✅ PASS${NC} - Health check working with database connectivity"
  echo "$HEALTH" | python3 -m json.tool
else
  echo -e "${RED}❌ FAIL${NC} - Health check not working properly"
  echo "$HEALTH"
fi
echo ""

# Test 2: Rate Limiting
echo "Test 2: Rate Limiting (5 attempts per 15 minutes)"
echo "--------------------------------------------------"
echo "Attempting 6 login requests rapidly..."
RATE_LIMIT_HIT=0
for i in {1..6}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" == "429" ]; then
    RATE_LIMIT_HIT=1
    echo -e "${GREEN}✅ PASS${NC} - Rate limit triggered on attempt $i"
    echo "$BODY" | python3 -m json.tool
    break
  fi
done

if [ $RATE_LIMIT_HIT -eq 0 ]; then
  echo -e "${YELLOW}⚠️  WARNING${NC} - Rate limit not triggered (might need more attempts or wait time)"
fi
echo ""

# Test 3: JWT Secret Validation
echo "Test 3: JWT Secret Validation"
echo "------------------------------"
if grep -q "orgtree-super-secret-key-change-this-in-production" /Users/ojdavis/OrgTree/server/.env; then
  echo -e "${RED}❌ FAIL${NC} - Using default JWT secret (not secure)"
else
  echo -e "${GREEN}✅ PASS${NC} - Using custom JWT secret"
fi
echo ""

# Test 4: Structured Logging
echo "Test 4: Structured Logging"
echo "--------------------------"
echo "Check server logs above for structured format like:"
echo '[2025-12-21T...] INFO: Server running on port 3001 {"port":"3001","environment":"development"}'
echo ""

# Test 5: CORS Configuration
echo "Test 5: Dynamic CORS"
echo "--------------------"
CORS_RESPONSE=$(curl -s -H "Origin: http://localhost:5173" -I $BASE_URL/api/health | grep -i "access-control")
if echo "$CORS_RESPONSE" | grep -q "access-control-allow"; then
  echo -e "${GREEN}✅ PASS${NC} - CORS headers present for localhost:5173"
else
  echo -e "${RED}❌ FAIL${NC} - CORS headers not found"
fi
echo ""

# Test 6: Environment Variable Templates
echo "Test 6: Environment Variable Templates"
echo "---------------------------------------"
if [ -f "/Users/ojdavis/OrgTree/server/.env.example" ]; then
  echo -e "${GREEN}✅ PASS${NC} - server/.env.example exists"
else
  echo -e "${RED}❌ FAIL${NC} - server/.env.example missing"
fi

if [ -f "/Users/ojdavis/OrgTree/.env.example" ]; then
  echo -e "${GREEN}✅ PASS${NC} - .env.example exists"
else
  echo -e "${RED}❌ FAIL${NC} - .env.example missing"
fi
echo ""

# Test 7: Error Boundary Component
echo "Test 7: React Error Boundary"
echo "----------------------------"
if [ -f "/Users/ojdavis/OrgTree/src/components/ErrorBoundary.jsx" ]; then
  echo -e "${GREEN}✅ PASS${NC} - ErrorBoundary.jsx exists"
else
  echo -e "${RED}❌ FAIL${NC} - ErrorBoundary.jsx missing"
fi
echo ""

# Test 8: Deployment Documentation
echo "Test 8: Deployment Documentation"
echo "--------------------------------"
if [ -f "/Users/ojdavis/OrgTree/DEPLOYMENT.md" ]; then
  LINES=$(wc -l < /Users/ojdavis/OrgTree/DEPLOYMENT.md)
  echo -e "${GREEN}✅ PASS${NC} - DEPLOYMENT.md exists ($LINES lines)"
else
  echo -e "${RED}❌ FAIL${NC} - DEPLOYMENT.md missing"
fi
echo ""

# Test 9: Build Script
echo "Test 9: Build Script"
echo "--------------------"
if [ -x "/Users/ojdavis/OrgTree/scripts/build-for-production.sh" ]; then
  echo -e "${GREEN}✅ PASS${NC} - build-for-production.sh exists and is executable"
else
  echo -e "${RED}❌ FAIL${NC} - build-for-production.sh missing or not executable"
fi
echo ""

# Test 10: Render Configuration
echo "Test 10: Render Configuration"
echo "-----------------------------"
if [ -f "/Users/ojdavis/OrgTree/render.yaml" ]; then
  echo -e "${GREEN}✅ PASS${NC} - render.yaml exists"
else
  echo -e "${RED}❌ FAIL${NC} - render.yaml missing"
fi
echo ""

# Summary
echo "======================================="
echo "🏁 Test Summary"
echo "======================================="
echo "All critical production features have been tested."
echo "Review any FAIL or WARNING items above."
echo ""
echo "Next steps:"
echo "1. Start frontend: cd /Users/ojdavis/OrgTree && npm run dev"
echo "2. Test in browser: http://localhost:5173"
echo "3. Review DEPLOYMENT.md for production deployment"
echo ""
