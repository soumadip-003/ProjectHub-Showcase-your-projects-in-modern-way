require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./src/routes/authRoutes");
const studentAuthRoutes = require("./src/routes/studentAuthRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const projectRoutes = require("./src/routes/projectRoutes");
const directoryRoutes = require("./src/routes/directoryRoutes");
const institutionSignupRoutes = require("./src/routes/institutionSignupRoutes");
const supportChatRoutes = require("./src/routes/supportChatRoutes");
const path = require("path");
const institutionSettingsRoutes = require("./src/routes/institutionSettingsRoutes");

const app = express();

// Security headers
app.use(helmet());

// Frontend connection - CORS configuration
const allowedOrigins = [
  "http://localhost:4002",
  "http://127.0.0.1:4002",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked this origin: ${origin}`)
      );
    },
    credentials: true,
  })
);


// Parse JSON requests
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/auth/student", studentAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/chats", supportChatRoutes);
app.use("/api/institutions", institutionSignupRoutes);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

app.use("/api/institutions", institutionSettingsRoutes);
// Limit repeated API requests
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

// Homepage test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProjectHub backend is running!",
  });
});

// Database health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected",
  });
});

// Start server after connecting to MongoDB
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB Atlas connected successfully!");

    app.listen(PORT, () => {
      console.log(
        `ProjectHub backend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);

    if (error.name === "MongooseServerSelectionError") {
      const servers = error.reason?.servers;

      if (servers?.size) {
        for (const [address, server] of servers) {
          if (server.error) {
            console.error(
              `MongoDB node ${address} connection failed:`,
              server.error.message
            );
          }
        }
      }

      console.error(
        "Check Atlas Network Access (allow your current public IP), confirm the cluster is active, and verify that your network permits TLS connections to Atlas."
      );
    }

    process.exit(1);
  }
}

startServer();
