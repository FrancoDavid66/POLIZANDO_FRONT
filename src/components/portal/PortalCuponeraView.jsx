// src/components/portal/PortalCuponeraView.jsx
//
// Subpantalla "Mi cuponera": junta las cuponeras de robo de TODAS las pólizas
// del cliente, agrupadas por auto. Reutiliza CuponesRobo (misma lógica de
// "Ya pagué" que ya usa PolizaCard) para no duplicar comportamiento.

import { motion } from "framer-motion";
import { FaCar, FaTicketAlt } from "react-icons/fa";
import polizandoCabra from "../../assets/logos/polizando_cabrita.webp";
import { CARD, staggerDelay } from "./portalUtils";
import CuponesRobo from "./CuponesRobo";
import { PortalSinPolizas } from "./PortalStates";

export default function PortalCuponeraView({ polizas, enviando, onReportarPago }) {
  const conCupones = polizas.filter((p) => (p.cupones_robo || []).length > 0);

  if (conCupones.length === 0) {
    return (
      <div className={`${CARD} px-6 py-8 text-center sm:py-9`}>
        <div className="relative mx-auto -mb-1 grid h-[148px] w-[148px] place-items-end justify-center overflow-hidden rounded-full [background:radial-gradient(circle_at_50%_42%,rgba(31,122,76,0.12),rgba(31,122,76,0)_70%)] dark:[background:radial-gradient(circle_at_50%_42%,rgba(52,211,153,0.14),rgba(52,211,153,0)_70%)]">
          <img src={polizandoCabra} alt="Polizando" className="w-[188px] max-w-none -mb-1" />
        </div>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(226,98,44,.28)] bg-[#fdeee4] px-3.5 py-1.5 dark:border-orange-400/30 dark:bg-orange-400/10">
          <FaTicketAlt className="h-3 w-3 text-brand-secondary dark:text-brand-secondary-tint" />
          <span className="text-[10.5px] font-extrabold tracking-wide text-brand-secondary dark:text-brand-secondary-tint">CUPONERA</span>
        </span>
        <p className="mt-3.5 font-heading text-[21px] font-extrabold leading-tight text-brand-100 dark:text-brand-200">
          Tu cuponera está vacía
        </p>
        <p className="mx-auto mt-2 max-w-[265px] text-[13.5px] leading-relaxed text-brand-100/60 dark:text-brand-200/60">
          Cuando tengas cupones de pago pendientes, los vas a ver acá para pagarlos en un toque.
        </p>
        <p className="mt-5 font-heading text-xs font-extrabold text-brand-primary dark:text-emerald-300">
          No regalés tu plata 🐐
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conCupones.map((poliza, idx) => (
        <motion.div
          key={poliza.id}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 24, delay: staggerDelay(idx) }}
          className={`${CARD} overflow-hidden`}
        >
          <div className="flex items-center gap-3 border-b border-black/[0.05] p-4 dark:border-white/5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
              <FaCar className="text-base" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-[14px] font-bold text-brand-100 dark:text-brand-200">
                {poliza.marca} {poliza.modelo}
              </p>
              {poliza.patente ? (
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-100/50 dark:text-brand-200/50">{poliza.patente}</p>
              ) : null}
            </div>
          </div>
          <CuponesRobo poliza={poliza} enviando={enviando} onReportarPago={onReportarPago} />
        </motion.div>
      ))}
    </div>
  );
}
