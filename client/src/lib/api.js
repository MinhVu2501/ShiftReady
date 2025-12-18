import { apiUrl } from "./apiBase.js";

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

