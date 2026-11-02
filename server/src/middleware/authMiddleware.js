const jwt = require("jsonwebtoken");
const Institution = require("../models/Institution");
const Student = require("../models/Student");

// Student Authentication
async function protectStudent(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Student authentication required. Please log in."
      });
    }

    const decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    );

    if (decoded.role !== "student" || !decoded.studentId) {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    const student = await Student.findById(decoded.studentId);

    if (!student || !student.isActive) {
      return res.status(401).json({
        success: false,
        message: "Student account not found or inactive."
      });
    }

    req.student = student;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

// Institution Authentication
async function protectInstitution(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in."
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only institution tokens are allowed
    if (!decoded.institutionId || decoded.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Institution access only."
      });
    }

    const institution = await Institution.findById(
      decoded.institutionId
    );

    if (!institution || !institution.isActive) {
      return res.status(401).json({
        success: false,
        message: "Institution account not found or inactive."
      });
    }

    // Only Admin-approved institutions can access protected routes
    if (institution.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: `Your institution account is ${institution.status || "Pending"}. Admin approval is required.`
      });
    }

    req.institution = institution;
    return next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}


// Admin Authentication
function protectAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required."
      });
    }

    const token = authHeader.slice(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer: "projecthub",
        audience: "projecthub-admin"
      }
    );

    const configuredAdminEmail = (
      process.env.ADMIN_EMAIL || ""
    ).trim().toLowerCase();

    if (
      decoded.role !== "admin" ||
      !decoded.email ||
      decoded.email.toLowerCase() !== configuredAdminEmail
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access only."
      });
    }

    req.admin = {
      email: decoded.email,
      role: "admin"
    };

    return next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

module.exports = {
  protectStudent,
  protectInstitution,
  protectAdmin
};
