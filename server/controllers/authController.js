import "dotenv/config";
import bcrypt from "bcryptjs";
import { query } from "../db/client.js";
import { signToken } from "../utils/jwt.js";
import { isEmail, minLength, requireFields } from "../utils/validate.js";

export const register = async (req, res, next) => {
  try {
    const required = ["email", "password", "specialty", "experience_level"];
    const { ok, missing } = requireFields(req.body, required);
    if (!ok) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }
    const { email, password, specialty, experience_level } = req.body;
    if (!isEmail(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }
    if (!minLength(password, 6)) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rowCount) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      "INSERT INTO users(email, password_hash, specialty, experience_level) VALUES($1,$2,$3,$4) RETURNING id, email, role, specialty, experience_level",
      [email, hash, specialty, experience_level]
    );
    const user = rows[0];
    await query(
      "INSERT INTO entitlements(user_id, plan, status, trial_used) VALUES($1,'free','inactive',FALSE) ON CONFLICT (user_id) DO NOTHING",
      [user.id]
    );

    const token = signToken({ id: user.id, email: user.email });
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const required = ["email", "password"];
    const { ok, missing } = requireFields(req.body, required);
    if (!ok) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }
    const { email, password } = req.body;
    const { rows } = await query(
      "SELECT id, email, password_hash, role, specialty, experience_level FROM users WHERE email=$1",
      [email]
    );
    if (!rows.length) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = signToken({ id: user.id, email: user.email });
    delete user.password_hash;
    return res.json({ user, token });
  } catch (err) {
    return next(err);
  }
};

export const me = async (req, res) => {
  return res.json({ user: req.user });
};

