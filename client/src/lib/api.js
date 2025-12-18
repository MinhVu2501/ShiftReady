// Central API base helper with dev fallback
export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/$/,
  ""
);
export const apiUrl = (path) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

const defaultHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

const handle = async (res) => {
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.message || "Request failed");
  }
  return res.json();
};

export const api = {
  get: (path) =>
    fetch(apiUrl(path), {
      headers: { ...defaultHeaders() },
    }).then(handle),
  post: (path, body) =>
    fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...defaultHeaders() },
      body: JSON.stringify(body),
    }).then(handle),
};

