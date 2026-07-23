// src/components/portal/PortalStates.jsx
//
// Estados de carga / error / vacío del Portal del Asegurado. Look "fintech":
// ícono grande en burbuja de color, más aire, animación de entrada con resorte.

import { motion } from "framer-motion";
import { HiExclamationCircle, HiDocumentText } from "react-icons/hi2";
import polizandoLogo from "../../assets/logos/polizando_logo.webp";
import { CARD, ICON_BUBBLE } from "./portalUtils";

export function PortalSplashLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-200 dark:bg-brand-100">
      <motion.img
        src={polizandoLogo}
        alt="Polizando"
        className="h-20 w-20 drop-shadow-[0_10px_24px_rgba(31,122,76,0.28)]"
        initial={{ scale: 0.8, opacity: 0, rotate: -6 }}
        animate={{ scale: [0.8, 1.05, 1], opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <div className="h-2 w-36 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <motion.div
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary"
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="text-[13px] font-medium text-brand-100/50 dark:text-brand-200/50">Cargando tu portal…</p>
    </div>
  );
}

export function PortalErrorState({ mensaje }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-200 px-6 text-center dark:bg-brand-100">
      <img src={polizandoLogo} alt="Polizando" className="mb-1 h-12 w-12 opacity-90" />
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="grid h-16 w-16 place-items-center rounded-full bg-rose-500/10 text-rose-500"
      >
        <HiExclamationCircle className="h-8 w-8" />
      </motion.div>
      <h1 className="font-heading text-lg font-bold text-brand-100 dark:text-brand-200">No pudimos abrir tu portal</h1>
      <p className="max-w-xs text-sm text-brand-100/70 dark:text-brand-200/70">{mensaje}</p>
      <p className="mt-2 text-xs text-brand-100/50 dark:text-brand-200/50">Si creés que es un error, escribinos por WhatsApp.</p>
    </div>
  );
}

export function PortalSinPolizas() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className={`${CARD} mt-5 px-6 py-12 text-center sm:py-14`}
    >
      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${ICON_BUBBLE.primary}`}>
        <HiDocumentText className="h-8 w-8" />
      </div>
      <p className="font-heading text-[17px] font-bold text-brand-100 dark:text-brand-200">No tenés pólizas vigentes</p>
      <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-snug text-brand-100/60 dark:text-brand-200/60">
        En este momento no hay seguros activos para mostrar. Si creés que es un error, escribinos.
      </p>
    </motion.div>
  );
}
