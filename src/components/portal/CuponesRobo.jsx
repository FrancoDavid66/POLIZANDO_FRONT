// src/components/portal/CuponesRobo.jsx
//
// Bloque "Cuponeras de robo" dentro de una PolizaCard: lista de cupones con
// botón "Ya pagué" + tip de cómo pagar. Es la parte más importante para cobranza.
// El estado "reportado" tiene una animación de check con resorte — feedback
// satisfactorio pero contenido, no una celebración grande.

import { motion, AnimatePresence } from "framer-motion";
import { HiShieldCheck, HiCheckCircle, HiClock, HiBanknotes } from "react-icons/hi2";
import { fmt, ICON_BUBBLE } from "./portalUtils";

export default function CuponesRobo({ poliza, enviando, onReportarPago }) {
  const cupones = poliza.cupones_robo || [];
  if (cupones.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
          <HiShieldCheck className="h-4 w-4" />
        </div>
        <span className="font-heading text-[16px] font-bold text-brand-100 dark:text-brand-200">Cuponeras de robo</span>
      </div>
      <div className="space-y-2">
        {cupones.map((cp) => {
          const pagada = cp.pagado || cp.estado === "PAGADA";
          const reportada = cp.reportado || cp.estado === "REPORTADO";
          return (
            <div key={cp.id} className="rounded-2xl border border-black/[0.05] bg-black/[0.02] p-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-brand-100 dark:text-brand-200">Vence {fmt(cp.fecha_vencimiento)}</span>
                <AnimatePresence mode="wait" initial={false}>
                  {pagada ? (
                    <motion.span
                      key="pagada"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300"
                    >
                      <HiCheckCircle className="h-4 w-4" /> Pagada
                    </motion.span>
                  ) : reportada ? (
                    <motion.span
                      key="reportada"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"
                    >
                      <HiClock className="h-4 w-4" /> Aviso recibido
                    </motion.span>
                  ) : (
                    <motion.button
                      key="boton"
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => onReportarPago(poliza.id, cp)}
                      disabled={!!enviando[cp.id]}
                      className="rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-deep px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-brand-primary/30 transition hover:brightness-105 disabled:opacity-50"
                    >
                      {enviando[cp.id] ? "Enviando..." : "Ya pagué"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-brand-100/50 dark:text-brand-200/50">
        Cuando toques "Ya pagué", lo verificamos y te confirmamos. No hace falta que subas nada.
      </p>
      <div className="mt-3 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.08] to-transparent p-3.5">
        <div className="flex items-center gap-2">
          <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${ICON_BUBBLE.sky}`}>
            <HiBanknotes className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] font-bold text-sky-700 dark:text-sky-300">Cómo pagar tus cuotas</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-brand-100/70 dark:text-brand-200/80">
          Podés abonar en <span className="font-semibold text-brand-100 dark:text-brand-200">Rapipago</span>,{" "}
          <span className="font-semibold text-brand-100 dark:text-brand-200">Pago Fácil</span> o{" "}
          <span className="font-semibold text-brand-100 dark:text-brand-200">Mercado Pago</span> usando los datos de tu cuponera.
        </p>
      </div>
    </div>
  );
}
