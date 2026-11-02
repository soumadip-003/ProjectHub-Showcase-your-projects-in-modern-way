const express = require("express");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const Institution = require("../models/Institution");
const {
  protectStudent,
  protectInstitution,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// HELPER: VALIDATE OPTIONAL URLS
// ==========================================
function isValidOptionalUrl(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

// ==========================================
// 1. GET ACTIVE INSTITUTIONS
// GET /api/projects/institutions
// ==========================================
router.get("/institutions", async (req, res) => {
  try {
    const institutions = await Institution.find({
      isActive: true,
    })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: institutions.length,
      institutions,
    });
  } catch (error) {
    console.error("Institution list error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load institutions.",
    });
  }
});

// ==========================================
// 2. STUDENT SUBMITS A PROJECT
// POST /api/projects
// ==========================================
router.post("/", protectStudent, async (req, res) => {
  try {
    const {
      institutionId,
      title,
      description,
      technologies,
      githubUrl,
      demoUrl,
    } = req.body;

    if (
      !institutionId ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Institution, project title, and description are required.",
      });
    }

    if (!mongoose.isValidObjectId(institutionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid institution ID.",
      });
    }

    if (
      !isValidOptionalUrl(githubUrl) ||
      !isValidOptionalUrl(demoUrl)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "GitHub and demo links must be valid HTTP or HTTPS URLs.",
      });
    }

    if (
      technologies !== undefined &&
      (
        !Array.isArray(technologies) ||
        technologies.length > 30 ||
        technologies.some(
          (technology) =>
            typeof technology !== "string" ||
            !technology.trim() ||
            technology.length > 50
        )
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Technologies must be an array of valid technology names.",
      });
    }

    const institution = await Institution.findOne({
      _id: institutionId,
      isActive: true,
    });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: "Institution not found or inactive.",
      });
    }

    const project = await Project.create({
      studentName: req.student.name,
      student: req.student._id,
      institutionName: institution.name,
      institution: institution._id,
      title: title.trim(),
      description: description.trim(),
      technologies: (technologies || []).map((item) =>
        item.trim()
      ),
      githubUrl: githubUrl || "",
      demoUrl: demoUrl || "",
      status: "Pending",
    });

    console.log(
      `[PROJECT] New project submitted: "${project.title}" (Pending)`
    );

    return res.status(201).json({
      success: true,
      message:
        "Project submitted successfully and is awaiting review.",
      project,
    });
  } catch (error) {
    console.error("Project submission error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not submit the project.",
    });
  }
});

// ==========================================
// 3. STUDENT VIEWS THEIR OWN PROJECTS
// GET /api/projects/student
// ==========================================
router.get("/student", protectStudent, async (req, res) => {
  try {
    const projects = await Project.find({
      student: req.student._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Student project fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve your projects.",
    });
  }
});

// ==========================================
// 4. INSTITUTION VIEWS ITS OWN PROJECTS
// GET /api/projects/institution
// ==========================================
router.get("/institution", protectInstitution, async (req, res) => {
  try {
    const projects = await Project.find({
      institution: req.institution._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Institution project fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve institution projects.",
    });
  }
});

// ==========================================
// 5. INSTITUTION REVIEWS ITS OWN PROJECT
// PATCH /api/projects/:id/review
// ==========================================
router.patch("/:id/review", protectInstitution, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected.",
      });
    }

    const project = await Project.findOne({
      _id: id,
      institution: req.institution._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in your institution.",
      });
    }

    project.status = status;
    project.reviewedAt = new Date();

    await project.save();

    return res.status(200).json({
      success: true,
      message: `Project ${status.toLowerCase()} successfully.`,
      project,
    });
  } catch (error) {
    console.error("Institution project review error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not review the project.",
    });
  }
});

// ==========================================
// 6. INSTITUTION DELETES ITS OWN PROJECT
// DELETE /api/projects/:id
// ==========================================
router.delete("/:id", protectInstitution, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const project = await Project.findOneAndDelete({
      _id: id,
      institution: req.institution._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in your institution.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    console.error("Institution project deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete the project.",
    });
  }
});

// ==========================================
// 7. PUBLIC PROJECT GALLERY
// GET /api/projects/gallery
// Only Approved projects are displayed
// ==========================================
router.get("/gallery", async (req, res) => {
  try {
    const projects = await Project.find({
      status: "Approved",
    })
      .select(
        "studentName institutionName title description technologies githubUrl demoUrl createdAt status"
      )
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      `[GALLERY] Returning ${projects.length} approved project(s)`
    );

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Public gallery fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load the project gallery.",
    });
  }
});

module.exports = router;