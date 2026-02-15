import axios from "axios";

// Use env var or default to localhost
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export const api = (token) =>
  axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
