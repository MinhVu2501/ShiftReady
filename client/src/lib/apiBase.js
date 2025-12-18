// Central API base helper; trims trailing slash and builds absolute URLs.
let warnedMissingBase = false;
const rawBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

if (import.meta.env.PROD && !rawBase && !warnedMissingBase) {
  warnedMissingBase = true;
  console.error("VITE_API_URL is missing in production; set it to your API base URL (e.g., https://shiftready-server.onrender.com).");
}

export const API_BASE = rawBase;
export const apiUrl = (path) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

