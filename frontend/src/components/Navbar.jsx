import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/useAuth";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  return (
    <motion.header
      className="nav"
      initial={{ y: -14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <Link to="/" className="brand">
        <span className="brandMark">◆</span> ServiceHub
      </Link>

      <nav className="navLinks">
        <NavLink to="/" className={({ isActive }) => (isActive ? "link active" : "link")}>
          Explore
        </NavLink>
        <button 
          className={`link ${window.location.pathname === "/" || window.location.pathname.startsWith("/services") ? "active" : ""}`}
          onClick={() => {
            if (window.location.pathname !== "/") {
              nav("/");
              setTimeout(() => {
                document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
              }, 120);
            } else {
              document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          Services
        </button>

        {user && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "link active" : "link")}>
              Dashboard
            </NavLink>

            {user.role === "customer" && (
              <NavLink to="/create" className={({ isActive }) => (isActive ? "link active" : "link")}>
                Request Job
              </NavLink>
            )}

            {user.role === "provider" && (
              <NavLink to="/subscribe" className={({ isActive }) => (isActive ? "link active" : "link")}>
                Subscription
              </NavLink>
            )}

            {user.role === "admin" && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? "link active" : "link")}>
                Admin
              </NavLink>
            )}
          </>
        )}
      </nav>

      <div className="navRight">
        <form
          className="navSearch"
          onSubmit={(e) => {
            e.preventDefault();
            const v = q.trim();
            if (!v) return;
            nav(`/search?q=${encodeURIComponent(v)}`);
          }}
        >
          <div className="navSearchInputWrap">
            <input
              className="input navSearchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search providers or services…"
              aria-label="Search"
            />
            {q && (
              <button
                type="button"
                className="navSearchClear"
                onClick={() => setQ("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button className="btn ghost navSearchBtn" type="submit" aria-label="Search">
            Search
          </button>
        </form>

        {user ? (
          <>
            <span className="pill">{user.role}</span>
            <button
              className="btn ghost"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn ghost">Login</Link>
            <Link to="/register" className="btn primary">Create account</Link>
          </>
        )}
      </div>

      <style>{`
        .navRight{ display:flex; align-items:center; gap: 10px; }
        .navSearch{ display:flex; align-items:center; gap: 8px; }
        .navSearchInputWrap { position: relative; display: flex; align-items: center; }
        .navSearchInput{
          width: 260px;
          height: 40px;
          border-radius: 14px;
          padding: 0 32px 0 12px;
        }
        .navSearchClear {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          cursor: pointer;
          padding: 4px;
          display: grid;
          place-items: center;
        }
        .navSearchClear:hover { color: #fff; }
        .navSearchBtn{ height: 40px; border-radius: 14px; padding: 0 12px; }
        @media(max-width: 980px){
          .navSearchInput{ width: 160px; }
        }
        @media(max-width: 720px){
          .navSearchInputWrap{ display:none; }
          .navSearchBtn{ padding: 0 10px; }
        }
      `}</style>
    </motion.header>
  );
}
