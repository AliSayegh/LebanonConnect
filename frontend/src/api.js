import axios from "axios";

export const API_BASE = "http://localhost:5000";

export const api = (token) => {
  const instance = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  // Global enforcement: if banned, force logout immediately
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response &&
        (error.response.status === 403 || error.response.status === 401)
      ) {
        const msg = error.response.data?.message?.toLowerCase() || "";
        if (msg.includes("banned") || msg.includes("suspended")) {
          // Invalidate session & force redirect
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login?banned=true";
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};
