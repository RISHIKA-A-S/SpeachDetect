#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 SpeakEase AI - Connection Verification${NC}"
echo "=================================================="
echo ""

# Check if backend is running
echo -e "${YELLOW}1️⃣  Checking Backend Connection...${NC}"
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    HEALTH=$(curl -s http://localhost:5000/api/health)
    echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo "   Start with: cd Backend && npm start"
fi

echo ""

# Check if frontend is running
echo -e "${YELLOW}2️⃣  Checking Frontend Connection...${NC}"
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo "   Start with: cd Frontend && npm run dev"
fi

echo ""

# Test auth endpoints
echo -e "${YELLOW}3️⃣  Testing Registration Endpoint...${NC}"
REG_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test'$(date +%s)'@example.com",
    "password": "test123456"
  }')

if echo "$REG_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Registration working${NC}"
    echo "   Response: $(echo "$REG_RESPONSE" | grep -o '"email":"[^"]*"')"
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "   Response: $REG_RESPONSE"
fi

echo ""

# Test login
echo -e "${YELLOW}4️⃣  Testing Login Endpoint...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token\|email"; then
    echo -e "${GREEN}✅ Login endpoint responding${NC}"
    echo "   Response received"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "   Response: $LOGIN_RESPONSE"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Verification complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Try SignUp/Login"
echo "3. Check browser console for any errors"
