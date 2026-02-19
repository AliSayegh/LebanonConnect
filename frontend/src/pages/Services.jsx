import { motion } from "framer-motion";
import ServicesSection from "../components/ServicesSection";

export default function Services() {
  return (
    <div className="services-page-wrap pad">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="container"
      >
        <ServicesSection />
      </motion.div>
    </div>
  );
}
