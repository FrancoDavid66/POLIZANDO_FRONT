// src/components/portal/PortalHeader.jsx
//
// Header del Portal del Asegurado: gradiente de marca (verde→naranja), logo
// y saludo con el nombre del cliente. Estilo "fintech" (look Mercado Pago):
// mucho color sólido, tipografía grande, chip resumen. Puramente presentacional.

import { motion } from "framer-motion";
import { HiShieldCheck } from "react-icons/hi2";
import polizandoLogo from "../../assets/logos/polizando_logo.webp";
import ThemeToggle from "./ThemeToggle";

export default function PortalHeader({ nombre, cantidadPolizas, isDark, onToggleTheme }) {
  const tieneUnaPoliza = cantidadPolizas > 0;

  return (
    <div className="relative z-0 overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary to-brand-primary-deep pb-8 pt-6">
      {/* blobs decorativos: más grandes y con más presencia que antes */}
      <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full bg-brand-secondary/35 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-6 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/[0.08] to-transparent" />

      <div className="relative mx-auto flex w-full max-w-4xl items-center gap-3.5 px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.75, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/15 sm:h-14 sm:w-14"
        >
          <img src={polizandoLogo} alt="Polizando" className="h-full w-full object-contain" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Polizando</p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="truncate font-heading text-2xl font-extrabold leading-tight text-white sm:text-[28px]"
          >
            Hola{nombre ? `, ${nombre}` : ""} 👋
          </motion.h1>
        </div>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      <p className="relative mx-auto mt-3 w-full max-w-4xl px-5 text-[13px] text-white/85 sm:text-sm">
        {tieneUnaPoliza ? "Estos son tus seguros, siempre a mano." : "No tenés pólizas vigentes en este momento."}
      </p>

      {tieneUnaPoliza ? (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.15 }}
          className="relative mx-auto mt-4 w-full max-w-4xl px-5"
        >
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2 backdrop-blur-sm">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
              <HiShieldCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[12.5px] font-semibold text-white">
              {cantidadPolizas} {cantidadPolizas === 1 ? "vehículo asegurado" : "vehículos asegurados"}
            </span>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
