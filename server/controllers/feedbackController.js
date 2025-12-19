import "dotenv/config";
import { query } from "../db/client.js";

const validateFeedback = (body) => {
  const required = ["sessionId", "feltReal", "helpfulFeedback", "scoreFair", "wouldUseAgain"];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      return `Missing field: ${field}`;
    }
  }
  const inRange = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
  if (!inRange(body.feltReal)) return "feltReal must be 1-5";
  if (!inRange(body.helpfulFeedback)) return "helpfulFeedback must be 1-5";
  if (!inRange(body.scoreFair)) return "scoreFair must be 1-5";
  if (!["yes", "maybe", "no"].includes(String(body.wouldUseAgain))) {
    return "wouldUseAgain must be yes|maybe|no";
  }
  return null;
};

export const createFeedback = async (req, res, next) => {
  try {
    const errMsg = validateFeedback(req.body);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const issues = Array.isArray(req.body.issues) ? req.body.issues : [];
    await query(
      `INSERT INTO feedback (user_id, session_id, felt_real, helpful_feedback, score_fair, issues, would_use_again, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        req.user?.id || null,
        req.body.sessionId,
        req.body.feltReal,
        req.body.helpfulFeedback,
        req.body.scoreFair,
        issues,
        req.body.wouldUseAgain,
        req.body.note || null,
      ]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

export const listFeedback = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, user_id, session_id, felt_real, helpful_feedback, score_fair, issues, would_use_again, note, created_at
       FROM feedback
       ORDER BY created_at DESC
       LIMIT 200`
    );
    return res.json({ feedback: rows });
  } catch (err) {
    return next(err);
  }
};

export const listFeedbackCsv = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, user_id, session_id, felt_real, helpful_feedback, score_fair, issues, would_use_again, note, created_at
       FROM feedback
       ORDER BY created_at DESC
       LIMIT 200`
    );
    const header = "id,user_id,session_id,felt_real,helpful_feedback,score_fair,issues,would_use_again,note,created_at";
    const csvRows = rows.map((r) =>
      [
        r.id,
        r.user_id,
        r.session_id,
        r.felt_real,
        r.helpful_feedback,
        r.score_fair,
        `"${(r.issues || []).join(";")}"`,
        r.would_use_again,
        `"${(r.note || "").replace(/"/g, '""')}"`,
        r.created_at.toISOString(),
      ].join(",")
    );
    res.setHeader("Content-Type", "text/csv");
    return res.send([header, ...csvRows].join("\n"));
  } catch (err) {
    return next(err);
  }
};

