#!/bin/bash

# SpeakEase AI - Complete Setup & Testing Guide

echo "================================================"
echo "🚀 SpeakEase AI - Full Stack Setup"
echo "================================================"

# Backend Setup
echo ""
echo "📦 Backend Setup..."
cd Backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Backend Server
echo ""
echo "🔧 Starting Backend Server on http://localhost:5000"
echo "Press Ctrl+C to stop"
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Test backend health check
echo ""
echo "🧪 Testing backend health check..."
curl http://localhost:5000/api/health

# Frontend Setup
echo ""
echo "📦 Frontend Setup..."
cd ../Frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Frontend Dev Server
echo ""
echo "🔧 Starting Frontend Dev Server on http://localhost:5173"
echo "Press Ctrl+C to stop"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

echo ""
echo "================================================"
echo "✅ Both servers running!"
echo "================================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:5000"
echo ""
echo "Test Flow:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Click 'SignUp' to create an account"
echo "3. Enter: name, email, password (min 6 chars)"
echo "4. Click 'Sign Up' button"
echo "5. You should be logged in and redirected to home"
echo "6. Logout and try Login with same credentials"
echo ""
echo "================================================"

# Keep servers running
wait $BACKEND_PID $FRONTEND_PID
