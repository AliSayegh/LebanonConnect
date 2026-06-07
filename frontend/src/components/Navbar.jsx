import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/useAuth";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change / resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    nav(`/search?q=${encodeURIComponent(v)}`);
    closeMenu();
  };

  const navLinkClass = ({ isActive }) => isActive ? "link active" : "link";

  return (
    <>
      <motion.header
        className="nav"
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* Brand */}
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brandMark">◆</span>
          <span className="brandText">ServiceHub</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="navLinks navLinksDesktop">
          <NavLink to="/" end className={navLinkClass}>
            Explore
          </NavLink>
          <button
            className="link"
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
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>

              {user.role === "customer" && (
                <NavLink to="/create" className={navLinkClass}>
                  Request Job
                </NavLink>
              )}

              {user.role === "provider" && (
                <>
                  <NavLink to={`/provider/${user.id}`} className={navLinkClass}>
                    My Profile
                  </NavLink>
                  <NavLink to="/subscribe" className={navLinkClass}>
                    Subscription
                  </NavLink>
                </>
              )}

              {user.role === "admin" && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Desktop right section */}
        <div className="navRight navRightDesktop">
          <form className="navSearch" onSubmit={handleSearch}>
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
                onClick={() => { logout(); nav("/login"); }}
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

        {/* Mobile hamburger button */}
        <button
          className="navHamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className={`hamburgerLine ${menuOpen ? "open" : ""}`} />
          <span className={`hamburgerLine ${menuOpen ? "open" : ""}`} />
          <span className={`hamburgerLine ${menuOpen ? "open" : ""}`} />
        </button>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="mobileMenuBackdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              className="mobileMenu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              role="dialog"
              aria-label="Navigation menu"
            >
              {/* Mobile search */}
              <div className="mobileMenuSearch">
                <form onSubmit={handleSearch}>
                  <div className="navSearchInputWrap" style={{ width: "100%" }}>
                    <input
                      className="input"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search providers or services…"
                      aria-label="Search"
                      style={{ width: "100%", borderRadius: 14 }}
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
                  <button className="btn ghost" type="submit" style={{ width: "100%", marginTop: 8 }}>
                    Search
                  </button>
                </form>
              </div>

              {/* Mobile nav links */}
              <nav className="mobileMenuLinks">
                <NavLink to="/" end className={({ isActive }) => `mobileLink ${isActive ? "active" : ""}`} onClick={closeMenu}>
                  Explore
                </NavLink>
                <button
                  className="mobileLink"
                  onClick={() => {
                    closeMenu();
                    if (window.location.pathname !== "/") {
                      nav("/");
                      setTimeout(() => {
                        document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
                      }, 180);
                    } else {
                      document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  Services
                </button>

                {user && (
                  <>
                    <NavLink to="/dashboard" className={({ isActive }) => `mobileLink ${isActive ? "active" : ""}`} onClick={closeMenu}>
                      Dashboard
                    </NavLink>

                    {user.role === "customer" && (
                      <NavLink to="/create" className={({ isActive }) => `mobileLink ${isActive ? "active" : ""}`} onClick={closeMenu}>
                        Request Job
                      </NavLink>
                    )}

                    {user.role === "provider" && (
                      <>
                        <NavLink to={`/provider/${user.id}`} className={({ isActive }) => `mobileLink ${isActive ? "active" : ""}`} onClick={closeMenu}>
                          My Profile
                        </NavLink>
                        <NavLink to="/subscribe" className={({ isActive }) => `mobileLink ${isActive ? "active" : ""}`} onClick={closeMenu}>
                          Subscription
                        </NavLink>
                      </>
                    )}

                    {user.role === "admin" && (
                      <NavLink to="/admin" className={({ isActive }) => `mobileLink ${isActive ? "active" : ""}`} onClick={closeMenu}>
                        Admin
                      </NavLink>
                    )}
                  </>
                )}
              </nav>

              {/* Mobile auth actions */}
              <div className="mobileMenuFooter">
                {user ? (
                  <>
                    <span className="pill" style={{ alignSelf: "flex-start" }}>{user.role}</span>
                    <button
                      className="btn ghost"
                      style={{ width: "100%" }}
                      onClick={() => { logout(); nav("/login"); closeMenu(); }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn ghost" style={{ width: "100%", textAlign: "center" }} onClick={closeMenu}>
                      Login
                    </Link>
                    <Link to="/register" className="btn primary" style={{ width: "100%", textAlign: "center" }} onClick={closeMenu}>
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        /* ===== NAVBAR BASE ===== */
        .navRight { display:flex; align-items:center; gap: 10px; }
        .navSearch { display:flex; align-items:center; gap: 8px; }
        .navSearchInputWrap { position: relative; display: flex; align-items: center; }
        .navSearchInput {
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
        .navSearchBtn { height: 40px; border-radius: 14px; padding: 0 12px; }
        .brandText { display: inline; }

        /* ===== HAMBURGER BUTTON ===== */
        .navHamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
        }
        .navHamburger:hover { border-color: rgba(212,160,23,.40); }

        .hamburgerLine {
          display: block;
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,.85);
          transition: transform 0.25s ease, opacity 0.25s ease;
          transform-origin: center;
        }
        .hamburgerLine.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburgerLine.open:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburgerLine.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ===== MOBILE MENU BACKDROP ===== */
        .mobileMenuBackdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.60);
          backdrop-filter: blur(4px);
          z-index: 48;
        }

        /* ===== MOBILE DRAWER ===== */
        .mobileMenu {
          display: none;
          position: fixed;
          top: 70px;
          right: 0;
          bottom: 0;
          width: min(320px, 88vw);
          background: rgba(10,10,10,.97);
          border-left: 1px solid rgba(255,255,255,.10);
          z-index: 49;
          overflow-y: auto;
          flex-direction: column;
          gap: 0;
          padding-bottom: 24px;
        }

        .mobileMenuSearch {
          padding: 16px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .mobileMenuLinks {
          display: flex;
          flex-direction: column;
          padding: 8px 0;
        }

        .mobileLink {
          display: block;
          padding: 14px 20px;
          color: rgba(255,255,255,.78);
          font-size: 15px;
          font-weight: 600;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          border-bottom: 1px solid rgba(255,255,255,.05);
          transition: background .15s ease, color .15s ease;
          text-decoration: none;
        }
        .mobileLink:hover { background: rgba(255,255,255,.05); color: #fff; }
        .mobileLink.active { color: var(--accent2); font-weight: 900; background: rgba(212,160,23,.08); }

        .mobileMenuFooter {
          margin-top: auto;
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ===== RESPONSIVE BREAKPOINTS ===== */
        @media(max-width: 980px) {
          .navSearchInput { width: 160px; }
        }

        @media(max-width: 768px) {
          /* Hide desktop nav */
          .navLinksDesktop { display: none !important; }
          .navRightDesktop { display: none !important; }

          /* Show hamburger */
          .navHamburger { display: flex; }

          /* Show backdrop + drawer when open (controlled by AnimatePresence) */
          .mobileMenuBackdrop { display: block; }
          .mobileMenu { display: flex; }

          /* Shrink brand on very small screens */
          .brandText { display: none; }
          .nav { padding: 0 14px; }
        }

        @media(max-width: 360px) {
          .nav { padding: 0 10px; }
        }
      `}</style>
    </>
  );
}
