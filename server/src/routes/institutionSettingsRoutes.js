
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Institution = require("../models/Institution");
const { protectInstitution } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDirectory = path.join(
  __dirname,
  "../../uploads/institutions"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `institution-${req.institution._id}-${Date.now()}${extension}`;
    callback(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Only JPG, PNG and WEBP images are allowed."));
    }

    callback(null, true);
  },
});

function deleteOldLogo(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith("/uploads/institutions/")) return;

  const filename = path.basename(logoUrl);
  const filePath = path.join(uploadDirectory, filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (error) => {
      if (error) console.error("Could not delete old logo:", error.message);
    });
  }
}

// Upload or replace the authenticated institution's logo.
router.patch(
  "/me/logo",
  protectInstitution,
  (req, res, next) => {
    upload.single("logo")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || "Logo upload failed.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please select a logo image." });
      }

      const institution = await Institution.findById(req.institution._id);

      if (!institution) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ message: "Institution not found." });
      }

      const oldLogo = institution.logo;
      institution.logo = `/uploads/institutions/${req.file.filename}`;

      await institution.save();
      deleteOldLogo(oldLogo);

      res.json({
        success: true,
        message: "Institution logo updated successfully.",
        institution: {
          _id: institution._id,
          name: institution.name,
          email: institution.email,
          logo: institution.logo,
          location: institution.location,
          website: institution.website,
          description: institution.description,
          contactEmail: institution.contactEmail,
          status: institution.status,
        },
      });
    } catch (error) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error("Logo upload error:", error);
      res.status(500).json({ message: "Unable to save institution logo." });
    }
  }
);

// Remove the authenticated institution's logo.
router.delete("/me/logo", protectInstitution, async (req, res) => {
  try {
    const institution = await Institution.findById(req.institution._id);

    if (!institution) {
      return res.status(404).json({ message: "Institution not found." });
    }

    const oldLogo = institution.logo;
    institution.logo = "";
    await institution.save();

    deleteOldLogo(oldLogo);

    res.json({
      success: true,
      message: "Institution logo removed successfully.",
      institution: {
        _id: institution._id,
        name: institution.name,
        email: institution.email,
        logo: "",
        location: institution.location,
        website: institution.website,
        description: institution.description,
        contactEmail: institution.contactEmail,
        status: institution.status,
      },
    });
  } catch (error) {
    console.error("Logo removal error:", error);
    res.status(500).json({ message: "Unable to remove institution logo." });
  }
});

module.exports = router;
