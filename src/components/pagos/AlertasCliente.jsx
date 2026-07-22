// src/components/pagos/AlertasCliente.jsx
//
// Fusión de AlertasClienteBadges + AlertasClienteBanner: los dos hacían lo
// mismo (mostrar las alertas de useAlertasCliente) en 2 formatos distintos
// según dónde se usaran — una fila de badges chiquitos en la tarjeta del
// cliente, o un banner expandible arriba de la lista de cuotas. Ahora es un
// solo componente con una prop `variant` en vez de 2 archivos.
//
// AlertasClienteModal (el bloqueante que exige "Entendido, continuar") queda
// aparte — su comportamiento es realmente distinto, no es solo "otro formato".
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiExclamation, HiChevronDown, HiChevronUp,
} from "react-icons/hi";

import useAlertasCliente from "../../hooks/useAlertasCliente";

/**
 * @param {"badges"|"banner"} variant
 *   - "badges": fila compacta de badges, para la tarjeta de un cliente en una lista.
 *   - "banner": banner expandible, para dejarlo fijo arriba de la lista de cuotas.
 */
export default function AlertasCliente({
  variant = "badges",
  clienteId,
  cuotas = [],
  max = 4,
}) {
  const { alertas, criticas, loading } = useAlertasCliente({ clienteId, cuotas });
  const [expanded, setExpanded] = useState(false);

  if (loading || alertas.length === 0) return null;

  if (variant === "badges") {
    const visibles = alertas.slice(0, max);
    const ocultos = alertas.length - visibles.length;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {visibles.map((a) => (
          <span
            key={a.id}
            title={`${a.titulo} — ${a.subtitulo}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${a.badgeColor}`}
          >
            {a.badgeText}
          </span>
        ))}
        {ocultos > 0 && (
          <span
            title={`Y ${ocultos} más`}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-200/10 text-brand-200/70 border border-brand-200/15"
          >
            +{ocultos}
          </span>
        )}
      </div>
    );
  }

  // variant === "banner"
  const hayCriticas = criticas > 0;
  const skin = hayCriticas
    ? { bg: "bg-red-500/10", border: "border-red-500/40", iconBg: "bg-red-500/20", iconColor: "text-red-400", title: "text-red-300", ring: "ring-red-500/20" }
    : { bg: "bg-brand-secondary/10", border: "border-brand-secondary/40", iconBg: "bg-brand-secondary/20", iconColor: "text-brand-secondary-tint", title: "text-brand-secondary-tint", ring: "ring-brand-secondary/20" };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl border ring-1 ${skin.bg} ${skin.border} ${skin.ring} overflow-hidden`}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl ${skin.iconBg} flex items-center justify-center shrink-0`}>
          <HiExclamation className={`w-5 h-5 ${skin.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-black ${skin.title}`}>
            {hayCriticas
              ? `⚠️ ${alertas.length} alerta${alertas.length !== 1 ? "s" : ""} activa${alertas.length !== 1 ? "s" : ""}`
              : `ℹ️ ${alertas.length} aviso${alertas.length !== 1 ? "s" : ""}`}
          </h3>
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {alertas.slice(0, 5).map((a) => (
              <span
                key={a.id}
                className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${a.badgeColor}`}
              >
                {a.badgeText}
              </span>
            ))}
            {alertas.length > 5 && (
              <span className="text-[9px] font-bold text-brand-200/50">+{alertas.length - 5}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-200/8 hover:bg-brand-200/15 text-brand-200/75 text-xs font-bold transition-colors"
        >
          {expanded ? "Ocultar" : "Ver"}
          {expanded ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-brand-200/10"
          >
            <div className="p-3 space-y-2">
              {alertas.map((a) => (
                <div
                  key={a.id}
                  className="px-3 py-2 rounded-lg bg-brand-200/[0.04] border border-brand-200/10 text-xs"
                >
                  <p className="text-brand-200/90 font-semibold">
                    {a.icon} {a.titulo}
                  </p>
                  <p className="text-brand-200/50 mt-0.5">{a.subtitulo}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}