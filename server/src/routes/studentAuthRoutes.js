const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const { protectStudent } = require("../middleware/authMiddleware");

const router = express.Router();

function createStudentToken(student) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { studentId: student._id.toString(), role: "student" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function studentPayload(student) {
  return {
    id: student._id,
    name: student.name,
    email: student.email,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name and email, and a password of 8-128 characters.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingStudent = await Student.exists({ email: normalizedEmail });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const student = await Student.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
    });

    return res.status(201).json({
      success: true,
      message: "Student account created successfully.",
      token: createStudentToken(student),
      student: studentPayload(student),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Student registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create the student account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const student = await Student.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (
      !student ||
      !student.isActive ||
      !(await bcrypt.compare(password, student.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student login successful.",
      token: createStudentToken(student),
      student: studentPayload(student),
    });
  } catch (error) {
    console.error("Student login error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not sign in.",
    });
  }
});

router.get("/me", protectStudent, (req, res) => {
  return res.status(200).json({
    success: true,
    student: studentPayload(req.student),
  });
});

module.exports = router;
