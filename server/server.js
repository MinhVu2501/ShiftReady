import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import errorHandler from "./middleware/error.js";

const app = express();

// Apply JSON body parsing to all routes except the Stripe webhook
const jsonMiddleware = express.json();
app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/webhook") {
    return next();
  }
  return jsonMiddleware(req, res, next);
});

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ShiftReady API running on port ${PORT}`);
});

