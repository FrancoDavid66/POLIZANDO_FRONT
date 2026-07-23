// src/components/portal/ThemeToggle.jsx
//
// Switch de dark/light mode para el header del Portal del Asegurado. Look
// tipo "pill" con el sol/luna deslizando — mismo lenguaje visual que el resto
// del portal (burbujas, spring animations).

import { motion } from "framer-motion";
import { HiSun, HiMoon } from "react-icons/hi2";

export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
      className="relative flex h-9 w-[62px] shrink-0 items-center rounded-full bg-white/20 p-1 backdrop-blur-sm transition-colors hover:bg-white/25"
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-md"
        style={{ marginLeft: isDark ? "auto" : 0 }}
      >
        {isDark ? (
          <HiMoon className="h-4 w-4 text-brand-primary-deep" />
        ) : (
          <HiSun className="h-4 w-4 text-brand-secondary" />
        )}
      </motion.div>
    </motion.button>
  );
}
