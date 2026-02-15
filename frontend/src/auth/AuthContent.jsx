import { useMemo, useState } from "react";
import { api } from "../api";
import { AuthCtx } from "./authCtx";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const client = useMemo(() => api(token), [token]);

  const login = async (email, password) => {
    const res = await client.post("/api/auth/login", { email, password });
    const { token: t, user: u } = res.data;

    setToken(t);
    setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    return u;
  };

  const register = async (payload) => {
    await client.post("/api/auth/register", payload);
    return login(payload.email, payload.password);
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthCtx.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
