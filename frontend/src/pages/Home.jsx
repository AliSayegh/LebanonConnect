import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import HeroCarousel from "../components/HeroCarousel";
import ServicesSection from "../components/ServicesSection";
import FeaturedProviders from "../components/FeaturedProviders";

export default function Home() {
  const { token } = useAuth();
  const nav = useNavigate();
  const client = useMemo(() => api(token), [token]);

  const [stats, setStats] = useState({
    totalProviders: null,
    verifiedProviders: null,
    cities: 6,
  });

  const loadStats = useCallback(async () => {
    try {
      const totalRes = await client.get(
        `/api/providers/search?page=1&limit=1`,
      );

      const verRes = await client.get(
        `/api/providers/search?verified=true&page=1&limit=1`,
      );

      setStats({
        totalProviders: totalRes.data.total ?? 0,
        verifiedProviders: verRes.data.total ?? 0,
        cities: 6,
      });
    } catch {
      // ignore
    }
  }, [client]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const scrollToServices = () => {
    nav("/services");
  };

  return (
    <div className="home">
      {/* ✅ HERO CAROUSEL */}
      <section className="heroMega">
        <HeroCarousel stats={stats} className="heroMegaCarousel" />
      </section>

      {/* ✅ FEATURED PROVIDERS */}
      <FeaturedProviders />

      {/* ✅ SERVICES SECTION */}
      <div id="services-section">
        <ServicesSection />
      </div>
    </div>
  );
}
