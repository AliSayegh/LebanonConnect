import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";

const SLIDE_MS = 6000;

const variants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 90 : -90, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -90 : 90, scale: 0.985 }),
};

const slides = [
  {
    badge: "Trusted providers",
    title: "Hire verified pros in Lebanon.",
    sub: "Electricians • Plumbers • AC • Carpentry • Cleaning",
    img: "/carousel/slide1.jpg",
  },
  {
    badge: "Secure chat",
    title: "Chat inside the platform.",
    sub: "No WhatsApp. No phone numbers. Keep everything protected.",
    img: "/carousel/slide2.jpg",
  },
  {
    badge: "Fast booking",
    title: "Request a job in seconds.",
    sub: "Pick a provider, describe the issue, start a job-based chat.",
    img: "/carousel/slide3.jpg",
  },
  {
    badge: "Top rated",
    title: "Find the best, faster.",
    sub: "Smart sorting by rating, jobs, and verification.",
    img: "/carousel/slide4.jpg",
  },
];

export default function HeroCarousel({ stats }) {

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [progress, setProgress] = useState(0);

  // Parallax motion values
  const x = useMotionValue(0);
  const bgX = useTransform(x, [-160, 160], [-18, 18]);  // subtle parallax
  const fgX = useTransform(x, [-160, 160], [10, -10]);  // opposite direction

  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const go = (nextIndex) => {
    setDir(nextIndex > index ? 1 : -1);
    setIndex((nextIndex + slides.length) % slides.length);
    setProgress(0);
  };

  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  // Autoplay timer
  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => next(), SLIDE_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Progress bar animation loop
  useEffect(() => {
    cancelAnimationFrame(progressRef.current);

    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / SLIDE_MS);
      setProgress(p);
      if (p < 1) progressRef.current = requestAnimationFrame(tick);
    };

    progressRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(progressRef.current);
  }, [index]);

  const slide = slides[index];

  return (
    <div className="heroCarousel">
      <div className="heroCarouselFrame">
        <div className="heroProgressTrack">
          <div className="heroProgressFill" style={{ width: `${progress * 100}%` }} />
        </div>

        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            className="heroSlide"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDrag={(e, info) => x.set(info.offset.x)}
            onDragEnd={(_, info) => {
              x.set(0);
              const swipe = info.offset.x;
              if (swipe < -90) next();
              else if (swipe > 90) prev();
            }}
          >
            {/* Parallax background */}
            <motion.div
              className="heroSlideMedia"
              style={{ backgroundImage: `url(${slide.img})`, x: bgX }}
            />
            <div className="heroSlideOverlay" />

            {/* Glass Card */}
            <motion.div className="heroGlass" style={{ x: fgX }}>
              <div className="heroSlideBadge">{slide.badge}</div>

              <motion.h2
                className="heroSlideTitle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              >
                {slide.title}
              </motion.h2>

              <motion.p
                className="heroSlideSub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
              >
                {slide.sub}
              </motion.p>

              <div className="heroStatsRow">
                <div className="heroStat">
                  <div className="heroStatNum">{stats?.totalProviders ?? "—"}</div>
                  <div className="heroStatLab">providers</div>
                </div>
                <div className="heroStat">
                  <div className="heroStatNum">{stats?.verifiedProviders ?? "—"}</div>
                  <div className="heroStatLab">verified</div>
                </div>
                <div className="heroStat">
                  <div className="heroStatNum">{stats?.cities ?? "—"}</div>
                  <div className="heroStatLab">cities</div>
                </div>
              </div>

              <div className="heroSlideMeta">
                <span className="pill">Lebanon-first</span>
                <span className="pill">Real-time chat</span>
                <span className="pill">No contacts</span>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <button className="heroArrow left" onClick={prev} aria-label="Previous slide">‹</button>
        <button className="heroArrow right" onClick={next} aria-label="Next slide">›</button>

        <div className="heroDots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === index ? "heroDot on" : "heroDot"}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
