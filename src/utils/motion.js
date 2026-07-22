// src/utils/motion.js
//
// Variantes de Framer Motion compartidas. En vez de repetir
// initial/animate/exit en cada página, importá estas.
//
// Uso simple:
//   import { fadeUp } from "../utils/motion";
//   <motion.div {...fadeUp}>...</motion.div>
//
// Uso con lista escalonada (stagger):
//   <motion.ul {...staggerContainer}>
//     {items.map((it) => <motion.li key={it.id} {...staggerItem}>{it.nombre}</motion.li>)}
//   </motion.ul>

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export const staggerContainer = {
  initial: "hidden",
  animate: "show",
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  },
};

export const staggerItem = {
  variants: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  },
};

// Micro-interacción estándar para elementos clickeables.
export const pressable = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.985 },
  transition: { duration: 0.15 },
};