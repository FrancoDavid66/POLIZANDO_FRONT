import { AnimatePresence, motion } from "framer-motion";
import { HiX, HiCog, HiClipboardList } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export default function ConfigModal({ open, onClose }) {
  const navigate = useNavigate();

  const go = (to) => {
    navigate(to);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* overlay */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="
              fixed z-[81] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[92vw] max-w-xl rounded-2xl border border-brand-100/10 dark:border-brand-200/10
              bg-brand-card dark:bg-brand-card-dark text-brand-100 dark:text-brand-200 shadow-2xl
            "
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-100/10 dark:border-brand-200/10">
              <div className="flex items-center gap-2 font-semibold">
                <HiCog className="opacity-80" />
                Configuración
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-brand-100/8 dark:bg-brand-200/10 border border-brand-100/10 dark:border-brand-200/10 hover:bg-brand-100/15 dark:hover:bg-brand-200/15 text-sm"
              >
                <HiX /> Cerrar
              </button>
            </div>

            {/* contenido */}
            <div className="p-4 space-y-4">
              {/* Acción: Compañías & Renovaciones */}
              <button
                onClick={() => go("/ajustes/companias")}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-brand-100/5 dark:bg-brand-200/5 hover:bg-brand-100/10 dark:hover:bg-brand-200/10 border border-brand-100/10 dark:border-brand-200/10 text-left transition"
                title="Gestionar compañías y sus planes de cuotas / meses de renovación"
              >
                <span className="inline-grid place-items-center w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary dark:text-brand-primary-tint">
                  <HiClipboardList />
                </span>
                <div className="min-w-0">
                  <div className="font-medium">Compañías &amp; Renovaciones</div>
                  <div className="text-xs text-brand-100/60 dark:text-brand-200/60 truncate">
                    Alta, edición y planes de cuotas (meses de renovación)
                  </div>
                </div>
              </button>

              {/* Preferencias rápidas */}
              <div className="rounded-xl border border-brand-100/10 dark:border-brand-200/10 p-3 bg-brand-100/[0.04] dark:bg-brand-200/[0.04]">
                <div className="text-sm text-brand-100/60 dark:text-brand-200/60 mb-2">Preferencias</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-brand-100 dark:text-brand-200">Tema</span>
                  <ThemeToggle small />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}