// src/components/portal/PortalSubScreen.jsx
//
// Header liviano para las subpantallas del portal (Mis pólizas / Mi cuponera):
// botón "volver" + título. Reemplaza al PortalHeader grande cuando el cliente
// ya entró a una sección específica.

import { motion } from "framer-motion";
import { HiChevronLeft } from "react-icons/hi2";

export default function PortalSubScreen({ titulo, onVolver, children }) {
  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/[0.05] bg-brand-200/90 px-5 py-4 backdrop-blur-md dark:border-white/5 dark:bg-brand-100/90">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onVolver}
          aria-label="Volver"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-brand-100 transition hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-brand-200 dark:hover:bg-white/10"
        >
          <HiChevronLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="font-heading text-[18px] font-extrabold text-brand-100 dark:text-brand-200">{titulo}</h1>
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-4 lg:max-w-5xl lg:px-8">{children}</div>
    </div>
  );
}
