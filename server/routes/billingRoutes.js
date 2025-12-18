import { Router } from "express";
import auth from "../middleware/auth.js";
import { createCheckout, handleWebhook } from "../controllers/billingController.js";
import express from "express";

const router = Router();

// Webhook: must use express.raw, no JSON parsing
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Authenticated checkout
router.post("/checkout", auth, createCheckout);

export default router;

