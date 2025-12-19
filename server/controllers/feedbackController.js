import "dotenv/config";
import { query } from "../db/client.js";

// Accept both legacy and alternate field names to avoid frontend mismatches
const normalizeFeedback = (body) => {
  return {
    sessionId: body.sessionId || body.session_id || null,
    realistic: body.realistic ?? body.feltReal ?? body.realism,
    helpful: body.helpful ?? body.helpfulFeedback ?? body.helpfulness,
    scoringFair: body.scoringFair ?? body.scoreFair ?? body.fairness,
    issues: Array.isArray(body.issues) ? body.issues : [],
    wouldUseAgain: body.wouldUseAgain || body.would_use_again,
    notes: body.notes || body.note || "",
  };
};

const validateFeedback = (payload) => {
  const requiredNums = ["realistic", "helpful", "scoringFair"];
  for (const field of requiredNums) {
    if (payload[field] === undefined || payload[field] === null) return `Missing field: ${field}`;
    if (!Number.isInteger(payload[field]) || payload[field] < 1 || payload[field] > 5)
      return `${field} must be 1-5`;
  }
  if (!["yes", "maybe", "no", undefined, null].includes(payload.wouldUseAgain)) {
    return "wouldUseAgain must be yes|maybe|no";
  }
  return null;
};

export const createFeedback = async (req, res) => {
  // Temporary debug: log received keys (not token) for production tracing
  console.log("feedback payload keys:", Object.keys(req.body || {}));
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const payload = normalizeFeedback(req.body);
  const errMsg = validateFeedback(payload);
  if (errMsg) return res.status(400).json({ message: errMsg });

  // Issues stored as array (feedback table uses TEXT[]); fallback to empty array
  const issues = Array.isArray(payload.issues) ? payload.issues : [];

  try {
    const insertSql = `
      INSERT INTO feedback (user_id, session_id, felt_real, helpful_feedback, score_fair, issues, would_use_again, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `;
    const result = await query(insertSql, [
      req.user.id,
      payload.sessionId,
      payload.realistic,
      payload.helpful,
      payload.scoringFair,
      issues,
      payload.wouldUseAgain || null,
      payload.notes || null,
    ]);
    return res.status(201).json({ ok: true, feedbackId: result.rows[0].id });
  } catch (err) {
    console.error("Failed to save feedback:", err.message, err.stack);
    return res.status(500).json({ message: "Failed to save feedback" });
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

