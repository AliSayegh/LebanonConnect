import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";

const SLIDE_MS = 6500;

const variants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 110 : -110, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -110 : 110, scale: 0.985 }),
};

import slide1 from "../assets/carousel/slide1.jpg";
import slide2 from "../assets/carousel/slide2.jpg";
import slide3 from "../assets/carousel/slide3.jpg";
import slide4 from "../assets/carousel/slide4.jpg";

const slides = [
  {
    badge: "Trusted providers",
    title: "Hire verified pros in Lebanon.",
    sub: "Electricians • Plumbers • AC • Carpentry • Cleaning",
    img: slide1,
  },
  {
    badge: "Secure chat",
    title: "Chat inside the platform.",
    sub: "No WhatsApp. No phone numbers. Keep everything protected.",
    img: slide2,
  },
  {
    badge: "Fast booking",
    title: "Request a job in seconds.",
    sub: "Pick a provider, describe the issue, start a job-based chat.",
    img: slide3,
  },
  {
    badge: "Top rated",
    title: "Find the best, faster.",
    sub: "Smart sorting by rating, jobs, and verification.",
    img: slide4,
  },
];

export default function HeroCarousel({ stats, className = "" }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef(null);
  const rafRef = useRef(null);

  // Parallax / drag
  const dragX = useMotionValue(0);
  const bgX = useTransform(dragX, [-180, 180], [-22, 22]);
  const fgX = useTransform(dragX, [-180, 180], [12, -12]);

  const slide = slides[index];

  const go = (nextIndex) => {
    setDir(nextIndex > index ? 1 : -1);
    setIndex((nextIndex + slides.length) % slides.length);
    setProgress(0);
  };

  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  // autoplay
  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, SLIDE_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // progress
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();

    const tick = (t) => {
      const p = Math.min(1, (t - start) / SLIDE_MS);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index]);

  const progressPct = useMemo(
    () => `${Math.round(progress * 100)}%`,
    [progress],
  );

  return (
    <div className={`heroCarousel2 ${className}`}>
      <div className="heroCarousel2Frame">   
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            className="hero2Slide"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDrag={(e, info) => dragX.set(info.offset.x)}
            onDragEnd={(_, info) => {
              dragX.set(0);
              const swipe = info.offset.x;
              if (swipe < -100) next();
              else if (swipe > 100) prev();
            }}
          >
            <motion.div
              className="hero2Media"
              style={{ backgroundImage: `url(${slide.img})`, x: bgX }}
            />

            <div className="hero2Overlay" />
            <div className="hero2Film" />
            <div className="hero2Glow" />
            <div className="hero2Noise" />

            <motion.div className="hero2Card" style={{ x: fgX }}>
              <div className="hero2Badge">{slide.badge}</div>

              <motion.h2
                className="hero2Title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                {slide.title}
              </motion.h2>

              <motion.p
                className="hero2Sub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
              >
                {slide.sub}
              </motion.p>

              <div className="hero2Stats">
                <div className="hero2Stat">
                  <div className="hero2StatNum">
                    {stats?.totalProviders ?? "—"}
                  </div>
                  <div className="hero2StatLab">providers</div>
                </div>
                <div className="hero2Stat">
                  <div className="hero2StatNum">
                    {stats?.verifiedProviders ?? "—"}
                  </div>
                  <div className="hero2StatLab">verified</div>
                </div>
                <div className="hero2Stat">
                  <div className="hero2StatNum">{stats?.cities ?? "—"}</div>
                  <div className="hero2StatLab">cities</div>
                </div>
              </div>

              <div className="hero2Meta">
                <span className="pill">Lebanon-first</span>
                <span className="pill">Real-time chat</span>
                <span className="pill">No contacts</span>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        <div className="hero2Dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === index ? "hero2Dot on" : "hero2Dot"}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="hero2BottomFade" />
      </div>
    </div>
  );
}
