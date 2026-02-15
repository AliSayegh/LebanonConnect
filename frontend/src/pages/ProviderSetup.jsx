import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";

export default function ProviderSetup({ notify }) {
  const { token, user } = useAuth();
  const nav = useNavigate();
  const client = useMemo(() => api(token), [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("Beirut");
  const [addressArea, setAddressArea] = useState("");
  const [bio, setBio] = useState("");
  const [pricingType, setPricingType] = useState("quote");
  const [basePrice, setBasePrice] = useState(0);

  useEffect(() => {
    if (!token) nav("/login");
    if (user?.role !== "provider") nav("/dashboard");
    // eslint-disable-next-line
  }, [token, user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const [cats, me] = await Promise.all([
          client.get("/api/categories"),
          client.get("/api/providers/me")
        ]);

        if (!alive) return;

        setCategories(cats.data.items || []);

        const p = me.data.provider;
        if (p) {
          setDisplayName(p.displayName || user?.name || "");
          setCity(p.city || "Beirut");
          setAddressArea(p.addressArea || "");
          setBio(p.bio || "");
          setPricingType(p.pricingType || "quote");
          setBasePrice(p.basePrice || 0);
          setSelected((p.categoryIds || []).map(String));
        } else {
          setDisplayName(user?.name || "");
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Error";
        notify?.("error", "Setup load failed", msg);
      } finally {
        setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [client, notify, user]);

  const toggleCat = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    try {
      if (selected.length < 1) {
        return notify?.("error", "Missing category", "Choose at least 1 category.");
      }
      if (!displayName.trim()) return notify?.("error", "Missing", "Display name is required.");
      if (!city.trim()) return notify?.("error", "Missing", "City is required.");
      if (!addressArea.trim()) return notify?.("error", "Missing", "Area is required.");

      setSaving(true);

      await client.patch("/api/providers/me", {
        displayName,
        bio,
        city,
        addressArea,
        categoryIds: selected,
        pricingType,
        basePrice
      });

      notify?.("success", "Setup completed", "Your provider profile is now visible.");
      nav("/dashboard");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Error";
      notify?.("error", "Save failed", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card pad">
          <Loader label="Loading setup..." />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <motion.div
        className="card setupCard"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="setupTop">
          <div>
            <h1 className="h1">Provider Setup</h1>
            <p className="muted">
              Complete your profile to appear on Explore and start receiving jobs.
            </p>
          </div>
          <span className="pill warn">Required</span>
        </div>

        <div className="setupGrid">
          <div className="setupLeft">
            <label className="label">Display name</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

            <div className="two">
              <div>
                <label className="label">City</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="label">Area</label>
                <input className="input" value={addressArea} onChange={(e) => setAddressArea(e.target.value)} />
              </div>
            </div>

            <label className="label">Bio</label>
            <textarea
              className="input"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell customers why they should trust you..."
            />

            <div className="two">
              <div>
                <label className="label">Pricing type</label>
                <select className="input" value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
                  <option value="quote">Quote</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="label">Base price</label>
                <input
                  className="input"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="setupRight">
            <div className="setupBox">
              <div className="setupBoxTitle">Choose your categories</div>
              <div className="muted small">Pick at least 1. More = more jobs.</div>

              <div className="cats">
                {categories.map((c) => {
                  const id = String(c._id);
                  const on = selected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCat(id)}
                      className={on ? "cat on" : "cat"}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>

              <div className="setupHint">
                <span className="pill mono">{selected.length}</span>
                <span className="muted small">selected</span>
              </div>
            </div>

            <div className="setupActions">
              <button className="btn primary" disabled={saving} onClick={save}>
                {saving ? "Saving..." : "Save & Continue"}
              </button>
              <button className="btn ghost" onClick={() => nav("/dashboard")}>
                Skip (not recommended)
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        .setupCard{ padding: 18px !important; border-radius: 22px; }
        .setupTop{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom: 14px; }
        .pill.warn{ border-color: rgba(255,200,80,.55); background: rgba(255,200,80,.10); color: var(--accent2); }

        .setupGrid{ display:grid; grid-template-columns: 1.15fr .85fr; gap: 14px; }
        @media(max-width: 980px){ .setupGrid{ grid-template-columns: 1fr; } }

        .setupLeft{ padding: 14px; border-radius: 18px; border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.12); }
        .setupRight{ display:flex; flex-direction:column; gap: 12px; }

        .two{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width: 640px){ .two{ grid-template-columns: 1fr; } }

        .label{ display:block; font-size: 12px; font-weight: 800; margin: 10px 0 6px; color: rgba(255,255,255,.82); }
        .input{ width: 100%; }

        .setupBox{ padding: 14px; border-radius: 18px; border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.12); }
        .setupBoxTitle{ font-weight: 900; }

        .cats{ display:flex; flex-wrap:wrap; gap: 8px; margin-top: 10px; }
        .cat{
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.10);
          color: rgba(255,255,255,.86);
          cursor:pointer;
          transition: transform .12s ease, background .12s ease, border-color .12s ease;
        }
        .cat:hover{ transform: translateY(-1px); }
        .cat.on{
          border-color: rgba(255,200,80,.55);
          background: rgba(255,200,80,.12);
          color: var(--accent2);
          font-weight: 900;
        }

        .setupHint{ margin-top: 12px; display:flex; gap: 8px; align-items:center; }
        .setupActions{ display:flex; gap: 10px; }
        .btn.sm{ height: 36px; padding: 0 12px; border-radius: 12px; font-size: 13px; }
      `}</style>
    </div>
  );
}
