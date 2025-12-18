import "dotenv/config";
import { verifyToken } from "../utils/jwt.js";
import { query } from "../db/client.js";

export default async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    const { rows } = await query(
      "SELECT id, email, role, specialty, experience_level FROM users WHERE id = $1",
      [decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = rows[0];
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

