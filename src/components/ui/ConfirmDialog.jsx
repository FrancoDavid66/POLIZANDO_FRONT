// src/components/ui/ConfirmDialog.jsx
//
// Fusiona components/comunes/ConfirmModal.jsx y components/polizas/ConfirmModal.jsx
// — mismo propósito exacto (confirmar una acción destructiva), dos implementaciones
// distintas. Este sirve para los dos casos:
//   - Pasále `message` directo: <ConfirmDialog message="¿Seguro?" .../>
//   - O pasále `nombre` y arma el mensaje solo: <ConfirmDialog nombre="Juan Pérez" .../>

import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineExclamation, HiX } from "react-icons/hi";

const modalVariants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  message,
  nombre,
  title = "Confirmar acción",
  confirmLabel = "Eliminar",
  loading = false,
  confirmDisabled = false,
}) {
  if (!isOpen) return null;

  const cuerpo =
    message ||
    (nombre
      ? <>¿Confirmás la eliminación de <span className="font-bold text-brand-100 dark:text-brand-200">"{nombre}"</span>?</>
      : "¿Estás seguro de que deseas realizar esta acción?");

  const disabled = loading || confirmDisabled;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-md bg-brand-card dark:bg-brand-card-dark border border-brand-100/10 dark:border-brand-200/10 rounded-3xl shadow-2xl overflow-hidden"
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-100/10 dark:border-brand-200/10 bg-brand-100/[0.02] dark:bg-brand-200/[0.02]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                <HiOutlineExclamation className="text-xl" />
              </div>
              <h3 className="text-sm font-black text-brand-100 dark:text-brand-200 uppercase tracking-widest">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={disabled}
              className="cursor-pointer group p-2 rounded-full text-brand-100/40 dark:text-brand-200/40 hover:text-brand-100 dark:hover:text-brand-200 hover:bg-brand-100/8 dark:hover:bg-brand-200/8 transition-colors disabled:opacity-50"
            >
              <HiX className="text-lg group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm font-medium text-brand-100/80 dark:text-brand-200/80 leading-relaxed text-center">
              {cuerpo}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brand-100/10 dark:border-brand-200/10">
            <button
              onClick={onClose}
              disabled={disabled}
              className="cursor-pointer h-10 px-5 text-xs font-black uppercase text-brand-100/50 dark:text-brand-200/50 hover:text-brand-100 dark:hover:text-brand-200 hover:bg-brand-100/5 dark:hover:bg-brand-200/5 rounded-xl transition-all tracking-widest disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={disabled}
              className="cursor-pointer h-10 px-6 bg-red-600 text-white text-xs font-black uppercase rounded-xl hover:bg-red-500 transition-all tracking-widest shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Procesando..." : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}