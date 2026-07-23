// src/components/portal/ReciboModal.jsx
//
// Modal a pantalla completa (mobile) que muestra el recibo de una cuota
// pagada, con botón de descarga a PDF (generado on-demand con react-pdf).

import { motion, AnimatePresence } from "framer-motion";
import { HiArrowDownTray } from "react-icons/hi2";
import FacturaCuota from "../pagos/FacturaCuota";

export default function ReciboModal({ recibo, descargando, onDescargar, onCerrar }) {
  return (
    <AnimatePresence>
      {recibo && (
        <motion.div
          key="recibo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
          style={{ perspective: 1400 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.9, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 50, scale: 0.94, rotateX: 8 }}
            transition={{ type: "spring", stiffness: 230, damping: 22, mass: 0.9 }}
            style={{ transformOrigin: "bottom center" }}
            className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col sm:my-8 sm:max-h-[85vh] sm:flex-none sm:overflow-hidden sm:rounded-[24px]"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-brand-100 px-4 py-3.5">
              <span className="text-sm font-bold text-brand-200">Recibo</span>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onDescargar}
                  disabled={descargando}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-brand-200 transition hover:bg-white/10 disabled:opacity-50"
                >
                  <HiArrowDownTray className="h-4 w-4" /> {descargando ? "..." : "Descargar"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onCerrar}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-deep px-3 py-2 text-xs font-bold text-white shadow-sm shadow-brand-primary/30 transition hover:brightness-105"
                >
                  Cerrar
                </motion.button>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.3 }}
              className="flex-1 overflow-auto bg-slate-200 p-3"
            >
              {recibo ? (
                <FacturaCuota cliente={recibo.cli} poliza={recibo.pol} cuota={recibo.cuota} ocultarNumeroPoliza />
              ) : null}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
