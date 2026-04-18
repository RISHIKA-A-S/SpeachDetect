// Test file to verify backend setup
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

console.log("🔍 Testing Backend Setup...\n");

// Check environment variables
console.log("📋 Environment Variables:");
console.log("  MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Missing");
console.log("  JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Missing");
console.log("  PORT:", process.env.PORT || "5000", "✅");
console.log();

// Test MongoDB connection
console.log("🔗 Testing MongoDB Connection...");
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected!\n");

    // Check if User model exists
    console.log("🔍 Checking User Model...");
    const userCount = await User.countDocuments();
    console.log(`✅ User model works (${userCount} users in database)\n`);

    // Test bcrypt
    console.log("🔐 Testing Bcrypt...");
    const password = "testpassword";
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const isMatch = await bcrypt.compare(password, hashed);
    console.log("  Password:", password);
    console.log("  Hashed:", hashed.substring(0, 20) + "...");
    console.log("  Match result:", isMatch ? "✅ True" : "❌ False");
    console.log();

    // Test JWT
    console.log("🔑 Testing JWT...");
    const token = jwt.sign({ id: "testid" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log("  Token:", token.substring(0, 30) + "...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("  Decoded ID:", decoded.id === "testid" ? "✅ Correct" : "❌ Wrong");
    console.log();

    // Test finding user by email
    console.log("🔍 Checking for test user...");
    const testUser = await User.findOne({ email: "test@test.com" });
    if (testUser) {
      console.log("✅ Test user found:", testUser.email);
    } else {
      console.log("❌ Test user not found (this might be the issue!)");
    }

    console.log("\n✅ All tests passed! Backend setup looks good.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    console.error("\n💡 Possible solutions:");
    console.error("   1. Check MongoDB Atlas connection string");
    console.error("   2. Verify IP whitelist in MongoDB Atlas");
    console.error("   3. Check if .env file has correct MONGO_URI");
    process.exit(1);
  });
