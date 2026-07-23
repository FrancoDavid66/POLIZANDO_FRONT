// src/components/portal/CuotaItem.jsx
//
// Una fila de cuota dentro de la lista de cuotas de una póliza. Look
// "fintech": ícono en burbuja chica de color según estado, como un extracto
// de movimientos de Mercado Pago.

import { motion } from "framer-motion";
import { HiCheck, HiClock, HiArrowDownTray } from "react-icons/hi2";
import { fmt } from "./portalUtils";

export default function CuotaItem({ cuota, onRecibo, busy }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/[0.07] px-4.5 py-3.5 last:border-0 dark:border-white/5">
      <span className="flex items-center gap-3.5">
        {cuota.pagado ? (
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-brand-primary dark:bg-emerald-500">
            <HiCheck className="h-4 w-4 text-white" strokeWidth={1} />
          </div>
        ) : (
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border-2 border-brand-secondary/40 dark:border-orange-400/40">
            <HiClock className="h-3.5 w-3.5 text-brand-secondary dark:text-brand-secondary-tint" />
          </div>
        )}
        <span className="text-[14.5px] font-extrabold text-brand-100 dark:text-brand-200">Cuota {cuota.cuota_nro}</span>
      </span>
      {cuota.pagado ? (
        <span className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-brand-primary dark:text-emerald-300">
            Pagada · {fmt(cuota.fecha_pago)}
          </span>
          {onRecibo ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={onRecibo}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-brand-primary bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-brand-primary transition hover:bg-brand-primary/5 disabled:opacity-50 dark:border-emerald-400/50 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            >
              <HiArrowDownTray className="h-3.5 w-3.5" /> {busy ? "..." : "Recibo"}
            </motion.button>
          ) : null}
        </span>
      ) : (
        <span className="text-[12px] font-extrabold text-brand-secondary dark:text-brand-secondary-tint">
          Vence {fmt(cuota.fecha_vencimiento)}
        </span>
      )}
    </div>
  );
}
