// src/components/portal/CuotasList.jsx
//
// Bloque "Cuotas" dentro de una PolizaCard: título + barra de progreso +
// lista de CuotaItem. La barra de progreso es el típico "X de Y pagadas" que
// dan las apps de pagos para transmitir avance de un vistazo.

import { motion } from "framer-motion";
import { HiCreditCard } from "react-icons/hi2";
import CuotaItem from "./CuotaItem";
import { CARD } from "./portalUtils";

export default function CuotasList({ poliza, cliente, reciboBusy, onRecibo }) {
  const cuotas = poliza.cuotas || [];
  if (cuotas.length === 0) return null;

  const pagadas = cuotas.filter((c) => c.pagado).length;
  const total = cuotas.length;
  const porcentaje = total > 0 ? Math.round((pagadas / total) * 100) : 0;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-primary/10 text-brand-primary dark:bg-emerald-400/10 dark:text-emerald-300">
            <HiCreditCard className="h-4 w-4" />
          </div>
          <span className="font-heading text-[16px] font-bold text-brand-100 dark:text-brand-200">Cuotas</span>
        </div>
        <span className="text-[11.5px] font-extrabold text-brand-100/50 dark:text-brand-200/50">{pagadas} de {total} pagadas</span>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${porcentaje}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="h-full rounded-full bg-gradient-to-r from-brand-primary to-[#43b877]"
        />
      </div>

      <div className={`${CARD} overflow-hidden`}>
        {cuotas.map((c) => (
          <CuotaItem
            key={`${poliza.id}-${c.cuota_nro}`}
            cuota={c}
            busy={reciboBusy === `${poliza.id}-${c.cuota_nro}`}
            onRecibo={c.pagado ? () => onRecibo(cliente, poliza, c) : null}
          />
        ))}
      </div>
    </div>
  );
}
