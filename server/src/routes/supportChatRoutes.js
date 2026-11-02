const express = require("express");
const mongoose = require("mongoose");

const SupportChat = require("../models/SupportChat");
const { protectAdmin, protectInstitution } = require("../middleware/authMiddleware");

const router = express.Router();
const CHAT_LIFETIME_MS = 24 * 60 * 60 * 1000;

function getMessageText(body) {
  if (typeof body?.text !== "string" || !body.text.trim()) {
    return null;
  }

  const text = body.text.trim();
  return text.length <= 2000 ? text : null;
}

function getNewChatDates(now) {
  return {
    startedAt: now,
    expiresAt: new Date(now.getTime() + CHAT_LIFETIME_MS),
  };
}

async function addInstitutionMessage(institutionId, text) {
  const now = new Date();
  const message = { sender: "institution", text, sentAt: now };
  const activeChat = await SupportChat.findOneAndUpdate(
    { institution: institutionId, expiresAt: { $gt: now } },
    { $push: { messages: message } },
    { new: true }
  );

  if (activeChat) return activeChat;

  const dates = getNewChatDates(now);

  try {
    return await SupportChat.create({
      institution: institutionId,
      messages: [message],
      ...dates,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;

    const restartedChat = await SupportChat.findOneAndUpdate(
      { institution: institutionId, expiresAt: { $lte: now } },
      { $set: { messages: [message], ...dates } },
      { new: true }
    );

    if (restartedChat) return restartedChat;

    const concurrentChat = await SupportChat.findOneAndUpdate(
      { institution: institutionId, expiresAt: { $gt: now } },
      { $push: { messages: message } },
      { new: true }
    );

    if (concurrentChat) return concurrentChat;
    throw error;
  }
}

router.get("/institution", protectInstitution, async (req, res) => {
  try {
    const chat = await SupportChat.findOne({
      institution: req.institution._id,
      expiresAt: { $gt: new Date() },
    }).lean();

    return res.status(200).json({ success: true, chat: chat || null });
  } catch (error) {
    console.error("Institution support chat fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load the support chat.",
    });
  }
});

router.post("/institution/messages", protectInstitution, async (req, res) => {
  const text = getMessageText(req.body);

  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Enter a message of 1 to 2000 characters.",
    });
  }

  try {
    const chat = await addInstitutionMessage(req.institution._id, text);
    return res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error("Institution support chat send error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not send your message.",
    });
  }
});

router.get("/admin", protectAdmin, async (req, res) => {
  try {
    const chats = await SupportChat.find({ expiresAt: { $gt: new Date() } })
      .populate("institution", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, chats });
  } catch (error) {
    console.error("Admin support chats fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load support chats.",
    });
  }
});

router.post("/:chatId/messages", protectAdmin, async (req, res) => {
  const { chatId } = req.params;
  const text = getMessageText(req.body);

  if (!mongoose.isValidObjectId(chatId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid chat ID.",
    });
  }

  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Enter a message of 1 to 2000 characters.",
    });
  }

  try {
    const now = new Date();
    const chat = await SupportChat.findOneAndUpdate(
      { _id: chatId, expiresAt: { $gt: now } },
      {
        $push: {
          messages: { sender: "admin", text, sentAt: now },
        },
      },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "This support chat has expired.",
      });
    }

    return res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error("Admin support chat send error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not send your reply.",
    });
  }
});

module.exports = router;
