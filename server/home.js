import express from "express";
import db from "./db.js";
import { addparticipantonAcceptance } from "./chat.js";

const homeRouter = express.Router();

homeRouter.get("/home", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.redirect("/login");
    return;
  }
  try {
    const searchQuery = req.query.q || req.query.search;
    if (searchQuery) {
      const response = await db.query(
        `SELECT m.id, m.message_text, m.created_at, m.user_id,
                u.email, u.typeofuser
         FROM message m
         JOIN users u ON m.user_id = u.id
         WHERE m.message_text ILIKE $1
         ORDER BY m.created_at DESC`,
        [`%${searchQuery}%`]
      );
      return res.json({ user: req.user, messages: response.rows });
    }
    const data = await db.query(
      `SELECT m.id, m.message_text, m.created_at, m.user_id,
              u.email, u.typeofuser
       FROM message m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC`
    );
    return res.json({ user: req.user, messages: data.rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

homeRouter.post("/messages/:messageId/apply", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const messageId = req.params.messageId;
    const userId    = req.user?.id;

    const messageResult = await db.query(
      `SELECT m.user_id, u.typeofuser AS owner_type
       FROM message m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [messageId]
    );
    if (messageResult.rows.length === 0)
      return res.status(404).json({ message: "Message not found" });

    const ownerId = messageResult.rows[0].user_id;

    if (ownerId === userId)
      return res.status(403).json({ message: "You cannot apply to your own message" });

    if (req.user?.typeofuser === "staff")
      return res.status(403).json({ message: "Staff cannot apply to messages" });

    const applicationResult = await db.query(
      `INSERT INTO application (message_id, applicant_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, applicant_id)
       DO UPDATE SET updated_at = now()
       RETURNING *`,
      [messageId, userId]
    );
    res.json({ success: true, application: applicationResult.rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

homeRouter.get("/messages/:messageId/applications", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const messageId = req.params.messageId;

    const messageResult = await db.query(
      "SELECT user_id FROM message WHERE id = $1",
      [messageId]
    );
    if (messageResult.rows.length === 0)
      return res.status(404).json({ message: "Message not found" });

    if (messageResult.rows[0].user_id !== req.user.id)
      return res.status(403).json({ message: "You are not the owner of this message" });

    const applicants = await db.query(
      `SELECT a.id, a.status, a.created_at,
              u.id    AS applicant_id,
              u.email AS applicant_email
       FROM application a
       JOIN users u ON a.applicant_id = u.id
       WHERE a.message_id = $1`,
      [messageId]
    );
    res.json(applicants.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

homeRouter.get("/apply", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const applications = await db.query(
      `SELECT a.id, a.message_id, a.status, a.created_at,
              m.message_text,
              u.email
       FROM application a
       JOIN message m ON a.message_id = m.id
       JOIN users u ON m.user_id = u.id
       WHERE a.applicant_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(applications.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/applications/:applicationId/status
// This is the main route the frontend uses to accept/reject
// When status is 'accepted' — auto-creates chat room and adds participant
homeRouter.put("/applications/:applicationId/status", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const applicationId = req.params.applicationId;
    const newStatus     = req.body.status;

    if (!["pending", "accepted", "rejected"].includes(newStatus))
      return res.status(400).json({ message: "Invalid status value" });

    // Get application details before updating
    const appResult = await db.query(
      `SELECT a.message_id, a.applicant_id, m.user_id AS owner_id
       FROM application a
       JOIN message m ON m.id = a.message_id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!appResult.rows.length)
      return res.status(404).json({ message: "Application not found" });

    const { message_id, applicant_id, owner_id } = appResult.rows[0];

    // Only the message owner can change status
    if (owner_id !== req.user.id)
      return res.status(403).json({ message: "Only the message owner can update status" });

    // Update status
    const updateResult = await db.query(
      `UPDATE application
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [newStatus, applicationId]
    );

    // ── KEY PART ──
    // If accepted — auto create chat room and add both owner and applicant
    if (newStatus === "accepted") {
      try {
        await addparticipantonAcceptance(message_id, applicant_id);
      } catch (chatErr) {
        // Do not fail the acceptance if chat setup fails
        // Just log it — the status update already succeeded
        console.error("Chat room setup failed:", chatErr.message);
      }
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/messages/:messageId/accept/:applicantId
// Direct accept route — also triggers chat room creation
homeRouter.post("/messages/:messageId/accept/:applicantId", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    // correct param names — was destructuring userId which does not exist
    const { messageId, applicantId } = req.params;

    // Verify the calling user owns the message
    const msg = await db.query(
      "SELECT user_id FROM message WHERE id = $1",
      [messageId]
    );
    if (!msg.rows.length)
      return res.status(404).json({ message: "Message not found" });

    if (msg.rows[0].user_id !== req.user.id)
      return res.status(403).json({ message: "Only the message owner can accept applicants" });

    // Update application status
    await db.query(
      `UPDATE application
       SET status = 'accepted', updated_at = now()
       WHERE message_id = $1 AND applicant_id = $2`,
      [messageId, applicantId]
    );

    // Auto create chat room and add both participants
    const roomId = await addparticipantonAcceptance(messageId, applicantId);

    res.json({ ok: true, roomId });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default homeRouter;