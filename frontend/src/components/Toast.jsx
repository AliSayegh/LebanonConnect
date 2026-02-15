import { AnimatePresence, motion } from "framer-motion";

export default function Toast({ toast, clear }) {
  return (
    <AnimatePresence>
      {toast?.show && (
        <motion.div
          className={`toast ${toast.type || "info"}`}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          onClick={clear}
          role="button"
          title="Click to dismiss"
        >
          <div className="toastTitle">{toast.title || "Notice"}</div>
          <div className="toastBody">{toast.message}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
