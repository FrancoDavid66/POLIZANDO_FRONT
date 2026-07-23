// src/components/portal/PolizaCard.jsx
//
// Tarjeta completa de una póliza: hero (auto, patente, estado), banner de
// renovación, papeles, cuponeras de robo y cuotas. Orquesta los bloques hijos.
// Look "fintech": burbuja de ícono grande, patente como chip tipo placa.

import { motion } from "framer-motion";
import { FaCar } from "react-icons/fa";
import { CARD, ESTADO_POLIZA, staggerDelay } from "./portalUtils";
import RenovacionBanner from "./RenovacionBanner";
import DocumentosPoliza from "./DocumentosPoliza";
import CuponesRobo from "./CuponesRobo";
import CuotasList from "./CuotasList";

export default function PolizaCard({
  poliza,
  cliente,
  index,
  enviando,
  reciboBusy,
  onReportarPago,
  onVerDoc,
  onRecibo,
}) {
  const est = ESTADO_POLIZA[String(poliza.estado).toLowerCase()] || ESTADO_POLIZA.activa;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24, delay: staggerDelay(index) }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      {/* Tarjeta principal: hero + patente + "Al renovar" */}
      <div className={`${CARD} overflow-hidden`}>
        {/* Hero de la póliza: fondo degradé verde marca, look "tarjeta" */}
        <div className="flex items-center gap-3.5 bg-gradient-to-br from-brand-primary to-brand-primary-deep p-4.5">
          <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-2xl bg-white/[0.18]">
            <FaCar className="text-xl text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-heading text-[16px] font-bold text-white">{poliza.marca} {poliza.modelo}</span>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-wide ${est.pillCls}`}>
                ● {est.label}
              </span>
            </div>
            {poliza.numero_poliza ? (
              <p className="mt-1.5 text-[10.5px] font-bold text-brand-secondary-soft">{poliza.numero_poliza}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4.5 pb-1 pt-3.5">
          {poliza.patente ? (
            <span className="rounded-md border border-black/[0.1] bg-brand-200 px-2 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-brand-100 dark:border-white/10 dark:bg-white/5 dark:text-brand-200">
              {poliza.patente}
            </span>
          ) : null}
          <span className="text-xs font-semibold text-brand-100/50 dark:text-brand-200/55">
            {poliza.compania} · Cobertura {poliza.cobertura}
          </span>
        </div>

        <RenovacionBanner poliza={poliza} />
        <div className="pb-1" />
      </div>

      {/* Papeles */}
      <DocumentosPoliza poliza={poliza} cliente={cliente} onVerDoc={onVerDoc} />

      {/* Cuponeras de robo */}
      <CuponesRobo poliza={poliza} enviando={enviando} onReportarPago={onReportarPago} />

      {/* Cuotas */}
      <CuotasList poliza={poliza} cliente={cliente} reciboBusy={reciboBusy} onRecibo={onRecibo} />
    </motion.div>
  );
}
