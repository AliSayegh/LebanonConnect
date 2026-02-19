import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

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
    </motion.header>
  );
}
