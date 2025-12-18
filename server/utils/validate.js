export const requireFields = (body, fields) => {
  const missing = fields.filter((f) => !body[f]);
  return { ok: missing.length === 0, missing };
};

export const isEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const minLength = (value, len) =>
  typeof value === "string" && value.length >= len;

