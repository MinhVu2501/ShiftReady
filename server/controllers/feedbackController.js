import "dotenv/config";
import { query } from "../db/client.js";

// Accept both legacy and alternate field names to avoid frontend mismatches
const normalizeFeedback = (body) => {
  return {
    sessionId: body.sessionId || body.session_id,
    feltReal: body.feltReal ?? body.realism,
    helpfulFeedback: body.helpfulFeedback ?? body.helpfulness,
    scoreFair: body.scoreFair ?? body.fairness,
    issues: Array.isArray(body.issues) ? body.issues : [],
    wouldUseAgain: body.wouldUseAgain || body.would_use_again,
    note: body.note || body.notes || "",
  };
};

const validateFeedback = (payload) => {
  const required = ["sessionId", "feltReal", "helpfulFeedback", "scoreFair", "wouldUseAgain"];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return `Missing field: ${field}`;
    }
  }
  const inRange = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
  if (!inRange(payload.feltReal)) return "feltReal must be 1-5";
  if (!inRange(payload.helpfulFeedback)) return "helpfulFeedback must be 1-5";
  if (!inRange(payload.scoreFair)) return "scoreFair must be 1-5";
  if (!["yes", "maybe", "no"].includes(String(payload.wouldUseAgain))) {
    return "wouldUseAgain must be yes|maybe|no";
  }
  return null;
};

export const createFeedback = async (req, res, next) => {
  try {
    const payload = normalizeFeedback(req.body);
    const errMsg = validateFeedback(payload);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const issues = payload.issues;
    await query(
      `INSERT INTO feedback (user_id, session_id, felt_real, helpful_feedback, score_fair, issues, would_use_again, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        req.user?.id || null,
        payload.sessionId,
        payload.feltReal,
        payload.helpfulFeedback,
        payload.scoreFair,
        issues,
        payload.wouldUseAgain,
        payload.note || null,
      ]
    );
    return res.json({ success: true });
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

