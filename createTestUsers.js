/* One-time helper to seed test users and an admin.
   Usage (run from repo root):
   DATABASE_URL="postgresql://.../dbname?sslmode=require" node createTestUsers.js
*/
const path = require("path");
const fallbackRequire = (pkg) => require(path.join(__dirname, "server", "node_modules", pkg));

let bcrypt;
let Client;
try {
  bcrypt = require("bcryptjs");
  ({ Client } = require("pg"));
} catch (_e) {
  bcrypt = fallbackRequire("bcryptjs");
  ({ Client } = fallbackRequire("pg"));
}

const USERS = [
  { email: "test1@shiftready.app", role: "user" },
  { email: "test2@shiftready.app", role: "user" },
  { email: "test3@shiftready.app", role: "user" },
  { email: "test4@shiftready.app", role: "user" },
  { email: "test5@shiftready.app", role: "user" },
  { email: "admin@shiftready.app", role: "admin" },
];

const PASSWORD = "ShiftReady123!";

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const hash = await bcrypt.hash(PASSWORD, 10);
    await client.query("BEGIN");

    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1,$2,$3)
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role
         RETURNING id`,
        [u.email, hash, u.role]
      );
      const userId = rows[0].id;
      await client.query(
        `INSERT INTO entitlements (user_id, plan, status, trial_used, updated_at)
         VALUES ($1,'pro','active',TRUE,NOW())
         ON CONFLICT (user_id) DO UPDATE SET plan='pro', status='active', trial_used=TRUE, updated_at=NOW()`,
        [userId]
      );
    }

    await client.query("COMMIT");
    console.log("Seeded users:");
    USERS.forEach((u) => {
      console.log(`- ${u.email} / ${PASSWORD} (${u.role})`);
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

