import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import Loader from "../components/Loader";
import { cities } from "../constants/locations";
import CustomSelect from "../components/CustomSelect";

export default function CreateJob({ notify }) {
  const { token, user } = useAuth();
  const client = useMemo(() => api(token), [token]);
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const presetProviderId = sp.get("providerId") || "";

  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState(presetProviderId);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Beirut");
  const [addressArea, setAddressArea] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "customer") return;

    (async () => {
      try {
        setLoading(true);
        // Fetch ALL valid providers (no city filter) for the dropdown
        const res = await client.get(
          `/api/providers/search?limit=50&page=1`,
        );
        let allProviders = res.data.items || [];

        // If presetProviderId exists, ensure that provider is in the list
        if (presetProviderId) {
          const alreadyInList = allProviders.some(
            (x) => String(x.userId) === String(presetProviderId),
          );
          if (!alreadyInList) {
            try {
              const single = await client.get(`/api/providers/${presetProviderId}`);
              if (single.data && single.data.userId) {
                allProviders = [single.data, ...allProviders];
              }
            } catch {
              // Provider may not exist or be deleted/banned, ignore
            }
          }
        }

        setProviders(allProviders);

        // Auto-select preset provider, or leave empty for user to choose
        const defaultProvider = presetProviderId || "";
        setProviderId(defaultProvider);

        // Auto set categoryId from provider first category
        if (defaultProvider) {
          const selected = allProviders.find(
            (x) => String(x.userId) === String(defaultProvider),
          );
          setCategoryId(selected?.categoryIds?.[0] || "");
        }
      } catch (e) {
        notify(
          "error",
          "Providers load failed",
          e?.response?.data?.message || "Backend error",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [client, user, notify, presetProviderId]);

  useEffect(() => {
    const selected = providers.find(
      (x) => String(x.userId) === String(providerId),
    );
    setCategoryId(selected?.categoryIds?.[0] || "");
  }, [providerId, providers]);

  const submit = async (e) => {
    e.preventDefault();

    if (!providerId)
      return notify("error", "Missing provider", "Choose a provider");
    if (!categoryId)
      return notify(
        "error",
        "Missing category",
        "Provider has no category assigned in DB",
      );
    if (!title.trim())
      return notify("error", "Missing title", "Enter job title");
    if (!city.trim()) return notify("error", "Missing city", "Enter city");

    try {
      const res = await client.post("/api/jobs", {
        providerId, // IMPORTANT: userId (not providerProfile _id)
        categoryId,
        title,
        description,
        city,
        addressArea,
      });

      notify("success", "Job created", "Opening secure chat ✅");
      nav(`/chat/${res.data._id}`);
    } catch (e2) {
      notify(
        "error",
        "Create failed",
        e2?.response?.data?.message || "Server error",
      );
    }
  };

  if (user?.role !== "customer") {
    return (
      <div className="page">
        <div className="card pad">
          <h2 className="h2">Customers only</h2>
          <p className="muted">Only customers can request jobs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <motion.div
        className="card pad"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="topRow">
          <div>
            <h1 className="h1">Request a job</h1>
            <p className="muted">You'll chat securely inside the platform.</p>
          </div>
          <div className="pill">No phone numbers</div>
        </div>

        {loading ? (
          <Loader label="Loading providers..." />
        ) : (
          <form className="form" onSubmit={submit}>
            <div className="grid2">
              <div>
                <label className="label">City</label>
                <CustomSelect
                  value={city}
                  onChange={(v) => setCity(v)}
                  options={cities}
                  placeholder="Select city…"
                  ariaLabel="City"
                />
              </div>
              <div>
                <label className="label">Area</label>
                <input
                  className="input"
                  value={addressArea}
                  onChange={(e) => setAddressArea(e.target.value)}
                  placeholder="Hamra / Dahye / ..."
                />
              </div>
            </div>

            <label className="label">Choose provider</label>
            <select
              className="input"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              <option value="">— Select a provider —</option>
              {providers.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.displayName} {p.isVerified ? "✓" : ""} — ⭐
                  {(p.ratingAvg || 0).toFixed(1)} — {p.city}
                </option>
              ))}
            </select>

            <div className="hint">
              CategoryId auto-selected from provider’s first category:{" "}
              <span className="mono">{categoryId || "none"}</span>
            </div>

            <label className="label">Job title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fix electricity / Leak / AC..."
            />

            <label className="label">Description</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue…"
            />

            <button className="btn primary full">Create & Chat</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
