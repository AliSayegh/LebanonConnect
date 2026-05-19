import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { cities, getAreaByCity } from "../constants/locations";
import CustomSelect from "../components/CustomSelect";

export default function ProviderSetup({ notify }) {
  const { token, user } = useAuth();
  const nav = useNavigate();
  const client = useMemo(() => api(token), [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [bio, setBio] = useState("");
  const [pricingType, setPricingType] = useState("quote");
  const [basePrice, setBasePrice] = useState(0);
  const [errors, setErrors] = useState({});
  const BIO_MAX = 500;

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
          setIsEditMode(p.onboardingComplete === true);
          setDisplayName(p.displayName || user?.name || "");
          setEmail(p.userId?.email || user?.email || "");
          setCity(p.city || "");
          setDistrict(p.district || getAreaByCity(p.city || ""));
          setAddressArea(p.addressArea || "");
          setBio(p.bio || "");
          setPricingType(p.pricingType || "quote");
          setBasePrice(p.basePrice || 0);
          setSelected((p.categoryIds || []).map(String));
        } else {
          setIsEditMode(false);
          setDisplayName(user?.name || "");
          setEmail(user?.email || "");
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
    if (errors.selected) setErrors((p) => ({ ...p, selected: null }));
  };

  const save = async () => {
    try {
      const nextErrors = {};
      if (selected.length < 1) nextErrors.selected = "Choose at least 1 category.";
      if (!displayName.trim()) nextErrors.displayName = "Display name is required.";
      if (!email.trim() || !email.includes("@")) nextErrors.email = "Valid email is required.";
      if (!city.trim()) nextErrors.city = "City is required.";
      else if (!getAreaByCity(city)) nextErrors.city = "Please select a valid Lebanese city.";
      if (!addressArea.trim()) nextErrors.addressArea = "Area is required.";
      if (String(bio || "").length > BIO_MAX) nextErrors.bio = `Bio must be ${BIO_MAX} characters or less.`;

      const priceNum = Number(basePrice);
      if (pricingType === "fixed" || pricingType === "starting") {
        if (!Number.isFinite(priceNum) || priceNum < 0) {
          nextErrors.basePrice = "Price must be a valid number (min 0).";
        }
      }

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) {
        notify?.("error", "Fix the highlighted fields", "Please review the form and try again.");
        return;
      }

      setSaving(true);

      await client.patch("/api/providers/me", {
        displayName,
        email,
        bio,
        city,
        district: district || getAreaByCity(city),
        addressArea,
        categoryIds: selected,
        pricingType,
        basePrice: pricingType === "quote" ? 0 : priceNum
      });

      notify?.("success", isEditMode ? "Profile updated" : "Setup completed", isEditMode ? "Your changes were saved." : "Your provider profile is now visible.");
      nav(isEditMode ? `/provider/${user.id}` : "/dashboard");
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
            <h1 className="h1">{isEditMode ? "Edit Profile" : "Provider Setup"}</h1>
            <p className="muted">
              {isEditMode ? "Update your profile details and services." : "Complete your profile to appear on Explore and start receiving jobs."}
            </p>
          </div>
          {!isEditMode && <span className="pill warn">Required</span>}
        </div>

        <div className="setupGrid">
          <div className="setupLeft">
            <div className="two">
              <div>
                <label className="label">Display name</label>
                <input className={errors.displayName ? "input inputErr" : "input"} value={displayName} onChange={(e) => { setDisplayName(e.target.value); if (errors.displayName) setErrors(p => ({ ...p, displayName: null })); }} />
                {errors.displayName && <div className="fieldErr">{errors.displayName}</div>}
              </div>
              <div>
                <label className="label">Email</label>
                <input className={errors.email ? "input inputErr" : "input"} type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: null })); }} />
                {errors.email && <div className="fieldErr">{errors.email}</div>}
              </div>
            </div>

            <div className="two">
              <div>
                <label className="label">City</label>
                <div className={errors.city ? "inputErrWrap" : ""}>
                  <CustomSelect
                    value={city}
                    onChange={(v) => {
                      setCity(v);
                      setDistrict(getAreaByCity(v));
                      if (errors.city) setErrors(p => ({ ...p, city: null }));
                    }}
                    options={cities}
                    placeholder="Select city…"
                    ariaLabel="City"
                  />
                </div>
                {errors.city && <div className="fieldErr">{errors.city}</div>}
              </div>
              <div>
                <label className="label">District</label>
                <input className="input" value={district} disabled placeholder="Auto-filled" />
              </div>
            </div>

            <div className="two">
              <div>
                <label className="label">Area</label>
                <input className={errors.addressArea ? "input inputErr" : "input"} value={addressArea} onChange={(e) => { setAddressArea(e.target.value); if (errors.addressArea) setErrors(p => ({ ...p, addressArea: null })); }} />
                {errors.addressArea && <div className="fieldErr">{errors.addressArea}</div>}
              </div>
              <div />
            </div>

            <label className="label">Bio</label>
            <textarea
              className={errors.bio ? "input inputErr" : "input"}
              rows={4}
              value={bio}
              onChange={(e) => { setBio(e.target.value); if (errors.bio) setErrors(p => ({ ...p, bio: null })); }}
              placeholder="Briefly describe your experience, specialties, and what customers can expect (response time, warranty, tools, etc.)."
            />
            {errors.bio && <div className="fieldErr">{errors.bio}</div>}
            <div className="muted tiny" style={{ marginTop: 6 }}>
              {String(bio || "").length}/{BIO_MAX}
            </div>

            <div className="two">
              <div>
                <label className="label">Pricing type</label>
                <CustomSelect
                  value={pricingType}
                  onChange={(v) => setPricingType(v)}
                  options={[
                    { value: "fixed", label: "Fixed price" },
                    { value: "starting", label: "Starting from" },
                    { value: "quote", label: "Quote based" },
                  ]}
                  placeholder="Select pricing…"
                  ariaLabel="Pricing type"
                />
              </div>
              <div>
                {pricingType === "quote" ? (
                  <div className="priceHint">
                    <label className="label">Price</label>
                    <div className="muted small">No price shown (customers request a quote).</div>
                  </div>
                ) : (
                  <>
                    <label className="label">{pricingType === "starting" ? "Starting from" : "Fixed price"}</label>
                    <input
                      className={errors.basePrice ? "input inputErr" : "input"}
                      type="number"
                      min={0}
                      value={basePrice}
                      onChange={(e) => { setBasePrice(e.target.value); if (errors.basePrice) setErrors(p => ({ ...p, basePrice: null })); }}
                      placeholder="0"
                    />
                    {errors.basePrice && <div className="fieldErr">{errors.basePrice}</div>}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="setupRight">
            <div className="setupBox">
              <div className="setupBoxTitle">Choose your categories</div>
              <div className="muted small">Pick at least 1. More = more jobs.</div>
              {errors.selected && <div className="fieldErr">{errors.selected}</div>}

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
                {saving ? "Saving..." : (isEditMode ? "Save Changes" : "Save & Continue")}
              </button>
              {isEditMode ? (
                <button className="btn ghost" onClick={() => nav(`/provider/${user.id}`)}>
                  Cancel
                </button>
              ) : (
                <button className="btn ghost" onClick={() => nav("/dashboard")}>
                  Skip (not recommended)
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        .setupCard{ padding: 24px !important; border-radius: 22px; }
        .setupTop{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom: 24px; }
        .pill.warn{ border-color: rgba(255,200,80,.55); background: rgba(255,200,80,.10); color: var(--accent2); }

        .fieldErr{ margin-top: 6px; font-size: 12px; font-weight: 700; color: rgba(255,120,120,.95); }
        .inputErr{ border-color: rgba(255,120,120,.55) !important; box-shadow: 0 0 0 3px rgba(255,120,120,.10) !important; }
        .inputErrWrap .csSelect{ border-color: rgba(255,120,120,.55) !important; box-shadow: 0 0 0 3px rgba(255,120,120,.10) !important; }

        .setupGrid{ display:grid; grid-template-columns: 1.15fr .85fr; gap: 24px; }
        @media(max-width: 980px){ .setupGrid{ grid-template-columns: 1fr; } }

        .setupLeft{ padding: 20px; border-radius: 18px; border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.12); }
        .setupRight{ display:flex; flex-direction:column; gap: 24px; }

        .two{ display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width: 640px){ .two{ grid-template-columns: 1fr; } }

        .label{ display:block; font-size: 12px; font-weight: 800; margin: 10px 0 6px; color: rgba(255,255,255,.82); }
        .input{ width: 100%; }

        .setupBox{ padding: 20px; border-radius: 18px; border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.12); }
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
        .priceHint{ display:flex; flex-direction:column; gap: 4px; }
      `}</style>
    </div>
  );
}
