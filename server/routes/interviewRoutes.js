import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  answerQuestion,
  getInterview,
  listInterviews,
  startInterview,
} from "../controllers/interviewController.js";

const router = Router();

router.use(auth);

router.post("/start", startInterview);
router.post("/:id/answer", answerQuestion);
router.get("/", listInterviews);
router.get("/:id", getInterview);

export default router;

