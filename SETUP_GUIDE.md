# SpeakEase AI - Setup & Testing Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (either local or MongoDB Atlas)
- npm (comes with Node.js)

## Quick Start

### 1. Backend Setup

```bash
cd Backend
npm install
```

**Environment Configuration:**
Update `.env` file with your settings:
```
MONGO_URI=mongodb+srv://rishikaas24:db_user@aiproj.xnksxof.mongodb.net/?appName=AIProj
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Start Backend:**
```bash
npm start
```

Expected output:
```
✅ MongoDB connected
✅ Server running on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd Frontend
npm install
```

**Start Frontend Dev Server:**
```bash
npm run dev
```

Expected output:
```
VITE v8.0.4  ready in 123 ms

➜  Local:   http://localhost:5173/
```

## Verify Connection

### Health Check Endpoint
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"Server is running","port":5000}
```

## Testing Authentication

### 1. Test Registration (SignUp)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "success": true,
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Expected response: Same as registration (with token)

### 3. Test Protected Route (Get Profile)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

Expected response:
```json
{
  "success": true,
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com"
}
```

## Frontend Testing Steps

1. **Open browser:** http://localhost:5173
2. **Click SignUp** and create an account
   - Name: Your Name
   - Email: your@email.com
   - Password: min 6 characters
3. **Verify:**
   - ✅ You should be logged in
   - ✅ Token should be saved in localStorage
   - ✅ Navbar should show "Logout" button
4. **Logout** and try Login with same credentials
5. **Test Protected Routes:**
   - Go to /stutter-help (should work if logged in)
   - Go to /therapy (should work if logged in)

## Common Issues & Solutions

### Issue: "CORS error" or "Network error"
**Solution:**
1. Check if backend is running on port 5000
2. Verify `.env` has `FRONTEND_URL=http://localhost:5173`
3. Check browser console for exact error
4. Clear browser cache (Ctrl+Shift+Delete)

### Issue: "User already exists"
**Solution:** Use a different email address for testing

### Issue: "Invalid email or password"
**Solution:** Make sure email and password match exactly (case-sensitive)

### Issue: "MongoDB connection error"
**Solution:**
1. Check if MongoDB is running (local) or accessible (Atlas)
2. Verify `MONGO_URI` in `.env` is correct
3. Check database permissions

### Issue: "Cannot find module 'axios'"
**Solution:** Run `npm install` in Frontend directory

## Architecture Overview

```
Frontend (React + Vite)
    ↓ (HTTP Requests)
Backend (Express + Node.js)
    ↓ (Database Queries)
MongoDB (Database)
```

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/auth/register` | Create new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get user profile (Protected) |

## File Structure

```
Backend/
├── server.js (Main server file)
├── config/db.js (MongoDB connection)
├── models/User.js (User schema)
├── controllers/authController.js (Auth logic)
├── middlewares/authMiddleware.js (JWT verification)
├── routes/authRoutes.js (Auth routes)
├── package.json (Dependencies)
└── .env (Environment variables)

Frontend/
├── src/
│   ├── App.jsx (Main app)
│   ├── main.jsx (Entry point)
│   ├── components/ (React components)
│   ├── pages/Auth/ (Login/SignUp pages)
│   ├── context/UserContext.jsx (Global user state)
│   └── utils/
│       ├── apiPaths.js (API endpoints)
│       ├── axiosInstance.js (HTTP client)
│       └── helper.js (Utilities)
├── vite.config.js (Vite config)
└── package.json (Dependencies)
```

## Next Steps

1. ✅ Backend running on port 5000
2. ✅ Frontend running on port 5173
3. ✅ Database connected
4. ✅ Auth endpoints working
5. 🔄 Next: Integrate stutter detection API
6. 🔄 Next: Add therapy features

## Support

If you encounter any issues:
1. Check the error message in the browser console
2. Check the backend terminal logs
3. Verify all environment variables are set correctly
4. Make sure both servers are running
5. Check MongoDB connection status
