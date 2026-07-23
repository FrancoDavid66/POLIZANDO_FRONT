// src/components/portal/DocumentoModal.jsx
//
// Modal a pantalla completa (mobile) que previsualiza un documento (PDF) de
// la póliza mediante el visor embebido de Google Docs.

import { motion, AnimatePresence } from "framer-motion";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";

export default function DocumentoModal({ doc, onCerrar }) {
  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          key="verdoc"
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
            className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col sm:my-8 sm:max-h-[85vh] sm:flex-none sm:overflow-hidden sm:rounded-[24px]"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-brand-100 px-4 py-3.5">
              <span className="truncate text-sm font-bold text-brand-200">{doc?.nombre}</span>
              <div className="flex items-center gap-2">
                <motion.a
                  whileTap={{ scale: 0.95 }}
                  href={doc?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-brand-200 transition hover:bg-white/10"
                >
                  <HiArrowTopRightOnSquare className="h-4 w-4" /> Abrir
                </motion.a>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onCerrar}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-deep px-3 py-2 text-xs font-bold text-white shadow-sm shadow-brand-primary/30 transition hover:brightness-105"
                >
                  Cerrar
                </motion.button>
              </div>
            </div>
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(doc?.url || "")}&embedded=true`}
              title="Documento"
              className="w-full flex-1 bg-white"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
