// src/components/pagos/CuotaRow.jsx
//
// Extraído de PagosList.jsx: era un componente memoizado autocontenido de
// ~230 líneas (toda la fila de una cuota: header, período de cobertura,
// botón de cobro/comprobante, detalle expandible), ya diseñado con props
// limpias — no toca Redux ni estado del padre. Mismo comportamiento exacto,
// solo cambia en qué archivo vive.
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCalendar, HiCheck, HiExclamation, HiCash,
  HiChevronUp, HiChevronDown, HiQuestionMarkCircle, HiExclamationCircle, HiPencil,
} from "react-icons/hi";

import { fmtFecha } from "../../utils/cuotas";
import { PALETTE, TONO_STYLES } from "./pagosListStyles";
import FacturaAcciones from "./FacturaAcciones";

const CuotaRow = memo(
  function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs, abrirModalFecha }) {
    const [expanded, setExpanded] = useState(false);
    const {
      cuota, cuotaPdf, nombreCompleto, patente, modelo, observacion,
      hasObs, isObsOpen, state, label, dias, polizaEstado,
      montoTxt, sinCobertura, pagoAtrasado, altaTxt, isWebAdmin,
      cuotaTextoFull,
      // 🎯 Opción A amigable
      fraseEstado, fraseCobertura, esCuotaFutura,
    } = model || {};
    const S = PALETTE[state || "pending"];

    const isPolicyVencida = polizaEstado === "VENCIDA";
    const isPolicyCancelada = polizaEstado === "CANCELADA" || polizaEstado === "ANULADA";

    let extraClasses = "";
    if (isPolicyCancelada && !cuota.pagado) extraClasses = "opacity-60";
    else if (isPolicyVencida && !cuota.pagado) extraClasses = "border-red-900/40";

    // Botón de acción con texto simple
    const textoBtnPagar = isPolicyVencida ? "Cobrar y reactivar el seguro" : "Cobrar esta cuota";

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-1 ${S.stripe}`} aria-hidden />
        <div className={`mx-0 sm:mx-2 my-0 sm:my-1 sm:rounded-lg border p-3 sm:p-4 ${S.cardBg} ${S.border} ${extraClasses} relative`}>
          <div className="pl-2 sm:pl-2.5 flex flex-col gap-3">

            {/* ═══ HEADER: cliente + monto + estado ═══ */}
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`truncate max-w-[200px] sm:max-w-md font-semibold text-sm ${state === "overdue" ? "text-red-300" : "text-white"}`}>
                    {nombreCompleto}
                  </span>
                  {isPolicyCancelada && !cuota.pagado && (
                    <span className="text-[10px] font-mono text-red-400 border border-red-800/50 rounded px-1.5 py-0.5">BAJA</span>
                  )}
                  {isPolicyVencida && !cuota.pagado && (
                    <span className="text-[10px] font-mono text-brand-secondary-tint border border-brand-secondary/40 rounded px-1.5 py-0.5">REACTIVAR</span>
                  )}
                </div>
                <div className="text-[11px] text-brand-200/40 mt-0.5 flex items-center gap-1.5 font-mono">
                  <span>{cuotaTextoFull}</span>
                  {patente && <><span>·</span><span>{patente}</span></>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-lg sm:text-xl font-mono font-bold ${isPolicyVencida && !cuota.pagado ? "text-brand-secondary-tint" : S.amountText}`}>
                  $ {montoTxt}
                </div>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${S.chipBg} ${S.chipText} border ${S.chipBorder}`}>
                  {label}
                </span>
              </div>
            </div>

            {/* ═══ Fecha de alta de la póliza — centrada y destacada ═══ */}
            {altaTxt && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 px-4 py-2">
                  <HiCalendar className="text-brand-secondary-tint text-base shrink-0" />
                  <span className="text-[11px] uppercase tracking-wide text-brand-secondary-tint/80">Póliza dada de alta el</span>
                  <span className="text-base font-bold text-white">{altaTxt}</span>
                </div>
              </div>
            )}

            {/* ═══ Fecha de pago → período de cobertura → Vence (mismo formato que Cuotas) ═══ */}
            {(() => {
              const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
              const pagada = !!cuota?.pagado;

              // Verde = pagada · Naranja = vence hoy · Rojo = vencida impaga · Gris = pendiente sin vencer
              const vtoStyles = pagada
                ? TONO_STYLES.success
                : state === "overdue"
                ? TONO_STYLES.danger
                : dias === 0
                ? TONO_STYLES.warning
                : TONO_STYLES.neutral;

              const pagoStyles = pagada ? TONO_STYLES.success : TONO_STYLES.neutral;

              // Renglón sutil debajo de la fecha de vencimiento
              let vtoSubtitulo = null;
              let vtoSubAlerta = false;
              if (pagada) {
                vtoSubtitulo = "Cubierta";
              } else if (state === "overdue") {
                const d = dias != null ? Math.abs(dias) : null;
                vtoSubtitulo = d != null ? `Venció hace ${d} día${d === 1 ? "" : "s"}` : "Vencida";
                vtoSubAlerta = true;
              } else if (dias === 0) {
                vtoSubtitulo = "Vence hoy";
              } else if (dias != null && dias > 0) {
                vtoSubtitulo = dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
              }

              return (
                <div className="flex items-stretch gap-2">
                  {/* Box: Fecha de pago */}
                  <div className={`flex-1 rounded-lg border ${pagoStyles.bg} ${pagoStyles.border} p-2.5`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <HiCheck className={`${pagoStyles.iconColor} text-sm`} />
                      <div className={`text-[10px] uppercase tracking-wide font-bold ${pagoStyles.subtitle}`}>
                        Fecha de pago
                      </div>
                    </div>
                    <div className={`text-base font-bold ${pagoStyles.title}`}>
                      {pagada && fechaPago ? fmtFecha(fechaPago) : "Sin pagar"}
                    </div>
                  </div>

                  {/* Flecha central: período de cobertura */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-1">
                    <div className="text-[9px] uppercase tracking-wide font-bold text-neutral-400 text-center leading-tight mb-0.5">
                      Período de<br />cobertura
                    </div>
                    <div className="text-2xl text-neutral-500 leading-none">→</div>
                  </div>

                  {/* Box: Fin de cobertura / Vence */}
                  <div className={`flex-1 rounded-lg border ${vtoStyles.bg} ${vtoStyles.border} p-2.5`}>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <HiCalendar className={`${vtoStyles.iconColor} text-sm`} />
                        <div className={`text-[10px] uppercase tracking-wide font-bold ${vtoStyles.subtitle}`}>
                          Fin de cobertura / Vence
                        </div>
                      </div>
                      {!cuota?.pagado && (
                        <button
                          type="button"
                          onClick={() => abrirModalFecha(cuota)}
                          className="text-brand-200/40 hover:text-brand-200/75 transition-colors shrink-0"
                          title="Cambiar fecha de vencimiento"
                        >
                          <HiPencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className={`text-base font-bold ${vtoStyles.title}`}>
                      {fmtFecha(cuota?.fecha_vencimiento)}
                    </div>
                    {vtoSubtitulo && (
                      <div className={`text-[11px] ${vtoStyles.subtitle} mt-0.5 flex items-center gap-1`}>
                        {vtoSubAlerta && <HiExclamation className="text-xs shrink-0" />}
                        {vtoSubtitulo}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══ ACCIÓN PRINCIPAL ═══ */}
            <div className="flex items-center gap-2 w-full">
              {!cuota?.pagado ? (
                <button
                  onClick={() => abrirPagar(cuota)}
                  className={`w-full h-11 px-4 rounded-lg border transition-colors inline-flex items-center justify-center gap-2 font-semibold text-sm ${
                    isPolicyVencida
                      ? "bg-brand-secondary hover:bg-brand-secondary-light text-white border-brand-secondary shadow-sm shadow-brand-secondary/20"
                      : "bg-brand-primary hover:bg-brand-primary-deep text-white border-brand-primary shadow-sm shadow-brand-primary/20"
                  }`}
                >
                  <HiCash className="w-4 h-4" />
                  {textoBtnPagar}
                </button>
              ) : (
                <div className="flex gap-1.5 w-full">
                  <FacturaAcciones cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} className="flex-1" />
                </div>
              )}
            </div>

            {/* Expandible */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] text-brand-200/30 hover:text-brand-200/50 transition-colors"
            >
              {expanded ? <><HiChevronUp className="w-3.5 h-3.5" /> Ocultar</> : <><HiChevronDown className="w-3.5 h-3.5" /> Ver detalles</>}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-3 border-t border-brand-200/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {modelo && <div className="flex justify-between px-2 py-1.5 rounded bg-brand-200/8"><span className="text-brand-200/40">Vehículo</span><span className="text-brand-200/75 font-mono">{modelo}</span></div>}
                    {altaTxt && <div className="flex justify-between px-2 py-1.5 rounded bg-brand-200/8"><span className="text-brand-200/40">Alta póliza</span><span className="text-brand-200/75 font-mono">{altaTxt}</span></div>}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => abrirDetalle(cuota)} className="h-8 px-3 rounded-lg border border-brand-200/15 bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/75 text-xs transition-colors inline-flex items-center gap-1.5">
                      <HiQuestionMarkCircle className="w-3.5 h-3.5" /> Info completa
                    </button>
                    {hasObs && (
                      <button onClick={() => onToggleObs(cuota?.id)} className="h-8 px-3 rounded-lg border border-brand-200/15 bg-brand-200/10 hover:bg-brand-200/15 text-brand-200/75 text-xs transition-colors inline-flex items-center gap-1.5">
                        <HiExclamationCircle className="w-3.5 h-3.5" /> Nota
                      </button>
                    )}
                  </div>
                  {hasObs && isObsOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-lg border border-brand-200/15 bg-brand-200/10 px-3 py-2.5 text-xs text-brand-200/75">
                      <div className="flex items-start gap-2">
                        <HiExclamationCircle className="w-4 h-4 mt-0.5 shrink-0 text-brand-secondary-tint" />
                        <span className="whitespace-pre-wrap">{observacion}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </>
    );
  },
  (prev, next) => {
    const a = prev?.model, b = next?.model;
    if (a === b) return true;
    if (a?.isObsOpen !== b?.isObsOpen) return false;
    const ca = a?.cuota, cb = b?.cuota;
    if (ca?.id !== cb?.id || ca?.pagado !== cb?.pagado || ca?.monto !== cb?.monto || ca?.fecha_vencimiento !== cb?.fecha_vencimiento || ca?.fecha_pago !== cb?.fecha_pago || ca?.observaciones_pago !== cb?.observaciones_pago || ca?.ultima_observacion_pago !== cb?.ultima_observacion_pago || a?.nombreCompleto !== b?.nombreCompleto || a?.patente !== b?.patente || a?.modelo !== b?.modelo) return false;
    return true;
  }
);

export default CuotaRow;