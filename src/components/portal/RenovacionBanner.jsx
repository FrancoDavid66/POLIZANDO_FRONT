// src/components/portal/RenovacionBanner.jsx
//
// Bloque "Tu cuota hoy" + "Al renovar" (NRE) dentro de una PolizaCard.
// Look "fintech": el monto es lo más grande y prominente de la tarjeta —
// mismo patrón que Mercado Pago usa para saldo/precio.

import { motion } from "framer-motion";
import { HiWallet, HiClock, HiSparkles } from "react-icons/hi2";
import { fmt, money, ICON_BUBBLE } from "./portalUtils";

export default function RenovacionBanner({ poliza }) {
  const tieneCuotaActual = poliza.precio_actual > 0;
  const renovacion = poliza.renovacion;
  if (!tieneCuotaActual && !renovacion) return null;

  return (
    <div className="px-4 pt-3.5">
      {tieneCuotaActual ? (
        <div className="flex items-center justify-between rounded-2xl border border-brand-primary/15 bg-gradient-to-br from-brand-primary/[0.08] to-brand-primary/[0.03] px-4 py-3.5 dark:border-emerald-400/15 dark:from-emerald-400/[0.08] dark:to-transparent">
          <div className="flex items-center gap-2.5">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${ICON_BUBBLE.primary}`}>
              <HiWallet className="h-4 w-4" />
            </div>
            <span className="text-[13px] font-semibold text-brand-100/80 dark:text-brand-200/80">Tu cuota</span>
          </div>
          <span className="font-heading text-[22px] font-extrabold tracking-tight text-brand-100 dark:text-brand-200">{money(poliza.precio_actual)}</span>
        </div>
      ) : null}

      {renovacion ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className={`rounded-2xl border border-[rgba(226,98,44,.26)] bg-[#fdf1ea] p-4 dark:border-orange-400/30 dark:bg-orange-400/[0.14] ${tieneCuotaActual ? "mt-3" : ""}`}
        >
          <div className="mb-3.5 flex items-center gap-2 text-brand-secondary dark:text-brand-secondary-tint">
            <HiClock className="h-4 w-4 shrink-0" />
            <span className="text-[12.5px] font-extrabold">
              Al renovar · desde {fmt(renovacion.fecha)}
            </span>
          </div>

          {renovacion.con_oferta ? (
            <div>
              <div className="flex items-center justify-between border-b border-black/[0.09] pb-2.5">
                <span className="text-[13px] font-bold text-brand-100/70 dark:text-brand-200/75">1ra cuota</span>
                <span className="font-heading text-[23px] font-black leading-none tracking-tight text-brand-primary dark:text-emerald-300">{money(renovacion.primera_cuota)}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-[13px] font-bold text-brand-100/70 dark:text-brand-200/75">Resto de las cuotas</span>
                <span className="text-[17px] font-extrabold text-brand-100 dark:text-brand-200">{money(renovacion.resto)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-brand-100/70 dark:text-brand-200/75">Todas las cuotas</span>
              <span className="font-heading text-[23px] font-black leading-none tracking-tight text-brand-100 dark:text-brand-200">{money(renovacion.resto)}</span>
            </div>
          )}

          <p className="mt-3.5 flex items-start gap-2 rounded-[11px] bg-white p-3 text-[11.5px] font-semibold leading-snug text-brand-100/70 dark:bg-white/[0.06] dark:text-brand-200/70">
            <HiSparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-secondary dark:text-brand-secondary-tint" />
            Sabemos que está difícil. Por eso ajustamos el precio de a poco
            {renovacion.con_oferta ? " y tu 1ra cuota queda más baja" : ""}, para acompañarte y que sigas cubierto.
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
