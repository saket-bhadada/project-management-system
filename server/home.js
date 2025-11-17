import express from "express";

const router = express.Router();

// In-memory messages store (keeps messages while server runs)
const messages = [
    { id: 1, message: 'Hello from server', email: 'server@example.com', created_at: new Date().toISOString() },
];

// Single endpoint: GET /api/home -> return messages
//                  POST /api/home -> add message
router.route('/home')
    .get((req, res) => {
        res.json(messages);
    })
    .post((req, res) => {
        const { message, email } = req.body || {};
        if (!message) return res.status(400).json({ error: 'message is required' });
        const id = messages.length ? messages[messages.length - 1].id + 1 : 1;
        const newMsg = { id, message, email: email || '', created_at: new Date().toISOString() };
        messages.push(newMsg);
        res.status(201).json(newMsg);
    });

export default router;