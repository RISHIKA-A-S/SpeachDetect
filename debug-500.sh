#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 SpeakEase AI - 500 Error Debugging${NC}"
echo "=================================================="
echo ""

# Step 1: Check Backend Running
echo -e "${YELLOW}Step 1: Checking if backend is running...${NC}"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo -e "   Start with: ${BLUE}cd Backend && npm start${NC}"
    exit 1
fi

echo ""

# Step 2: Test with an existing user (from earlier curl)
echo -e "${YELLOW}Step 2: Testing Login with test user...${NC}"
echo "Email: test@test.com"
echo "Password: 123456"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}')

echo -e "${BLUE}Response:${NC}"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Check for errors
if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Login successful!${NC}"
elif echo "$LOGIN_RESPONSE" | grep -q "Invalid"; then
    echo -e "${YELLOW}⚠️  Invalid credentials (user doesn't exist or password wrong)${NC}"
    echo -e "   This means backend is working, but test user needs to be created first"
    
    # Try to create a test user
    echo ""
    echo -e "${YELLOW}Step 2b: Creating test user...${NC}"
    TIMESTAMP=$(date +%s)
    EMAIL="testuser${TIMESTAMP}@test.com"
    
    REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"Test User\",\"email\":\"${EMAIL}\",\"password\":\"password123\"}")
    
    echo -e "${BLUE}Register Response:${NC}"
    echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
    
    if echo "$REGISTER_RESPONSE" | grep -q "token"; then
        echo -e "${GREEN}✅ User created successfully!${NC}"
        echo "   Email: $EMAIL"
    else
        echo -e "${RED}❌ Failed to create user${NC}"
    fi
else
    echo -e "${RED}❌ Login returned 500 error${NC}"
    echo -e "${YELLOW}Check backend terminal for error details${NC}"
fi

echo ""
echo "=================================================="
echo -e "${BLUE}💡 Troubleshooting Tips:${NC}"
echo "1. Check backend terminal for error logs"
echo "2. Make sure .env has all variables set"
echo "3. Verify MongoDB is connected"
echo "4. Check if test user was created earlier"
echo "5. Make sure password is correct (case-sensitive)"
