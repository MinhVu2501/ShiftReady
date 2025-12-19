import "dotenv/config";
import { query } from "../db/client.js";

const asRating = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
};

const normalizeFeedback = (body) => {
  const realistic = asRating(body.realistic ?? body.feltReal ?? body.realism);
  const helpful = asRating(body.helpful ?? body.helpfulFeedback ?? body.helpfulness);
  const scoringFair = asRating(body.scoringFair ?? body.scoreFair ?? body.fairness);

  const issues = Array.isArray(body.issues)
    ? body.issues.filter((i) => typeof i === "string")
    : [];

  const wouldUseAgainRaw = body.wouldUseAgain || body.would_use_again;
  const wouldUseAgain =
    typeof wouldUseAgainRaw === "string"
      ? wouldUseAgainRaw.toLowerCase()
      : wouldUseAgainRaw === true
      ? "yes"
      : wouldUseAgainRaw === false
      ? "no"
      : null;

  const notes = typeof body.notes === "string" ? body.notes : typeof body.note === "string" ? body.note : "";

  const sessionId = body.sessionId || body.session_id || null;

  return {
    realistic,
    helpful,
    scoringFair,
    issues,
    wouldUseAgain,
    notes,
    sessionId,
  };
};

const validateFeedback = (payload) => {
  const required = ["realistic", "helpful", "scoringFair"];
  for (const field of required) {
    if (payload[field] === null || payload[field] === undefined) return `Missing or invalid ${field}`;
  }
  if (payload.wouldUseAgain && !["yes", "maybe", "no"].includes(payload.wouldUseAgain)) {
    return "wouldUseAgain must be yes|maybe|no";
  }
  return null;
};

export const createFeedback = async (req, res) => {
  console.log("feedback payload keys:", Object.keys(req.body || {}));
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const payload = normalizeFeedback(req.body);
  const errMsg = validateFeedback(payload);
  if (errMsg) return res.status(400).json({ message: errMsg });

  const issuesString = payload.issues.length ? payload.issues.join(", ") : "";
  const sessionId = payload.sessionId || null;

  try {
    const insertSql = `
      INSERT INTO feedback (user_id, session_id, realistic, helpful, scoring_fair, issues, would_use_again, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `;
    const result = await query(insertSql, [
      req.user.id,
      sessionId,
      payload.realistic,
      payload.helpful,
      payload.scoringFair,
      issuesString,
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

