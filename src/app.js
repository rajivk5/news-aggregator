const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { fetchNews } = require("./services/newsService");
require("dotenv").config();

const app = express();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

// Authentication middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Signup
app.post("/users/signup", async (req, res) => {
  try {
    const { name, email, password, preferences } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    return res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }

    console.error("Signup error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Login
app.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get preferences
app.get("/users/preferences", authenticateToken, (req, res) => {
  return res.status(200).json({
    preferences: req.user.preferences,
  });
});

// Update preferences
app.put("/users/preferences", authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({
        message: "Preferences must be an array",
      });
    }

    req.user.preferences = preferences;
    await req.user.save();

    return res.status(200).json({
      message: "Preferences updated successfully",
      preferences: req.user.preferences,
    });
  } catch (error) {
    console.error("Preferences update error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//  authenticated news endpoint

app.get("/news", authenticateToken, async (req, res) => {
  try {
    const category = req.query.category || "technology";
    const articles = await fetchNews(category);

    return res.status(200).json({ news: articles });
  } catch (error) {
    console.error("News API error:", error.message);

    return res.status(502).json({
      message: "Unable to fetch news at the moment",
    });
  }
});

// Start the server only when this file is run directly
if (require.main === module) {
  connectDB()
    .then(() => {
      console.log("Database connection is successful");

      app.listen(3000, () => {
        console.log("Server is running on port 3000");
      });
    })
    .catch((error) => {
      console.error("Database connection failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = app;
