# ⚠️ 500 Error - MongoDB Connection Issue

## Problem
MongoDB Atlas connection is timing out, causing **500 errors** on all auth endpoints.

## Root Cause
Your MongoDB URI is set to MongoDB Atlas (cloud), but either:
1. ❌ Your IP address isn't whitelisted in MongoDB Atlas
2. ❌ Network connectivity to MongoDB is blocked
3. ❌ MONGO_URI string is incorrect

## Solutions (Choose One)

### Solution 1: Fix MongoDB Atlas IP Whitelist (Recommended)

**Step 1: Go to MongoDB Atlas Dashboard**
- Visit: https://cloud.mongodb.com/
- Login with your account
- Select your cluster (AIProj)
- Click "Security" → "Network Access"

**Step 2: Add Your Current IP**
- Click "Add IP Address"
- Select "Allow access from anywhere" (for development) OR
- Click "Add Current IP Address"
- Confirm

**Step 3: Verify Connection**
Run this in your terminal:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

Should now return login response instead of 500 error.

---

### Solution 2: Use Local MongoDB (Alternative)

If you don't have MongoDB Atlas setup yet, use local MongoDB:

**Step 1: Install MongoDB locally**
```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Step 2: Update .env**
```
MONGO_URI=mongodb://localhost:27017/speakease
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Step 3: Restart Backend**
```bash
npm start
```

---

### Solution 3: Use MongoDB URI String Directly

If you're getting authentication errors, verify your MONGO_URI:

**Check format:**
```
mongodb+srv://username:password@cluster.mongodb.net/dbname?appName=AppName
```

**Your current URI should look like:**
```
mongodb+srv://rishikaas24:db_user@aiproj.xnksxof.mongodb.net/?appName=AIProj
```

⚠️ **Important:** Make sure there are NO special characters in password. If you have special characters, they need to be URL-encoded:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- etc.

---

## Quick Test After Fix

After applying one of the solutions above, test immediately:

```bash
# Terminal 1: Restart Backend
cd Backend
npm start

# Terminal 2: Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

**Expected Response** (NOT 500 error):
```json
{
  "message": "Invalid email or password"
}
```
OR
```json
{
  "success": true,
  "_id": "...",
  "name": "test",
  "email": "test@test.com",
  "token": "eyJhbGc..."
}
```

---

## Recommended: Solution 1 (Atlas IP Whitelist)

Since you already have MongoDB Atlas setup, simply whitelist your IP:

1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"  
3. Select "Allow Access From Anywhere" (for development)
4. Click "Confirm"
5. Restart your backend - it should work now!

---

## Still Getting 500 Error?

Check these:
1. Backend logs for actual error message
2. Make sure you're sending correct JSON in request
3. Verify .env file has all variables
4. Check if test user exists in database

---

## After Fix

Once MongoDB connects:
- ✅ Login/Signup will work
- ✅ Frontend-Backend communication will work
- ✅ Tokens will be generated and saved
- ✅ Protected routes will work
