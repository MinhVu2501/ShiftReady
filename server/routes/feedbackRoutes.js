import { Router } from "express";
import auth from "../middleware/auth.js";
import { createFeedback, listFeedback, listFeedbackCsv } from "../controllers/feedbackController.js";

const router = Router();

// Auth required for all feedback routes
router.post("/", auth, createFeedback);

// Admin-only list endpoints
router.get("/admin", auth, (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  return listFeedback(req, res, next);
});

router.get("/admin.csv", auth, (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  return listFeedbackCsv(req, res, next);
});

export default router;

