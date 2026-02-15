import { motion } from "framer-motion";

export default function Loader({ label = "Loading..." }) {
  return (
    <div className="loaderWrap">
      <motion.div
        className="loaderDot"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 0.7, repeat: Infinity }}
      />
      <motion.div
        className="loaderDot"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, delay: 0.12 }}
      />
      <motion.div
        className="loaderDot"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, delay: 0.24 }}
      />
      <span className="loaderText">{label}</span>
    </div>
  );
}
